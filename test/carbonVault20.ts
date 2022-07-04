import {ethers} from 'hardhat';
import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';

import {SignerWithAddress} from '@nomiclabs/hardhat-ethers/signers';

import {BigNumber, BigNumberish, Signer} from "ethers";
import {
    CarbonReceipt20,
    CarbonReceipt20__factory,
    CarbonVault,
    CarbonVault__factory,
    CarbonX,
    CarbonX__factory
} from "../typechain";
import {createSignature} from "./lib/signatures";
import {createContracts} from "./lib/factory";

chai.use(chaiAsPromised);
const {expect} = chai;


describe('CarbonX Vault Tests', () => {
    let token: CarbonX,
        receipt: CarbonReceipt20,
        vault: CarbonVault,
        axel: SignerWithAddress,
        ben: SignerWithAddress,
        chantal: SignerWithAddress,
        governance: SignerWithAddress,
        backend: SignerWithAddress
    ;

    beforeEach(async () => {
        [axel, ben, chantal, governance, backend] = await ethers.getSigners();

        const created = await createContracts<CarbonReceipt20, CarbonReceipt20__factory>(
            governance, 
            backend, 
            'CarbonReceipt20', 
            ['AAA', 'A2']
            );
        
        token = created.token;
        receipt = created.receipt;
        vault = created.vault;
        
        expect(token.address).to.properAddress;

        
        console.log("Axel: ", axel.address)
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
            axelAsSigner: CarbonX,
            chantalAsMinter: CarbonX;

        beforeEach(async () => {
            sigForAxel = await createSignature(token, axel.address, tokenId, amount, hash, backend);
            
            axelAsMinter = token.connect(axel);
            axelAsSigner = token.connect(axel)
            
            chantalAsMinter = token.connect(chantal);

            await axelAsMinter.create(axel.address, tokenId, amount, maxSupply, hash, sigForAxel);
        })

        it('Axel gets token and stakes them into Vault', async () => {
            expect(await token.totalSupply(tokenId)).to.eq(amount);
            
            await axelAsSigner.safeTransferFrom(axel.address, vault.address, tokenId, amount, '0x')

            expect(await token.totalSupply(tokenId)).to.eq(amount);
            expect(await token.balanceOf(axel.address, tokenId)).to.eq(0);
            expect(await token.balanceOf(vault.address, tokenId)).to.eq( amount );
            
            // Axel got $amount receipt token:
            const tokenBits = BigNumber.from(10).pow(18);
            const amountReceipt = BigNumber.from(amount).mul(tokenBits);
            expect(await receipt.balanceOf(axel.address)).to.eq(amountReceipt);
        });
        
        it('we can NOT take out any tokens from vault', async () => {
            // some one stakes its token into vault
            await axelAsSigner.safeTransferFrom(axel.address, vault.address, tokenId, amount, '0x')
            
            // vault has $amount tokens
            expect(await token.balanceOf(vault.address, tokenId)).to.eq( amount );
            
            // we ensure that $governance is Owner ot $token
            expect(await vault.owner()).eq(governance.address) 
            
            // and expect to fail when $governance wants to take out tokens out of vault
        //    const caller = vault.connect(governance);
            //await vault.setApprovalForAll(governance.address, true);
            //expect(await caller.safeTransferFrom(vault.address, ben.address, tokenId, amount, '0x'));
        })
        
    });


});

export function ether(e: BigNumberish): BigNumber {
    return ethers.utils.parseUnits(e.toString(), 'ether');
}

export function formatBytesString(text: string): string {
    const bytes = ethers.utils.toUtf8Bytes(text);

    return ethers.utils.hexlify(bytes);
}
