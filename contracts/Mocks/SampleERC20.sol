// SPDX-License-Identifier: UNLICENSED
// (C) by TokenForge GmbH, Berlin
// Author: Hagen Hübel, hagen@token-forge.io

pragma solidity >=0.8.3;

import "@openzeppelin/contracts/token/ERC20/presets/ERC20PresetMinterPauser.sol";

contract SampleERC20 is ERC20PresetMinterPauser {
    bytes32 public constant BURNER_ROLE = keccak256("BURNER_ROLE");

    constructor(uint256 initialSupply) ERC20PresetMinterPauser("SampleToken", "STK") {
        _mint(msg.sender, initialSupply);
        grantRole(BURNER_ROLE, msg.sender);
    }

    function burn(uint256 value) public override onlyRole(BURNER_ROLE) {
        super._burn(msg.sender, value);
    }
}
