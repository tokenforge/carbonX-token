import {ethers} from "hardhat";

import {
    CarbonReceipt55__factory,
    CarbonVault,
    CarbonVault__factory,
    CarbonX,
    CarbonX__factory,
    // @ts-ignore
    CarbonXMockAssertsDuringAccepting,
    CarbonXMockAssertsDuringAccepting__factory, CarbonXMockAssertsDuringAcknowledge,
    CarbonXMockNoAcknowledge,
    CarbonXMockNoAcknowledge__factory,
    CarbonXMockNotAccepting,
    CarbonXMockNotAccepting__factory, CarbonXMockReentrancyAttack, CarbonXMockReentrancyAttack__factory,
    CarbonXMockThrowsDuringAccepting,
    CarbonXMockThrowsDuringAccepting__factory,
    CarbonXMockThrowsDuringAcknowledge,
    CarbonXMockThrowsDuringAcknowledge__factory
} from "../../typechain";
import {SignerWithAddress} from "@nomiclabs/hardhat-ethers/signers";
import {Contract, ContractFactory} from "ethers";

interface CreateContractsResult<CarbonReceipt extends Contract, CarbonReceiptFactory extends ContractFactory> {
    token: CarbonX,    
    receipt: CarbonReceipt,
    vault: CarbonVault,
}

export async function deployReceipt<CarbonReceipt extends Contract, CarbonReceiptFactory extends ContractFactory>(
    governance: SignerWithAddress, backend: SignerWithAddress,
    receiptContract: string,
): Promise<CarbonReceipt> {
    const carbonReceiptFactory = (await ethers.getContractFactory(receiptContract, governance)) as ContractFactory;
    const receipt = await carbonReceiptFactory.deploy('CarbonFarming1', 'CF1');
    await receipt.deployed();
    
    return receipt as CarbonReceipt;
}

export function isCarbonReceipt55<CarbonReceiptFactory>(
    factory: any
): factory is CarbonReceipt55__factory {
    console.log('isCarbonReceipt55', factory)
    console.log('.-', factory instanceof CarbonReceipt55__factory)
    return factory instanceof CarbonReceipt55__factory;
}

export async function createContracts<CarbonReceipt extends Contract, CarbonReceiptFactory extends ContractFactory>(
    governance: SignerWithAddress, backend: SignerWithAddress,
    receiptContract: string, args: Array<any>
): Promise<{ receipt: CarbonReceipt; vault: CarbonVault; token: CarbonX }>
{
    const tokenFactory = (await ethers.getContractFactory('CarbonX', governance)) as CarbonX__factory;
    const token = await tokenFactory.deploy(backend.address, 'ipfs://');
    await token.deployed();

    const carbonReceiptFactory = (await ethers.getContractFactory(receiptContract, governance)) as ContractFactory;
    
    const receipt = await carbonReceiptFactory.deploy('AAA', 'A1');
    await receipt.deployed();

    const vaultFactory = (await ethers.getContractFactory('CarbonVault', governance)) as CarbonVault__factory;

    const vault = await vaultFactory.deploy(receipt.address, token.address);
    await vault.deployed();

    // Vault becomes MinterRole in Receipt Token
    //await receipt.grantRole(await receipt.MINTER_ROLE(), vault.address);
    await receipt.delegatePermissionsTo(vault.address);
    
    return {
        token,
        receipt: receipt as CarbonReceipt,
        vault
    }
}

export async function getCarbonTokenMockNotAccepting(governance: SignerWithAddress, backend: SignerWithAddress): Promise<CarbonXMockNotAccepting> {
    const tokenFactory = (await ethers.getContractFactory('CarbonXMockNotAccepting', governance)) as CarbonXMockNotAccepting__factory;
    const token = await tokenFactory.deploy(backend.address, 'ipfs://');
    await token.deployed();
    
    return token;
}

export async function getCarbonTokenMockThrowingDuringAccepting(governance: SignerWithAddress, backend: SignerWithAddress): Promise<CarbonXMockThrowsDuringAccepting> {
    const tokenFactory = (await ethers.getContractFactory('CarbonXMockThrowsDuringAccepting', governance)) as CarbonXMockThrowsDuringAccepting__factory;
    const token = await tokenFactory.deploy(backend.address, 'ipfs://');
    await token.deployed();

    return token;
}

export async function getCarbonTokenMockAssertDuringAccepting(governance: SignerWithAddress, backend: SignerWithAddress): Promise<CarbonXMockAssertsDuringAccepting> {
    const tokenFactory = (await ethers.getContractFactory('CarbonXMockAssertsDuringAccepting', governance)) as CarbonXMockAssertsDuringAccepting__factory;
    const token = await tokenFactory.deploy(backend.address, 'ipfs://');
    await token.deployed();

    return token;
}

export async function getCarbonTokenMockNoAcknowledge(governance: SignerWithAddress, backend: SignerWithAddress): Promise<CarbonXMockNoAcknowledge> {
    const tokenFactory = (await ethers.getContractFactory('CarbonXMockNoAcknowledge', governance)) as CarbonXMockNoAcknowledge__factory;
    const token = await tokenFactory.deploy(backend.address, 'ipfs://');
    await token.deployed();

    return token;
}

export async function getCarbonTokenMockThrowsDuringAcknowledge(governance: SignerWithAddress, backend: SignerWithAddress): Promise<CarbonXMockThrowsDuringAcknowledge> {
    const tokenFactory = (await ethers.getContractFactory('CarbonXMockThrowsDuringAcknowledge', governance)) as CarbonXMockThrowsDuringAcknowledge__factory;
    const token = await tokenFactory.deploy(backend.address, 'ipfs://');
    await token.deployed();

    return token;
}

export async function getCarbonTokenMockAssertsDuringAcknowledge(governance: SignerWithAddress, backend: SignerWithAddress): Promise<CarbonXMockAssertsDuringAcknowledge> {
    const tokenFactory = (await ethers.getContractFactory('CarbonXMockAssertsDuringAcknowledge', governance)) as CarbonXMockThrowsDuringAcknowledge__factory;
    const token = await tokenFactory.deploy(backend.address, 'ipfs://');
    await token.deployed();

    return token;
}

export async function getCarbonTokenMockReentrancyAttack(governance: SignerWithAddress, backend: SignerWithAddress, vault: string): Promise<CarbonXMockReentrancyAttack> {
    const tokenFactory = (await ethers.getContractFactory('CarbonXMockReentrancyAttack', governance)) as CarbonXMockReentrancyAttack__factory;
    const token = await tokenFactory.deploy(backend.address, 'ipfs://', vault);
    await token.deployed();

    return token;
}
