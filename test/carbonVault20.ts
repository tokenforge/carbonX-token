import {ethers} from 'hardhat';
import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';

import {SignerWithAddress} from '@nomiclabs/hardhat-ethers/signers';

import {BigNumber, BigNumberish} from "ethers";
import {
    CarbonReceipt20,
    CarbonReceipt20__factory,
    CarbonVault,
    CarbonX
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
            hash = 'NgcFOAfYXwVrmQrUOyB0U5kWU4w1a8Gf2gPPTPBrGTqTl-6qe7ERStbEMamFV4niv1bhFKI5167vzMLApLOEBs0ArvvUiClrRAFb=w600',
            amountWithDecimals = ethers.utils.parseUnits(String(amount), "ether")
        ;

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
        
        it('Axel contains $amount tokens as preparation for staking', async() => {
            expect(await token.totalSupply(tokenId)).to.eq(amount);
        })

        it('Axel gets token and stakes them into Vault', async () => {
            const tx = axelAsSigner.safeTransferFrom(axel.address, vault.address, tokenId, amount, '0x')
            
            const receiptTokenId = (await vault.currentReceiptTokenId()).toNumber();
            
            // We expect 3 Events
            const txReceipt = await (await tx).wait()
            expect(txReceipt.events?.length).to.eq(3);

            await expect(tx)
                // 1. Event on original Token: transfer from Axel into Vault
                .to.emit(token, 'TransferSingle')
                .withArgs(axel.address, axel.address, vault.address, tokenId, amount)

                // 2. Event: Transfer on the Receipt-token to mint tokens
                .to.emit(receipt, 'Transfer')
                .withArgs(ethers.constants.AddressZero, axel.address, amountWithDecimals)

                // 3. Event from Vault 'CarbonDeposited' 
                .to.emit(vault, 'CarbonDeposited')
                .withArgs(receiptTokenId, // receiptTokenId
                    amount,             // amount
                    axel.address,       // from
                    token.address,      // _msgSender()
                    tokenId             // originalTokenId 
                );
            
            expect(await token.totalSupply(tokenId)).to.eq(amount);
            expect(await token.balanceOf(axel.address, tokenId)).to.eq(0);
            expect(await token.balanceOf(vault.address, tokenId)).to.eq( amount );
            
            // Axel got $amount receipt token:
            expect(await receipt.balanceOf(axel.address)).to.eq(amountWithDecimals);
        });

        it('Axel stakes token via batchTransfer into Vault', async () => {
            
            // Mint a second token
            const sig2ForAxel = await createSignature(token, axel.address, tokenId + 1, amount + 1, hash, backend);
            await axelAsMinter.create(axel.address, tokenId + 1, amount + 1, maxSupply, hash, sig2ForAxel);
            
            const tx = axelAsSigner.safeBatchTransferFrom(axel.address, vault.address, [tokenId, tokenId + 1], [amount, amount + 1], '0x')

            const receiptTokenId = (await vault.currentReceiptTokenId()).toNumber();

            // We expect 4 Events: TransferBatch, CarbonBatchDeposited, 2x Transfer for Mint
            const txReceipt = await (await tx).wait()
            expect(txReceipt.events?.length).to.eq(4);
            
            await expect(tx)
                // 1. Event on original Token: transfer from Axel into Vault
                .to.emit(token, 'TransferBatch')
                .withArgs(axel.address, axel.address, vault.address, [tokenId, tokenId + 1], [amount, amount + 1])

                // 2. Event: Transfer on the Receipt-token to mint tokens
                .to.emit(receipt, 'Transfer')
                .withArgs(ethers.constants.AddressZero, axel.address, amountWithDecimals)

                // 3. Event from Vault 'CarbonDeposited' 
                .to.emit(vault, 'CarbonBatchDeposited')
                .withArgs( [receiptTokenId, receiptTokenId+1], // receiptTokenIds
                    [amount, amount+1],             // amount
                    axel.address,                   // from
                    token.address,                  // _msgSender()
                    [tokenId, tokenId+1]            // originalTokenIds 
                );

            expect(await token.totalSupply(tokenId)).to.eq(amount);
            expect(await token.totalSupply(tokenId + 1)).to.eq(amount + 1);
            expect(await token.balanceOf(axel.address, tokenId)).to.eq(0);
            expect(await token.balanceOf(axel.address, tokenId + 1)).to.eq(0);
            
            expect(await token.balanceOf(vault.address, tokenId)).to.eq( amount);
            expect(await token.balanceOf(vault.address, tokenId+1)).to.eq( amount+1);

            // Axel got $amount + $amount+1 receipt token:
            const receiptAmountWithDecimals = ethers.utils.parseUnits(String(amount + amount + 1), "ether")
            expect(await receipt.balanceOf(axel.address)).to.eq(receiptAmountWithDecimals);
        });
        
        it('we can NOT take out any tokens from vault', async () => {
            // some one stakes its token into vault
            await axelAsSigner.safeTransferFrom(axel.address, vault.address, tokenId, amount, '0x')
            
            // vault has $amount tokens
            expect(await token.balanceOf(vault.address, tokenId)).to.eq( amount );
            
            // we ensure that $governance is Owner ot $token
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
