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

interface ICarbonReceipt {
    function mintReceipt(
        address to,
        uint256 tokenId,
        uint256 amount,
        uint256 originalTokenId,
        string memory tokenUri,
        bytes memory data
    ) external;

    function batchMintReceipt(
        address to,
        uint256[] memory tokenIds,
        uint256[] memory amounts,
        uint256[] memory originalTokenIds,
        string[] memory tokenUris,
        bytes memory data
    ) external;
}
