// SPDX-License-Identifier: UNLICENSED
// (C) by TokenForge GmbH, Berlin
// Author: Hagen Hübel, hagen@token-forge.io

pragma solidity >=0.8.3;

interface ICarbonReceipt {
    function mintReceipt(
        address to,
        uint256 tokenId,
        uint256 amount,
        bytes memory data
    ) external;

    function batchMintReceipt(
        address to,
        uint256[] memory tokenIds,
        uint256[] memory amounts,
        bytes memory data
    ) external;
}
