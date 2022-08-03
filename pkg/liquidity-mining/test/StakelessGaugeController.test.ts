import { ethers } from 'hardhat';
import { Contract } from 'ethers';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/dist/src/signer-with-address';

import * as expectEvent from '@balancer-labs/v2-helpers/src/test/expectEvent';
import { deploy, deployedAt } from '@balancer-labs/v2-helpers/src/contract';
import Vault from '@balancer-labs/v2-helpers/src/models/vault/Vault';
import { actionId } from '@balancer-labs/v2-helpers/src/models/misc/actions';
import { expect } from 'chai';
import { ZERO_ADDRESS } from '@balancer-labs/v2-helpers/src/constants';
import { anyAddressArray } from '@balancer-labs/v2-helpers/src/address';

import { GaugeType } from './GaugeAdder.test';

describe('StakelessGaugeController', () => {
  let vault: Vault;
  let adaptor: Contract;
  let gaugeController: Contract;
  let gaugeAdder: Contract;
  let stakelessGaugeController: Contract;

  const gauges = new Map<number, string[]>();
  let admin: SignerWithAddress;

  let testGaugeType: GaugeType;
  let testGauges: string[];

  const GAUGES_PER_TYPE = 3;
  const FIRST_VALID_GAUGE = GaugeType.Polygon;

  // Allowed gauges: Polygon, Arbitrum, Optimism, Gnosis, ZKSync.
  const GAUGE_TYPES = Object.values(GaugeType)
    .filter((v) => !isNaN(Number(v)) && v >= FIRST_VALID_GAUGE)
    .map((t) => Number(t));

  const UNSUPPORTED_GAUGE_TYPES = Object.values(GaugeType)
    .filter((v) => !isNaN(Number(v)) && v < FIRST_VALID_GAUGE)
    .map((t) => Number(t));

  before('setup signers', async () => {
    [, admin] = await ethers.getSigners();
  });

  before('deploy dependencies: gauge controller and gauge factories', async () => {
    // Basics: vault, authorizer adaptor and gauge controller.
    vault = await Vault.create({ admin });
    adaptor = await deploy('AuthorizerAdaptor', { args: [vault.address] });
    gaugeController = await deploy('MockGaugeController', { args: [ZERO_ADDRESS, adaptor.address] });
    // Allow all gauge types in the controller.
    await gaugeController.add_type('0x', Math.max(...GAUGE_TYPES) + 1);

    // Gauge factories creation: one per gauge type.
    const gaugeFactories = await Promise.all(
      GAUGE_TYPES.map(async (gaugeType) => {
        return { type: gaugeType, contract: await deploy('MockLiquidityGaugeFactory') };
      })
    );

    // Gauge adder & add factories to gauge adder.
    gaugeAdder = await deploy('GaugeAdder', { args: [gaugeController.address, ZERO_ADDRESS] });
    const action = await actionId(gaugeAdder, 'addGaugeFactory');
    await vault.grantPermissionsGlobally([action], admin);

    await Promise.all(
      gaugeFactories.map((factory) => gaugeAdder.connect(admin).addGaugeFactory(factory.contract.address, factory.type))
    );

    // Create some gauges from each factory.
    await Promise.all(
      gaugeFactories.map(async (factory) =>
        gauges.set(factory.type, await createGauges(factory.contract, factory.type, GAUGES_PER_TYPE))
      )
    );
  });

  before('get test gauges', () => {
    testGaugeType = GaugeType.Polygon;
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    testGauges = gauges.get(testGaugeType)!;
  });

  sharedBeforeEach('deploy stakeless gauge controller', async () => {
    stakelessGaugeController = await deploy('StakelessGaugeController', {
      args: [adaptor.address, gaugeController.address, gaugeAdder.address],
    });
  });

  describe('add gauges', () => {
    context('with invalid gauge type', () => {
      it('reverts', async () => {
        for (const gaugeType of UNSUPPORTED_GAUGE_TYPES) {
          await expect(stakelessGaugeController.addGauges(gaugeType, testGauges)).to.be.revertedWith(
            'Unsupported gauge type'
          );
        }
      });
    });

    context('with incorrect factory and controller setup', () => {
      it('reverts', async () => {
        const otherGaugeType = GaugeType.Optimism;
        await expect(stakelessGaugeController.addGauges(otherGaugeType, testGauges)).to.be.revertedWith(
          'Gauge does not come from valid factory'
        );
      });
    });

    context('with correct factory and wrong controller setup', () => {
      it('reverts', async () => {
        await expect(stakelessGaugeController.addGauges(testGaugeType, testGauges)).to.be.revertedWith(
          'Gauge does not exist in controller'
        );
      });
    });

    context('with correct factory and controller setup', () => {
      sharedBeforeEach('add gauges to regular controller', async () => {
        await addGaugesToController(gaugeController, testGauges);
      });

      it('adds stakeless gauges correctly using only the correct gauge type', async () => {
        const tx = await stakelessGaugeController.addGauges(testGaugeType, testGauges);
        expectEvent.inReceipt(await tx.wait(), 'GaugesAdded', { gaugeType: testGaugeType, gauges: testGauges });
        await expectGaugesAdded(testGaugeType, testGauges);
        // Check that all remaining types are empty.
        await Promise.all(
          GAUGE_TYPES.filter((gaugeType) => gaugeType != testGaugeType).map((gaugeType) =>
            expectGaugesAdded(gaugeType, [])
          )
        );
      });

      context('when one of the gauges to add was killed', () => {
        sharedBeforeEach('kill one gauge', async () => {
          const gaugeContract = await deployedAt('MockLiquidityGauge', testGauges[0]);
          await gaugeContract.killGauge();
        });

        it('reverts', async () => {
          await expect(stakelessGaugeController.addGauges(testGaugeType, testGauges)).to.be.revertedWith(
            'Gauge was killed'
          );
        });
      });

      context('when one of the gauges to add is already present', () => {
        sharedBeforeEach('add gauges beforehand', async () => {
          await stakelessGaugeController.addGauges(testGaugeType, testGauges);
        });

        it('reverts', async () => {
          await expect(stakelessGaugeController.addGauges(testGaugeType, testGauges)).to.be.revertedWith(
            'Gauge already present'
          );
        });
      });
    });
  });

  describe('remove gauges', () => {
    sharedBeforeEach('add gauges to regular and stakeless gauge controllers', async () => {
      await addGaugesToController(gaugeController, testGauges);
      await stakelessGaugeController.addGauges(testGaugeType, testGauges);
    });

    context('with stakeless gauges that were not killed', () => {
      it('reverts', async () => {
        await expect(stakelessGaugeController.removeGauges(testGaugeType, testGauges)).to.be.revertedWith(
          'Gauge was not killed'
        );
      });
    });

    context('killing stakeless gauges before removing them', () => {
      sharedBeforeEach('kill stakeless gauges', async () => {
        const gaugeContracts = await Promise.all(testGauges.map((gauge) => deployedAt('MockLiquidityGauge', gauge)));
        await Promise.all(gaugeContracts.map((gaugeContract) => gaugeContract.killGauge()));
      });

      it('removes added stakeless gauges correctly ', async () => {
        expect(await stakelessGaugeController.getTotalGauges(testGaugeType)).to.be.eq(GAUGES_PER_TYPE);
        const tx = await stakelessGaugeController.removeGauges(testGaugeType, testGauges);
        expectEvent.inReceipt(await tx.wait(), 'GaugesRemoved', { gaugeType: testGaugeType, gauges: testGauges });
        expect(await stakelessGaugeController.getTotalGauges(testGaugeType)).to.be.eq(0);
      });

      it('reverts if gauges were not present', async () => {
        const otherGaugeType = GaugeType.Optimism;
        await expect(stakelessGaugeController.removeGauges(otherGaugeType, testGauges)).to.be.revertedWith(
          'Gauge not present'
        );
      });
    });
  });

  async function expectGaugesAdded(gaugeType: GaugeType, gauges: string[]) {
    expect(await stakelessGaugeController.getTotalGauges(gaugeType)).to.be.eq(gauges.length);
    for (let i = 0; i < gauges.length; i++) {
      expect(await stakelessGaugeController.getGaugeAt(gaugeType, i)).to.be.eq(gauges[i]);
    }
  }

  async function addGaugesToController(controller: Contract, gauges: string[]): Promise<void> {
    await Promise.all(gauges.map((gauge) => controller.add_gauge(gauge, 0)));
  }

  /**
   * Creates an array of gauges from the given factory, using pseudo random addresses as input pool addresses.
   * @param factory Gauge factory to create gauges.
   * @param seed Number to start generating the pseudo random addresses. Use different inputs to get different outputs.
   * @param amount Number of gauges to create.
   * @returns A promise with the array of addresses corresponding to the created gauges.
   */
  async function createGauges(factory: Contract, seed: number, amount: number): Promise<string[]> {
    const txArray = await Promise.all(anyAddressArray(seed, amount).map((address) => factory.create(address)));
    const receipts = await Promise.all(txArray.map((tx) => tx.wait()));
    return receipts.map((receipt) => expectEvent.inReceipt(receipt, 'GaugeCreated').args.gauge);
  }
});