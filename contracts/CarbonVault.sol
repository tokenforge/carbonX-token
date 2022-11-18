// SPDX-License-Identifier: UNLICENSED
// (C) by TokenForge GmbH, Berlin
// Author: Hagen Hübel, hagen@token-forge.io

pragma solidity 0.8.6;

import "hardhat/console.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/Context.sol";
import "@openzeppelin/contracts/utils/introspection/ERC165.sol";

import "@openzeppelin/contracts/token/ERC1155/utils/ERC1155Receiver.sol";

import "./ICarbonReceipt.sol";
import "./CarbonX.sol";
import "./ICarbonX.sol";

interface CarbonVaultErrors {
    /// The received `token` is not supported at the moment.
    /// @param token address of Token
    error ErrTokenNotSupported(address token);

    /// New token must have another address
    /// @param token address of Token
    error ErrTokenAddressHasNotChanged(address token);

    /// CarbonVault: transfer into vault not accepted
    /// @param token address of Token
    error ErrTransferIntoVaultIsNotAccepted(address token);

    /// CarbonVault: transfer to not-compatible implementer
    /// @param token address of Token
    error ErrTransferToNotCompatibleImplementer(address token);

    /// CarbonVault: ICarbonX rejected tokens
    /// @param token address of Token
    error ErrAcknowledgeFailRejectedTokens(address token);
}

contract CarbonVault is ERC165, ERC1155Receiver, Ownable, CarbonVaultErrors {
    using ECDSA for bytes32;
    using Counters for Counters.Counter;

    event CarbonDeposited(
        uint256 indexed tokenId,
        uint256 amount,
        address indexed from,
        address tokenAddress,
        uint256 originalTokenId
    );

    event CarbonBatchDeposited(
        uint256[] tokenIds,
        uint256[] amounts,
        address indexed from,
        address tokenAddress,
        uint256[] originalTokenIds
    );

    event SupportedTokenAdded(address operator, address supportedToken);
    event SupportedTokenRemoved(address operator, address supportedToken);

    event ReceiptTokenChanged(address indexed operator, address indexed oldToken, address indexed newToken);

    Counters.Counter private _tokenIds;

    ICarbonReceipt private _receiptToken;

    mapping(address => bool) private _supportedTokens;

    constructor(ICarbonReceipt receiptToken_, ICarbonX supportedToken) {
        _receiptToken = receiptToken_;
        addSupportedToken(supportedToken);
    }

    function addSupportedToken(ICarbonX supportedToken) public onlyOwner {
        _supportedTokens[address(supportedToken)] = true;
        emit SupportedTokenAdded(_msgSender(), address(supportedToken));
    }

    function removeSupportedToken(ICarbonX supportedToken) public onlyOwner {
        _supportedTokens[address(supportedToken)] = false;
        emit SupportedTokenRemoved(_msgSender(), address(supportedToken));
    }

    function tokenIsSupported(address token) public view returns (bool) {
        return _supportedTokens[token];
    }

    function currentReceiptTokenId() external view returns (uint256) {
        return _tokenIds.current();
    }

    function changeReceiptToken(ICarbonReceipt receiptToken_) public onlyOwner {
        if (_receiptToken == receiptToken_) {
            revert ErrTokenAddressHasNotChanged(address(receiptToken_));
        }

        address oldToken = address(_receiptToken);
        _receiptToken = receiptToken_;

        emit ReceiptTokenChanged(_msgSender(), oldToken, address(receiptToken_));
    }

    /**
     * @dev See {IERC165-supportsInterface}.
     */
    function supportsInterface(
        bytes4 interfaceId
    ) public view virtual override(ERC165, ERC1155Receiver) returns (bool) {
        return interfaceId == type(ERC1155Receiver).interfaceId || super.supportsInterface(interfaceId);
    }

    function onERC1155Received(
        address operator,
        address from,
        uint256 tokenId,
        uint256 amount,
        bytes memory data
    ) public virtual override returns (bytes4) {
        address originalToken = _msgSender();
        uint256 originalTokenId = tokenId;

        if (!tokenIsSupported(originalToken)) {
            revert ErrTokenNotSupported(originalToken);
        }

        uint256 receiptTokenId = _tokenIds.current();
        _tokenIds.increment();

        uint256[] memory tokenIds = _asSingletonArray(tokenId);
        uint256[] memory amounts = _asSingletonArray(amount);

        try ICarbonX(originalToken).isTransferIntoVaultAccepted(operator, from, tokenIds, amounts, data) returns (
            bool accepted
        ) {
            if (!accepted) {
                revert ErrTransferIntoVaultIsNotAccepted(originalToken);
            }
        } catch Error(string memory reason) {
            revert(reason);
        } catch {
            revert ErrTransferToNotCompatibleImplementer(originalToken);
        }

        _receiptToken.mintReceipt(from, receiptTokenId, amount, originalTokenId, data);

        emit CarbonDeposited(receiptTokenId, amount, from, _msgSender(), originalTokenId);

        try
            ICarbonX(_msgSender()).onTransferIntoVaultSuccessfullyDone(operator, from, tokenIds, amounts, data)
        returns (bytes4 response) {
            if (response != ICarbonX.onTransferIntoVaultSuccessfullyDone.selector) {
                revert ErrAcknowledgeFailRejectedTokens(originalToken);
            }
        } catch Error(string memory reason) {
            revert(reason);
        } catch {
            revert("CarbonVault: transfer to not-compatible implementer");
        }

        return this.onERC1155Received.selector;
    }

    function onERC1155BatchReceived(
        address operator,
        address from,
        uint256[] memory tokenIds,
        uint256[] memory amounts,
        bytes memory data
    ) public virtual override returns (bytes4) {
        address originalToken = _msgSender();
        uint256[] memory originalTokenIds = tokenIds;

        if (!tokenIsSupported(originalToken)) {
            revert ErrTokenNotSupported(originalToken);
        }

        try ICarbonX(_msgSender()).isTransferIntoVaultAccepted(operator, from, tokenIds, amounts, data) returns (
            bool accepted
        ) {
            if (!accepted) {
                revert("CarbonVault: transfer into vault not accepted");
            }
        } catch Error(string memory reason) {
            revert(reason);
        } catch {
            revert("CarbonVault: transfer to not-compatible implementer");
        }

        uint256[] memory receiptTokenIds = new uint256[](tokenIds.length);
        for (uint256 i = 0; i < tokenIds.length; i++) {
            receiptTokenIds[i] = _tokenIds.current();
            _tokenIds.increment();
        }

        _receiptToken.batchMintReceipt(from, receiptTokenIds, amounts, originalTokenIds, data);

        emit CarbonBatchDeposited(receiptTokenIds, amounts, from, _msgSender(), originalTokenIds);

        try
            ICarbonX(_msgSender()).onTransferIntoVaultSuccessfullyDone(operator, from, tokenIds, amounts, data)
        returns (bytes4 response) {
            if (response != ICarbonX.onTransferIntoVaultSuccessfullyDone.selector) {
                revert("CarbonVault: ICarbonX rejected tokens");
            }
        } catch Error(string memory reason) {
            revert(reason);
        } catch {
            revert("CarbonVault: transfer to not-compatible implementer");
        }

        return this.onERC1155BatchReceived.selector;
    }

    function _asSingletonArray(uint256 element) private pure returns (uint256[] memory) {
        uint256[] memory array = new uint256[](1);
        array[0] = element;

        return array;
    }
}
