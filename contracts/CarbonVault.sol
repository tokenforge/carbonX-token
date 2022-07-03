// SPDX-License-Identifier: UNLICENSED
// (C) by TokenForge GmbH, Berlin
// Author: Hagen Hübel, hagen@token-forge.io

pragma solidity >=0.8.3;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/Context.sol";
import "@openzeppelin/contracts/utils/introspection/ERC165.sol";
import "@openzeppelin/contracts/token/ERC1155/utils/ERC1155Receiver.sol";

import "./CarbonReceipt.sol";
import "./CarbonX.sol";
import "./ICarbonX.sol";

contract CarbonVault is ERC165, ERC1155Receiver, Ownable {
    using ECDSA for bytes32;

    mapping(uint256 => string) private _tokenUris;
    CarbonReceipt private _receiptToken;

    mapping(address => bool) private _supportedTokens;

    event SignerChanged(address indexed oldSigner, address indexed _signer);

    /*modifier tokenExists(uint256 tokenId) {
        require(exists(tokenId));
        _;
    }*/

    constructor(CarbonReceipt receiptToken_, ICarbonX supportedToken) {
        _receiptToken = receiptToken_;
        addSupportedToken(supportedToken);
    }

    function addSupportedToken(ICarbonX supportedToken) public onlyOwner {
        _supportedTokens[address(supportedToken)] = true;
    }

    function removeSupportedToken(ICarbonX supportedToken) public onlyOwner {
        _supportedTokens[address(supportedToken)] = false;
    }

    function tokenIsSupported(address token) public view returns (bool) {
        return _supportedTokens[token];
    }

    /**
     * @dev See {IERC165-supportsInterface}.
     */
    function supportsInterface(bytes4 interfaceId)
        public
        view
        virtual
        override(ERC165, ERC1155Receiver)
        returns (bool)
    {
        return interfaceId == type(ERC1155Receiver).interfaceId || super.supportsInterface(interfaceId);
    }

    function onERC1155Received(
        address operator,
        address from,
        uint256 tokenId,
        uint256 amount,
        bytes memory data
    ) public virtual override returns (bytes4) {
        require(tokenIsSupported(_msgSender()), "Token is not supported");

        _receiptToken.mint(from, amount * (10**18));
        ICarbonX(_msgSender()).onSentToVault(operator, from, tokenId, amount, data);

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
