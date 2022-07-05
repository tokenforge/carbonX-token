// SPDX-License-Identifier: UNLICENSED
// (C) by TokenForge GmbH, Berlin
// Author: Hagen Hübel, hagen@token-forge.io

pragma solidity >=0.8.3;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/access/AccessControlEnumerable.sol";
import "@openzeppelin/contracts/utils/Context.sol";

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/token/ERC1155/extensions/ERC1155Burnable.sol";
import "@openzeppelin/contracts/token/ERC1155/extensions/ERC1155Supply.sol";

import "./ICarbonReceipt.sol";


contract CarbonReceipt55 is Context, AccessControlEnumerable, ICarbonReceipt, ERC1155Burnable, ERC1155Supply {

    struct ReceiptData {
        uint256 originalTokenId;
        uint256 amount;
        uint256 blockNumber;
        uint256 blockTime;        
    }
    
    
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");

    string private _name;
    string private _symbol;

    mapping(uint256 => ReceiptData[]) _receipts;
    
    
    constructor(string memory name_, string memory symbol_) ERC1155("") {
        _name = name_;
        _symbol = symbol_;
        
        _setupRole(DEFAULT_ADMIN_ROLE, _msgSender());

        _setupRole(MINTER_ROLE, _msgSender());
        _setupRole(PAUSER_ROLE, _msgSender());
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
        bytes memory data
    ) public override {
        require(hasRole(MINTER_ROLE, _msgSender()), "CarbonReceipt55: must have minter role to mint");

        super._mint(to, tokenId, amount, data);

        ReceiptData memory receipt = ReceiptData(originalTokenId, amount, block.number, block.timestamp);
        _receipts[tokenId].push(receipt);
    }

    function batchMintReceipt(
        address to,
        uint256[] memory tokenIds,
        uint256[] memory amounts,
        uint256[] memory originalTokenIds,
        bytes memory data
    ) public override {
        require(hasRole(MINTER_ROLE, _msgSender()), "CarbonReceipt55: must have minter role to mint");

        for (uint256 i = 0; i < tokenIds.length; i++) {
            super._mint(to, tokenIds[i], amounts[i], data);

            ReceiptData memory receipt = ReceiptData(originalTokenIds[i], amounts[i], block.number, block.timestamp);
            _receipts[tokenIds[i]].push(receipt);
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
    function supportsInterface(bytes4 interfaceId)
        public
        view
        virtual
        override(AccessControlEnumerable, ERC1155)
        returns (bool)
    {
        return
            interfaceId == type(IERC1155).interfaceId ||
            interfaceId == type(AccessControlEnumerable).interfaceId ||
            super.supportsInterface(interfaceId);
    }
}
