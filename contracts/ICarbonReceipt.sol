// SPDX-License-Identifier: UNLICENSED
// (C) by TokenForge GmbH, Berlin
// Author: Hagen Hübel, hagen@token-forge.io

pragma solidity 0.8.6;

interface ICarbonReceipt {
    function mintReceipt(
        address to,
        uint256 tokenId,
        uint256 amount,
        uint256 originalTokenId,
        bytes memory data
    ) external;

    function batchMintReceipt(
        address to,
        uint256[] memory tokenIds,
        uint256[] memory amounts,
        uint256[] memory originalTokenIds,
        bytes memory data
    ) external;
}
