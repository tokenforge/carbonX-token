// SPDX-License-Identifier: UNLICENSED
// (C) by TokenForge GmbH, Berlin
// Author: Hagen Hübel, hagen@token-forge.io

pragma solidity >=0.8.3;

interface ICarbonX {
    
    function onSentToVault(
        address operator,
        address from,
        uint256 tokenId,
        uint256 amount,
        bytes memory data
    ) external;
}
