// SPDX-License-Identifier: UNLICENSED
// (C) by TokenForge GmbH, Berlin
// Author: Hagen Hübel, hagen@token-forge.io

pragma solidity 0.8.6;

import "../CarbonX.sol";

contract CarbonXMockThrowsDuringAccepting is CarbonX {
    constructor(address signer_, string memory baseUri_) CarbonX(signer_, baseUri_) {}

    function isTransferIntoVaultAccepted(
        address,
        address,
        uint256[] memory,
        uint256[] memory,
        bytes memory
    ) public view virtual override returns (bool) {
        revert("We can't handle this current situation properly");
    }
}
