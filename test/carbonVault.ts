import {ethers} from 'hardhat';
import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';

import {SignerWithAddress} from '@nomiclabs/hardhat-ethers/signers';

import {BigNumber, BigNumberish, Signer} from "ethers";
import {
    CarbonReceipt,
    CarbonReceipt__factory,
    CarbonVault,
    CarbonVault__factory,
    CarbonX,
    CarbonX__factory
} from "../typechain";

chai.use(chaiAsPromised);
const {expect} = chai;


describe('CarbonX Vault Tests', () => {
    let token: CarbonX,
        receipt: CarbonReceipt,
        vault: CarbonVault,
        axel: SignerWithAddress,
        ben: SignerWithAddress,
        chantal: SignerWithAddress,
        governance: SignerWithAddress,
        backend: SignerWithAddress
    ;

    const createSignature = async (
        to: string,
        tokenId: BigNumberish,
        amount: BigNumberish,
        hash: string,
        signerAccount: Signer = backend,
    ) => {
        let message = '';
        
        if(hash == '') {
            message = await token["createMessage(address,uint256,uint256)"](to, tokenId, amount)
        } else {
            message = await token["createMessage(address,uint256,uint256,string)"](to, tokenId, amount, hash)
        }
        return await signerAccount.signMessage(ethers.utils.arrayify(message));
    };

    beforeEach(async () => {
        [axel, ben, chantal, governance, backend] = await ethers.getSigners();

        const tokenFactory = (await ethers.getContractFactory('CarbonX', governance)) as CarbonX__factory;
        token = await tokenFactory.deploy(backend.address, 'ipfs://');
        await token.deployed();
        expect(token.address).to.properAddress;

        const carbonReceiptFactory = (await ethers.getContractFactory('CarbonReceipt', governance)) as CarbonReceipt__factory;
        receipt = await carbonReceiptFactory.deploy();
        await receipt.deployed();

        const vaultFactory = (await ethers.getContractFactory('CarbonVault', governance)) as CarbonVault__factory;

        vault = await vaultFactory.deploy(receipt.address, 'ipfs://');
        await vault.deployed();
        
        await receipt.grantRole(await receipt.MINTER_ROLE(), vault.address);
        
        console.log(await receipt.MINTER_ROLE());

        expect(vault.address).to.properAddress;
        
    });

    // 4
    describe('we can stake tokens into vault', async () => {
        const 
            tokenId = 1001,
            amount = 250,
            maxSupply = 1000,
            hash = 'NgcFOAfYXwVrmQrUOyB0U5kWU4w1a8Gf2gPPTPBrGTqTl-6qe7ERStbEMamFV4niv1bhFKI5167vzMLApLOEBs0ArvvUiClrRAFb=w600';

        let sigForAxel: string,
            axelAsMinter: CarbonX,
            chantalAsMinter: CarbonX;

        beforeEach(async () => {
            sigForAxel = await createSignature(axel.address, tokenId, amount, hash, backend);
            axelAsMinter = token.connect(axel);
            chantalAsMinter = token.connect(chantal);
        })

        it('Axel gets token and stakes them into Vault', async () => {
            const totalSupplyBefore = await vault.totalSupply(tokenId);
            expect(totalSupplyBefore).to.eq(0);

            await axelAsMinter.create(axel.address, tokenId, amount, maxSupply, hash, sigForAxel);
            
            expect(await token.totalSupply(tokenId)).to.eq(amount);
            
            const axelAsSigner = token.connect(axel)
            await axelAsSigner.safeTransferFrom(axel.address, vault.address, tokenId, amount, '0x')

            expect(await token.totalSupply(tokenId)).to.eq(amount);
            expect(await token.balanceOf(axel.address, tokenId)).to.eq(0);
            expect(await token.balanceOf(vault.address, tokenId)).to.eq(amount);
            
        });

        
    });

});

export function ether(e: BigNumberish): BigNumber {
    return ethers.utils.parseUnits(e.toString(), 'ether');
}

export function formatBytesString(text: string): string {
    const bytes = ethers.utils.toUtf8Bytes(text);

    return ethers.utils.hexlify(bytes);
}
