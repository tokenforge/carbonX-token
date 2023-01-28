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
import "@openzeppelin/contracts/access/AccessControlEnumerable.sol";
import "@openzeppelin/contracts/utils/Context.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/token/ERC1155/extensions/ERC1155Burnable.sol";
import "@openzeppelin/contracts/token/ERC1155/extensions/ERC1155Supply.sol";

import "./ICarbonReceipt.sol";

interface CarbonReceipt55Errors {
    /// `operator` must have minter role to mint
    /// @param operator Operator needs minter role
    error ErrMinterRoleRequired(address operator);

    /// `operator` must have admin role
    /// @param operator Operator needs admin role
    error ErrAdminRoleRequired(address operator);

    /// A Token with TokenID `id` does not exist.
    /// @param id The missing TokenID
    error ErrTokenNotExists(uint256 id);

    /// Arguments are in-consistent or just wrong
    error ErrInvalidArguments();
}

contract CarbonReceipt55 is
    Context,
    AccessControlEnumerable,
    ReentrancyGuard,
    ICarbonReceipt,
    ERC1155Burnable,
    ERC1155Supply,
    CarbonReceipt55Errors
{
    struct ReceiptData {
        uint256 originalTokenId;
        uint256 amount;
        uint256 blockNumber;
        uint256 blockTime;
    }

    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");

    event UriChanged(string indexed newUri);

    string private _name;
    string private _symbol;

    mapping(uint256 => ReceiptData[]) _receipts;

    mapping(uint256 => string) private _tokenUris;

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

    constructor(string memory name_, string memory symbol_) ERC1155("") {
        _name = name_;
        _symbol = symbol_;

        _setupRole(DEFAULT_ADMIN_ROLE, _msgSender());

        _setupRole(MINTER_ROLE, _msgSender());
        _setupRole(PAUSER_ROLE, _msgSender());
    }

    function delegatePermissionsTo(address minter) public onlyAdmin {
        revokeRole(MINTER_ROLE, getRoleMember(MINTER_ROLE, 0));

        _grantRole(MINTER_ROLE, minter);
    }

    function name() public view returns (string memory) {
        return _name;
    }

    function symbol() public view returns (string memory) {
        return _symbol;
    }

    function receiptDataCount(uint256 tokenId) external view returns (uint256) {
        return _receipts[tokenId].length;
    }

    function receiptData(uint256 tokenId, uint256 index) external view returns (ReceiptData memory) {
        require(index < _receipts[tokenId].length, "Index out of Bounds");
        return _receipts[tokenId][index];
    }

    function mintReceipt(
        address to,
        uint256 tokenId,
        uint256 amount,
        uint256 originalTokenId,
        string memory tokenUri,
        bytes memory data
    ) public override onlyMinter nonReentrant {
        ReceiptData memory receipt = ReceiptData(originalTokenId, amount, block.number, block.timestamp);
        _receipts[tokenId].push(receipt);

        bytes memory _uri = bytes(tokenUri);
        if (!exists(tokenId) && _uri.length > 0) {
            // If a token with this ID will get minted for the first time, and if a TokenURI was given,
            // we assign the Uri to the particular token.
            _tokenUris[tokenId] = tokenUri;
        }

        super._mint(to, tokenId, amount, data);
    }

    function batchMintReceipt(
        address to,
        uint256[] memory tokenIds,
        uint256[] memory amounts,
        uint256[] memory originalTokenIds,
        string[] memory tokenUris,
        bytes memory data
    ) public override onlyMinter nonReentrant {
        if (
            tokenIds.length != amounts.length ||
            tokenIds.length != originalTokenIds.length ||
            tokenIds.length != tokenUris.length
        ) {
            revert ErrInvalidArguments();
        }

        for (uint256 i = 0; i < tokenIds.length; i++) {
            uint256 tokenId = tokenIds[i];
            ReceiptData memory receipt = ReceiptData(originalTokenIds[i], amounts[i], block.number, block.timestamp);
            _receipts[tokenId].push(receipt);

            bytes memory _uri = bytes(tokenUris[i]);
            if (!exists(tokenId) && _uri.length > 0) {
                // If a token with this ID will get minted for the first time, and if a TokenURI was given,
                // we assign the Uri to the particular token.
                _tokenUris[tokenId] = tokenUris[i];
            }

            super._mint(to, tokenId, amounts[i], data);
        }
    }

    function setURI(string memory newUri) public virtual onlyAdmin {
        super._setURI(newUri);

        emit UriChanged(newUri);
    }

    function uri(uint256 id) public view override returns (string memory) {
        if (!exists(id)) {
            revert ErrTokenNotExists(id);
        }

        // We have to convert string to bytes to check for existence
        bytes memory _uri = bytes(_tokenUris[id]);
        if (_uri.length > 0) {
            return _tokenUris[id];
        } else {
            return super.uri(id);
        }
    }

    /**
     * @dev Hook that is called before any token transfer. This includes minting
     * and burning, as well as batched variants.
     *
     * The same hook is called on both single and batched variants. For single
     * transfers, the length of the `id` and `amount` arrays will be 1.
     *
     * Calling conditions (for each `id` and `amount` pair):
     *
     * - When `from` and `to` are both non-zero, `amount` of ``from``'s tokens
     * of token type `id` will be  transferred to `to`.
     * - When `from` is zero, `amount` tokens of token type `id` will be minted
     * for `to`.
     * - when `to` is zero, `amount` of ``from``'s tokens of token type `id`
     * will be burned.
     * - `from` and `to` are never both zero.
     * - `ids` and `amounts` have the same, non-zero length.
     *
     * To learn more about hooks, head to xref:ROOT:extending-contracts.adoc#using-hooks[Using Hooks].
     */
    function _beforeTokenTransfer(
        address operator,
        address from,
        address to,
        uint256[] memory ids,
        uint256[] memory amounts,
        bytes memory data
    ) internal virtual override(ERC1155, ERC1155Supply) {
        super._beforeTokenTransfer(operator, from, to, ids, amounts, data);
    }

    /**
     * @dev See {IERC165-supportsInterface}.
     */
    function supportsInterface(
        bytes4 interfaceId
    ) public view virtual override(AccessControlEnumerable, ERC1155) returns (bool) {
        return
            interfaceId == type(IERC1155).interfaceId ||
            interfaceId == type(AccessControlEnumerable).interfaceId ||
            super.supportsInterface(interfaceId);
    }
}
