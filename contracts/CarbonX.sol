// SPDX-License-Identifier: UNLICENSED
// (C) by TokenForge GmbH, Berlin
// Author: Hagen Hübel, hagen@token-forge.io

pragma solidity 0.8.6;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/token/ERC1155/extensions/ERC1155Burnable.sol";
import "@openzeppelin/contracts/token/ERC1155/extensions/ERC1155Supply.sol";

import "./ICarbonX.sol";

interface CarbonXErrors {
    
    /// Signer must not be zero-address
    error ErrSignerMustNotBeZeroAddress();

    /// A token with Token-ID `tokenId` has not been created yet.
    /// @param tokenId the Token-Id
    error ErrTokenNotExists(uint256 tokenId);

    /// Token `tokenId` already exists, use mint instead
    /// @param tokenId the Token-Id
    error ErrTokenAlreadyExists(uint256 tokenId);
    
    /// Either signature is wrong or parameters have been corrupted
    error ErrInvalidSignature();
    
    /// Initial supply `amount` is greater than max-supply `maxSupply`
    /// @param tokenId the Token-Id
    /// @param amount The initial amount of token to create into beneficiaries wallet
    /// @param maxSupply the overall max supply for this particular token-id
    error ErrInitialSupplyGreaterThanNaxSupply(uint256 tokenId, uint256 amount, uint256 maxSupply);
    
    // Minting would violate max token supply of `maxSupply`
    /// @param tokenId the Token-Id
    /// @param newSupply the new max-supply that would be created 
    /// @param maxSupply the overall max supply for this particular token-id
    error ErrMintWouldViolateMaxTokenSupply(uint256 tokenId, uint256 newSupply, uint256 maxSupply);
}

contract CarbonX is ERC1155Burnable, ERC1155Supply, Ownable, ICarbonX, CarbonXErrors {
    using ECDSA for bytes32;

    // Signer
    address private _signer;

    event SignerChanged(address indexed oldSigner, address indexed _signer);

    // Token-URIs
    mapping(uint256 => string) private _tokenUris;

    // max supplies per TokenID
    mapping(uint256 => uint256) private _maxTokenSupplies;

    modifier tokenExists(uint256 tokenId) {
        if(! exists(tokenId)) {
            revert ErrTokenNotExists(tokenId);
        }
        _;
    }

    constructor(address signer_, string memory baseUri_) ERC1155(baseUri_) {
        if (signer_ == address(0)) {
            revert ErrSignerMustNotBeZeroAddress();
        }

        _signer = signer_;
    }

    /// @notice Helper to know signers address
    /// @return the signer address
    function getSigner() public view virtual returns (address) {
        return _signer;
    }

    function setSigner(address signer_) external onlyOwner {
        if (signer_ == address(0)) {
            revert ErrSignerMustNotBeZeroAddress();
        }
        
        if (signer_ == _signer) {
            return;
        }

        address oldSigner = _signer;

        _signer = signer_;
        emit SignerChanged(oldSigner, _signer);
    }

    /// @notice Helper that creates the message that signer needs to sign to allow a mint
    ///         this is usually also used when creating the allowances, to ensure "message"
    ///         is the same
    /// @param to the beneficiary
    /// @param tokenId the token id
    /// @param amount the amount of tokens
    /// @return the message to sign
    function createMessage(
        address to,
        uint256 tokenId,
        uint256 amount
    ) public view returns (bytes32) {
        return keccak256(abi.encode(to, tokenId, amount, address(this)));
    }

    /// @notice Helper that creates the message that signer needs to sign to allow a mint
    ///         this is usually also used when creating the allowances, to ensure "message"
    ///         is the same
    /// @param to the beneficiary
    /// @param tokenId the token id
    /// @param amount the amount of tokens
    /// @param tokenUri The tokenUri
    /// @return the message to sign
    function createMessage(
        address to,
        uint256 tokenId,
        uint256 amount,
        string memory tokenUri
    ) public view returns (bytes32) {
        return keccak256(abi.encode(to, tokenId, amount, tokenUri, address(this)));
    }

    /// @dev Creates a new token with max supply, mints $amount into $to address
    /// 
    /// @param to Beneficiary of the initial token creation
    /// @param tokenId the token-Id
    /// @param amount The initial amount of token to create into beneficiaries wallet
    /// @param maxSupply the overall max supply for this particular token-id
    /// @param tokenUri the token-uri for the particular token-id
    /// @param signature The ECDSA-signature
    function create(
        address to,
        uint256 tokenId,
        uint256 amount,
        uint256 maxSupply,
        string memory tokenUri,
        bytes memory signature
    ) public {
        if (exists(tokenId)) {
            revert ErrTokenAlreadyExists(tokenId);
        }

        bytes32 message = createMessage(to, tokenId, amount, tokenUri).toEthSignedMessageHash();

        // verifies that the sha3(account, nonce, address(this)) has been signed by _allowancesSigner
        if (message.recover(signature) != _signer) {
            revert ErrInvalidSignature();
        }
        if (amount > maxSupply) {
            revert ErrInitialSupplyGreaterThanNaxSupply(tokenId, amount, maxSupply);
        }

        bytes memory data;
        _mint(to, tokenId, amount, data);

        _maxTokenSupplies[tokenId] = maxSupply;

        if (bytes(tokenUri).length > 0) {
            _setTokenUri(tokenId, tokenUri);
        }
    }

    /// @dev Mints token at beneficiary-address for existing tokenId to a specific beneficiary
    /// maximum supply may not exceed maxTokenSupplies[tokenId]
    ///
    /// @param to the beneficiary
    /// @param tokenId the token id
    /// @param amount the amount of tokens
    function mintTo(
        address to,
        uint256 tokenId,
        uint256 amount,
        bytes memory signature
    ) public tokenExists(tokenId) {
        bytes32 message = createMessage(to, tokenId, amount).toEthSignedMessageHash();

        // verifies that the sha3(account, nonce, address(this)) has been signed by _allowancesSigner
        if (message.recover(signature) != _signer) {
            revert ErrInvalidSignature();
        }

        if (amount + totalSupply(tokenId) > _maxTokenSupplies[tokenId]) {
            revert ErrMintWouldViolateMaxTokenSupply(tokenId, amount + totalSupply(tokenId), _maxTokenSupplies[tokenId]);
        }

        bytes memory data;
        _mint(to, tokenId, amount, data);
    }
    /// @dev Mints token into msg.sender for existing tokenId to a specific beneficiary
    /// maximum supply may not exceed maxTokenSupplies[tokenId]
    ///
    /// @param tokenId the token id
    /// @param amount the amount of tokens
    function mint(
        uint256 tokenId,
        uint256 amount,
        bytes memory signature
    ) external tokenExists(tokenId) {
        mintTo(msg.sender, tokenId, amount, signature);
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

    function uri(uint256 id) public view virtual override returns (string memory) {
        return _tokenUris[id];
    }

    function setTokenUri(uint256 id, string memory tokenUri) external onlyOwner {
        _setTokenUri(id, tokenUri);
    }

    function _setTokenUri(uint256 id, string memory tokenUri) internal {
        _tokenUris[id] = tokenUri;
    }

    function isTransferIntoVaultAccepted(
        address,
        address,
        uint256[] memory,
        uint256[] memory,
        bytes memory
    ) public view virtual override returns (bool) {
        return true;
    }

    function onTransferIntoVaultSuccessfullyDone(
        address,
        address,
        uint256[] memory,
        uint256[] memory,
        bytes memory
    ) public virtual override returns (bytes4) {
        return this.onTransferIntoVaultSuccessfullyDone.selector;
    }
}
