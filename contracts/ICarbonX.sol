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

interface ICarbonX {
    function isTransferIntoVaultAccepted(
        address operator,
        address from,
        uint256[] memory tokenIds,
        uint256[] memory amounts,
        bytes memory data
    ) external view returns (bool);

    function onTransferIntoVaultSuccessfullyDone(
        address operator,
        address from,
        uint256[] memory tokenIds,
        uint256[] memory amounts,
        bytes memory data
    ) external returns (bytes4);

    function uri(uint256) external view returns (string memory);
}
