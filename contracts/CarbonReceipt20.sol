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

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

import "@openzeppelin/contracts/token/ERC20/presets/ERC20PresetMinterPauser.sol";
import "./ICarbonReceipt.sol";

interface CarbonReceipt20Errors {
    /// `operator` must have minter role to mint
    /// @param operator Operator needs minter role
    error ErrMinterRoleRequired(address operator);

    /// `operator` must have admin role
    /// @param operator Operator needs admin role
    error ErrAdminRoleRequired(address operator);
}

contract CarbonReceipt20 is ICarbonReceipt, ERC20PresetMinterPauser, CarbonReceipt20Errors {
    modifier onlyMinter() {
        if (!hasRole(MINTER_ROLE, _msgSender())) {
            revert ErrMinterRoleRequired(_msgSender());
        }

        _;
    }

    modifier onlyAdmin() {
        if (!hasRole(DEFAULT_ADMIN_ROLE, _msgSender())) {
            revert ErrAdminRoleRequired(_msgSender());
        }

        _;
    }

    constructor(string memory name, string memory symbol) ERC20PresetMinterPauser(name, symbol) {}

    function delegatePermissionsTo(address minter) public onlyAdmin {
        revokeRole(MINTER_ROLE, getRoleMember(MINTER_ROLE, 0));
        _grantRole(MINTER_ROLE, minter);
    }

    /*
     * @dev mints receipt token (only available for MINTER_ROLE)
     */
    function mintReceipt(
        address to,
        uint256 /*tokenId*/,
        uint256 amount,
        uint256 /*originalTokenId*/,
        string memory /*tokenUri*/,
        bytes memory /*data*/
    ) public override onlyMinter {
        mint(to, amount * (10 ** this.decimals()));
    }

    /*
     * @dev mints receipts as batch (only available for MINTER_ROLE)
     */
    function batchMintReceipt(
        address to,
        uint256[] memory tokenIds,
        uint256[] memory amounts,
        uint256[] memory /*originalTokenId*/,
        string[] memory /*tokenUris*/,
        bytes memory /*data*/
    ) public override onlyMinter {
        for (uint256 i = 0; i < tokenIds.length; i++) {
            mint(to, amounts[i] * (10 ** this.decimals()));
        }
    }
}
