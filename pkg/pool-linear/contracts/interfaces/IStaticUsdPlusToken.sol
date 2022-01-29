// SPDX-License-Identifier: GPL-3.0-or-later
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.

// You should have received a copy of the GNU General Public License
// along with this program.  If not, see <http://www.gnu.org/licenses/>.

pragma solidity ^0.7.0;


interface IStaticUsdPlusToken {

    /**
     * @dev Returns UsdPlusToken liquidity index in e27 (ray)
     * @return rate Rate between StaticUsdPlusToken and UsdPlusToken in e27 (ray)
     **/
    function rate() external view returns (uint256);

    /**
     * @dev Returns UsdPlusToken address
     * @return address The address of UsdPlusToken
     **/
    function mainToken() external view returns (address);

}