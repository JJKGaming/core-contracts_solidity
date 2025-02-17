# <img src="logo.png" alt="JK Gaming" height="128px">

# JK Gaming 

This repository contains the Symmetric V2 core smart contract set written in Solidity along with the JK Gaming templates. JK Gaming brings together liquidity providers and gaming groups to offer the best gaming services with the biggest jackpots to players. This project is an experimental look at adding the JK Gaming system to the Solidity AMM and DEX project.


## Structure

This is a Yarn 2 monorepo, with the packages meant to be published in the [`pkg`](./pkg) directory. Newly developed packages may not be published yet.

Active development occurs in this repository, which means some contracts in it might not be production-ready. Proceed with caution.

### Packages

- [`v2-deployments`](./pkg/deployments): addresses and ABIs of all Symmetric ad JJK Gaming contracts, for mainnet and various test networks.
- [`v2-interfaces`](./pkg/interfaces): Solidity interfaces for all contracts.
- [`v2-vault`](./pkg/vault): the [`Vault`](./pkg/vault/contracts/Vault.sol) contract and all core interfaces, including [`IVault`](./pkg/vault/contracts/interfaces/IVault.sol) and the Pool interfaces: [`IBasePool`](./pkg/vault/contracts/interfaces/IBasePool.sol), [`IGeneralPool`](./pkg/vault/contracts/interfaces/IGeneralPool.sol) and [`IMinimalSwapInfoPool`](./pkg/vault/contracts/interfaces/IMinimalSwapInfoPool.sol).
- [`BaseGamingPool`](./pkg/pool-gaming): the [`GamingPool`](./pkg/pool-gaming/contracts/BaseGamingPool.sol),
- [`v2-pool-lottery`](./pkg/pool-gaming): the [`GamingPool`](./pkg/pool-gaming/contracts/LotteryPool.sol),
- [`v2-pool-dice`](./pkg/pool-gaming): the [`GamingPool`](./pkg/pool-gaming/contracts/DicePool.sol),
- [`v2-pool-eSport`](./pkg/pool-gaming): the [`GamingPool`](./pkg/pool-gaming/contracts/eSportPool.sol), 
- [`v2-pool-weighted`](./pkg/pool-weighted): the [`WeightedPool`](./pkg/pool-weighted/contracts/WeightedPool.sol), [`WeightedPool2Tokens`](./pkg/pool-weighted/contracts/WeightedPool2Tokens.sol) and [`LiquidityBootstrappingPool`](./pkg/pool-weighted/contracts/smart/LiquidityBootstrappingPool.sol) contracts, along with their associated factories.
- [`v2-pool-linear`](./pkg/pool-linear): the [`AaveLinearPool`](./pkg/pool-linear/contracts/aave/AaveLinearPool.sol) and [`ERC4626LinearPool`](./pkg/pool-linear/contracts/erc4626/ERC4626LinearPool.sol) contracts, along with their associated factories.
- [`v2-pool-utils`](./pkg/pool-utils): Solidity utilities used to develop Pool contracts.
- [`v2-solidity-utils`](./pkg/solidity-utils): miscellaneous Solidity helpers and utilities used in many different contracts.
- [`v2-standalone-utils`](./pkg/standalone-utils): miscellaneous standalone utility contracts.
- [`v2-liquidity-mining`](./pkg/liquidity-mining): contracts that compose the liquidity mining (veBAL) system.
- [`v2-governance-scripts`](./pkg/governance-scripts): contracts that execute complex governance actions.

## Build and Test

Before any tests can be run, the repository needs to be prepared:

```bash
$ yarn # install all dependencies
$ yarn build # compile all contracts
```

Most tests are standalone and simply require installation of dependencies and compilation. Some packages however have extra requirements. Notably, the [`v2-deployments`](./pkg/deployments) package must have access to mainnet archive nodes in order to perform fork tests. For more details, head to [its readme file](./pkg/deployments/README.md).

In order to run all tests (including those with extra dependencies), run:

```bash
$ yarn test # run all tests
```

To instead run a single package's tests, run:

```bash
$ cd pkg/<package> # e.g. cd pkg/v2-vault
$ yarn test
```

You can see a sample report of a test run [here](./audits/test-report.md).

## Security

Multiple independent reviews and audits were performed by [Certora](https://www.certora.com/), [OpenZeppelin](https://openzeppelin.com/) and [Trail of Bits](https://www.trailofbits.com/). The latest reports from these engagements are located in the [`audits`](./audits) directory.

> Upgradeability | Not Applicable. The system cannot be upgraded.

## Licensing

Most of the Solidity source code is licensed under the GNU General Public License Version 3 (GPL v3): see [`LICENSE`](./LICENSE).

### Exceptions

- All files in the `openzeppelin` directory of the [`v2-solidity-utils`](./pkg/solidity-utils) package are based on the [OpenZeppelin Contracts](https://github.com/OpenZeppelin/openzeppelin-contracts) library, and as such are licensed under the MIT License: see [LICENSE](./pkg/solidity-utils/contracts/openzeppelin/LICENSE).
- The `LogExpMath` contract from the [`v2-solidity-utils`](./pkg/solidity-utils) package is licensed under the MIT License.
- All other files, including tests and the [`pvt`](./pvt) directory are unlicensed.
