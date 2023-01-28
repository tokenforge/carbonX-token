// SPDX-License-Identifier: MIT
// (C) by TokenForge GmbH, Berlin
// Author: Hagen Hübel, hagen@token-forge.io
/**
 * @dev Learn more about this on https://token-forge.io
 

 _______    _              ______                   
|__   __|  | |            |  ____|                  
   | | ___ | | _____ _ __ | |__ ___  _ __ __ _  ___ 
   | |/ _ \| |/ / _ \ '_ \|  __/ _ \| '__/ _` |/ _ \
   | | (_) |   <  __/ | | | | | (_) | | | (_| |  __/
   |_|\___/|_|\_\___|_| |_|_|  \___/|_|  \__, |\___|
                                          __/ |     
                                         |___/      

 */
 
pragma solidity 0.8.6;

import "../CarbonX.sol";
import "../CarbonVault.sol";

contract CarbonXMockReentrancyAttack is CarbonX {
    address _carbonVault;
    uint256 _counter;

    uint256 _batchOrNot = 0;

    constructor(address signer_, string memory baseUri_, address carbonVault_) CarbonX("Mock", signer_, baseUri_) {
        _carbonVault = carbonVault_;
    }

    function isTransferIntoVaultAccepted(
        address,
        address,
        uint256[] memory,
        uint256[] memory,
        bytes memory
    ) public view virtual override returns (bool) {
        return true;
    }

    function setBatchOrNot(uint256 value) external {
        _batchOrNot = value;
    }

    function onTransferIntoVaultSuccessfullyDone(
        address operator,
        address from,
        uint256[] memory tokenIds,
        uint256[] memory amounts,
        bytes memory data
    ) public virtual override returns (bytes4) {
        ++_counter;

        // What we do is like:
        if (_batchOrNot == 0) {
            CarbonVault(_carbonVault).onERC1155Received(operator, from, tokenIds[0], amounts[0], data);
        } else {
            CarbonVault(_carbonVault).onERC1155BatchReceived(operator, from, tokenIds, amounts, data);
        }

        // the anonymous function call would be like this, but test coverage is not counting then the reentrancy-modifier
        /* (bool success, ) = address(_carbonVault).call(
            abi.encodeWithSignature("onERC1155Received(address, address, uint256, uint256, bytes memory)", operator, from, tokenIds[0], amounts[0], data));
        require(success, "ReentrancyMock: failed call"); */

        return this.onTransferIntoVaultSuccessfullyDone.selector;
    }

    function counter() public view returns (uint256) {
        return _counter;
    }
}
