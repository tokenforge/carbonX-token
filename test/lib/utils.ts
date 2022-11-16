import { ethers } from "hardhat";

export function keccak256FromString(s: string): string {
    return ethers.utils.keccak256(ethers.utils.defaultAbiCoder.encode(["string"], [s]));
}
