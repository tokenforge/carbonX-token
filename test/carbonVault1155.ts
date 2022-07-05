import {ethers} from 'hardhat';
import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';

import {SignerWithAddress} from '@nomiclabs/hardhat-ethers/signers';

import {BigNumber, BigNumberish, Signer} from "ethers";
import {
    CarbonReceipt55, CarbonReceipt55__factory,
    CarbonVault,
    CarbonX,
} from "../typechain";
import {createSignature} from "./lib/signatures";
import {createContracts} from "./lib/factory";

chai.use(chaiAsPromised);
const {expect} = chai;


describe('CarbonX Vault 1155 Tests', () => {
    let token: CarbonX,
        receipt: CarbonReceipt55,
        vault: CarbonVault,
        axel: SignerWithAddress,
        ben: SignerWithAddress,
        chantal: SignerWithAddress,
        governance: SignerWithAddress,
        backend: SignerWithAddress
    ;

    beforeEach(async () => {
        [axel, ben, chantal, governance, backend] = await ethers.getSigners();

        try {
            const created = await createContracts<CarbonReceipt55, CarbonReceipt55__factory>(
                governance, backend, 'CarbonReceipt55', ['test']);

            token = created.token;
            receipt = created.receipt;
            vault = created.vault;

            expect(token.address).to.properAddress;
            expect(receipt.address).to.properAddress;
            expect(vault.address).to.properAddress;
        }
        catch(e) {
            console.log(e);
        }
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
            
            const currentReceiptTokenIdBefore = (await vault.currentReceiptTokenId()).toNumber();
            
            await expect(axelAsSigner.safeTransferFrom(axel.address, vault.address, tokenId, amount, '0x'))

                // Event on CarbonX
                .to.emit(axelAsSigner, 'TransferSingle')
                .withArgs(axel.address, axel.address, vault.address, tokenId, amount)

                // Event on Vault
                .to.emit(vault, 'CarbonDeposited')
                .withArgs(currentReceiptTokenIdBefore + 1, amount, axel.address, token.address, tokenId)

                // Event on Vault for minting receipt token
            
                .to.emit(receipt, 'TransferSingle')
                .withArgs(vault.address, ethers.constants.AddressZero, axel.address, currentReceiptTokenIdBefore+1, amount)

            ;

            expect(await token.totalSupply(tokenId)).to.eq(amount);
            expect(await token.balanceOf(axel.address, tokenId)).to.eq(0);
            expect(await token.balanceOf(vault.address, tokenId)).to.eq( amount );
            
            // Axel got $amount receipt token:
            const currentReceiptTokenId = await vault.currentReceiptTokenId();
            expect(await receipt.balanceOf(axel.address, currentReceiptTokenId)).to.eq(amount);
            
            expect(await receipt.receiptDataCount(currentReceiptTokenId)).to.eq(1);

            const receiptData = await receipt.receiptData(currentReceiptTokenId, 0);
            expect(receiptData.originalTokenId).eq(tokenId);
        });
        
        it('we can NOT take out any tokens from vault', async () => {
            // vault has no tokens
            expect(await token.balanceOf(vault.address, tokenId)).to.eq( 0 );

            // some one stakes its token into vault
            await axelAsSigner.safeTransferFrom(axel.address, vault.address, tokenId, amount, '0x')
            
            // vault has $amount tokens
            expect(await token.balanceOf(vault.address, tokenId)).to.eq( amount );
            
            // we ensure that $governance is Owner ot $vault
            expect(await vault.owner()).eq(governance.address) 
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