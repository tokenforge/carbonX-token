// SPDX-License-Identifier: UNLICENSED
// (C) by TokenForge GmbH, Berlin
// Author: Hagen Hübel, hagen@token-forge.io

pragma solidity >=0.8.3;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/token/ERC1155/extensions/ERC1155Burnable.sol";
import "@openzeppelin/contracts/token/ERC1155/extensions/ERC1155Supply.sol";
import "@openzeppelin/contracts/token/ERC1155/utils/ERC1155Receiver.sol";
import "./CarbonReceipt.sol";

contract CarbonVault is ERC1155, ERC1155Supply, ERC1155Receiver, Ownable {
    using ECDSA for bytes32;

    mapping(uint256 => string) private _tokenUris;
    CarbonReceipt private _receiptToken;

    event SignerChanged(address indexed oldSigner, address indexed _signer);

    modifier tokenExists(uint256 tokenId) {
        require(exists(tokenId));
        _;
    }

    constructor(CarbonReceipt receiptToken_, string memory baseUri_) ERC1155(baseUri_) {
        _receiptToken = receiptToken_;
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
        address, /*operator*/
        address, /*from*/
        address, /*to*/
        uint256[] memory, /*ids*/
        uint256[] memory, /*amounts*/
        bytes memory /*data*/
    ) internal virtual override(ERC1155, ERC1155Supply) {
        revert("Not allowed");
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        virtual
        override(ERC1155, ERC1155Receiver)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }

    function onERC1155Received(
        address, /*operator*/
        address from,
        uint256, /*tokenId*/
        uint256 amount,
        bytes memory
    ) public virtual override returns (bytes4) {
        _receiptToken.mint(from, amount * (10**18));
        return this.onERC1155Received.selector;
    }

    function onERC1155BatchReceived(
        address,
        address,
        uint256[] memory,
        uint256[] memory,
        bytes memory
    ) public virtual override returns (bytes4) {
        return this.onERC1155BatchReceived.selector;
    }
}
