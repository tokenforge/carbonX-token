// SPDX-License-Identifier: UNLICENSED
// (C) by TokenForge GmbH, Berlin
// Author: Hagen Hübel, hagen@token-forge.io

pragma solidity >=0.8.3;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

import "@openzeppelin/contracts/token/ERC20/presets/ERC20PresetMinterPauser.sol";
import "./ICarbonReceipt.sol";

contract CarbonReceipt20 is ICarbonReceipt, ERC20PresetMinterPauser, ReentrancyGuard {
    modifier onlyMinter() {
        require(hasRole(MINTER_ROLE, _msgSender()), "CarbonReceipt55: must have minter role to mint");
        _;
    }

    constructor(string memory name, string memory symbol) ERC20PresetMinterPauser(name, symbol) {}

    /*
     * @dev mints receipt token (only available for MINTER_ROLE)
     */
    function mintReceipt(
        address to,
        uint256, /*tokenId*/
        uint256 amount,
        uint256, /*originalTokenId*/
        bytes memory /*data*/
    ) public override onlyMinter nonReentrant {
        mint(to, amount * (10**this.decimals()));
    }

    /*
     * @dev mints receipts as batch (only available for MINTER_ROLE)
     */
    function batchMintReceipt(
        address to,
        uint256[] memory tokenIds,
        uint256[] memory amounts,
        uint256[] memory, /*originalTokenId*/
        bytes memory /*data*/
    ) public override onlyMinter nonReentrant {
        for (uint256 i = 0; i < tokenIds.length; i++) {
            mint(to, amounts[i]);
        }
    }
}
