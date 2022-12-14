// SPDX-License-Identifier: UNLICENSED
// (C) by TokenForge GmbH, Berlin
// Author: Hagen Hübel, hagen@token-forge.io

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
