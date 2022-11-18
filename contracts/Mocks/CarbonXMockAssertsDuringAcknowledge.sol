// SPDX-License-Identifier: UNLICENSED
// (C) by TokenForge GmbH, Berlin
// Author: Hagen Hübel, hagen@token-forge.io

pragma solidity 0.8.6;

import "../CarbonX.sol";

contract CarbonXMockAssertsDuringAcknowledge is CarbonX {
    constructor(address signer_, string memory baseUri_) CarbonX(signer_, baseUri_) {}

    function onTransferIntoVaultSuccessfullyDone(
        address,
        address,
        uint256[] memory,
        uint256[] memory,
        bytes memory
    ) public virtual override returns (bytes4) {
        assert(false);
        return this.onTransferIntoVaultSuccessfullyDone.selector;
    }
}
