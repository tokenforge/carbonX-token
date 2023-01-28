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

import "@openzeppelin/contracts/token/ERC1155/utils/ERC1155Receiver.sol";

import "../CarbonReceipt55.sol";

contract ReMinterAttacker is ERC1155Receiver {
    address _receiptToken;

    uint256 _batchOrNot = 0;

    constructor(address receiptToken_) {
        _receiptToken = receiptToken_;
    }

    function setBatchOrNot(uint256 value) external {
        _batchOrNot = value;
    }

    function onERC1155Received(
        address /*operator*/,
        address from,
        uint256 tokenId,
        uint256 amount,
        bytes memory data
    ) public virtual override returns (bytes4) {
        if (_batchOrNot == 0) {
            CarbonReceipt55(_receiptToken).mintReceipt(from, tokenId, amount, 1, "", data);
        } else {
            uint256[] memory tokenIds = _asSingletonArray(tokenId);
            string[] memory tokenUris = new string[](1);
            uint256[] memory amounts = _asSingletonArray(amount);

            CarbonReceipt55(_receiptToken).batchMintReceipt(from, tokenIds, amounts, tokenIds, tokenUris, data);
        }

        return this.onERC1155Received.selector;
    }

    function onERC1155BatchReceived(
        address /* operator */,
        address from,
        uint256[] memory tokenIds,
        uint256[] memory amounts,
        bytes memory data
    ) public virtual override returns (bytes4) {
        string[] memory tokenUris = new string[](tokenIds.length);
        CarbonReceipt55(_receiptToken).batchMintReceipt(from, tokenIds, amounts, tokenIds, tokenUris, data);
        return this.onERC1155BatchReceived.selector;
    }

    function _asSingletonArray(uint256 element) private pure returns (uint256[] memory) {
        uint256[] memory array = new uint256[](1);
        array[0] = element;

        return array;
    }
}
