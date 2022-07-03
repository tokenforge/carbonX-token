// SPDX-License-Identifier: UNLICENSED
// (C) by TokenForge GmbH, Berlin
// Author: Hagen Hübel, hagen@token-forge.io

pragma solidity >=0.8.3;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

import "@openzeppelin/contracts/token/ERC20/presets/ERC20PresetMinterPauser.sol";
import "./ICarbonReceipt.sol";

contract CarbonReceipt20 is ICarbonReceipt, ERC20PresetMinterPauser {
    constructor(string memory name, string memory symbol) ERC20PresetMinterPauser(name, symbol) {}

    function mintReceipt(
        address to,
        uint256, /*tokenId*/
        uint256 amount,
        bytes memory /*data*/
    ) public override {
        mint(to, amount * (10**this.decimals()));
    }

    function batchMintReceipt(
        address to,
        uint256[] memory tokenIds,
        uint256[] memory amounts,
        bytes memory /*data*/
    ) public override {
        for (uint256 i = 0; i < tokenIds.length; i++) {
            mint(to, amounts[i]);
        }
    }
}
