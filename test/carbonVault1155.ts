import {ethers} from 'hardhat';
import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';

import {SignerWithAddress} from '@nomiclabs/hardhat-ethers/signers';

import {BigNumber, BigNumberish} from "ethers";
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

        const created = await createContracts<CarbonReceipt55, CarbonReceipt55__factory>(
            governance, backend, 'CarbonReceipt55', ['test']);

        token = created.token;
        receipt = created.receipt;
        vault = created.vault;
    });
    
    it('has the right setup', async() => {
        expect(token.address).to.properAddress;
        expect(receipt.address).to.properAddress;
        expect(vault.address).to.properAddress;
    })
    
    it('has assigned minter-roles to the vault properly', async() => {
        expect(await receipt.hasRole(await receipt.MINTER_ROLE(), vault.address)).to.be.true;
    })

    it('all minter-roles are setup correctly', async() => {
        expect(await receipt.getRoleMemberCount(await receipt.MINTER_ROLE())).to.eq(1);
        // expect(await receipt.getRoleMemberCount(await receipt.DEFAULT_ADMIN_ROLE())).to.eq(1);

        expect(await receipt.getRoleMember(await receipt.MINTER_ROLE(), 0)).to.eq(vault.address);
        // expect(await receipt.getRoleMember(await receipt.DEFAULT_ADMIN_ROLE(), 0)).to.eq(vault.address);
    })
    
    describe('we can stake tokens into vault', async () => {
        const 
            tokenId = 1001,
            amount = 250,
            maxSupply = 1000,
            hash = 'NgcFOAfYXwVrmQrUOyB0U5kWU4w1a8Gf2gPPTPBrGTqTl-6qe7ERStbEMamFV4niv1bhFKI5167vzMLApLOEBs0ArvvUiClrRAFb=w600'
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
            const currentReceiptTokenIdBefore = (await vault.currentReceiptTokenId()).toNumber();
            
            await expect(axelAsSigner.safeTransferFrom(axel.address, vault.address, tokenId, amount, '0x'))

                // Event on CarbonX
                .to.emit(axelAsSigner, 'TransferSingle')
                .withArgs(axel.address, axel.address, vault.address, tokenId, amount)

                // Event on Vault
                .to.emit(vault, 'CarbonDeposited')
                .withArgs(currentReceiptTokenIdBefore, amount, axel.address, token.address, tokenId)

                // Event on Vault for minting receipt token
            
                .to.emit(receipt, 'TransferSingle')
                .withArgs(vault.address, ethers.constants.AddressZero, axel.address, currentReceiptTokenIdBefore, amount)
            ;
            

            expect(await token.totalSupply(tokenId)).to.eq(amount);
            expect(await token.balanceOf(axel.address, tokenId)).to.eq(0);
            expect(await token.balanceOf(vault.address, tokenId)).to.eq( amount );
            
            // Axel got $amount receipt token:
            const currentReceiptTokenId = (await vault.currentReceiptTokenId()).toNumber();
            expect(await receipt.balanceOf(axel.address, currentReceiptTokenId - 1 )).to.eq(amount);

            expect(await receipt.receiptDataCount(currentReceiptTokenId-1)).to.eq(1);

            const receiptData = await receipt.receiptData(currentReceiptTokenId-1, 0);
            expect(receiptData.originalTokenId).eq(tokenId);
        });

        it('Axel stakes token via batch into Vault', async () => {
            const sig2ForAxel = await createSignature(token, axel.address, tokenId+1, amount+1, hash, backend);
            await axelAsMinter.create(axel.address, tokenId+1, amount+1, maxSupply, hash, sig2ForAxel);

            const currentReceiptTokenIdBefore = (await vault.currentReceiptTokenId()).toNumber();

            await expect(axelAsSigner.safeBatchTransferFrom(axel.address, vault.address, [tokenId, tokenId+1], [amount, amount+1], '0x'))

                // Event on CarbonX
                .to.emit(axelAsSigner, 'TransferBatch')
                .withArgs(axel.address, axel.address, vault.address, [tokenId, tokenId + 1], [amount, amount + 1])

                // Event on Vault
                .to.emit(vault, 'CarbonBatchDeposited')
                .withArgs( [currentReceiptTokenIdBefore, currentReceiptTokenIdBefore+1], // receiptTokenIds
                    [amount, amount+1],             // amount
                    axel.address,                   // from
                    token.address,                  // _msgSender()
                    [tokenId, tokenId+1]            // originalTokenIds 
                )

                // Event on Vault for minting receipt token
                .to.emit(receipt, 'TransferSingle')
                .withArgs(vault.address, ethers.constants.AddressZero, axel.address, currentReceiptTokenIdBefore, amount)
            ;

            expect(await token.totalSupply(tokenId)).to.eq(amount);
            expect(await token.balanceOf(axel.address, tokenId)).to.eq(0);
            expect(await token.balanceOf(vault.address, tokenId)).to.eq( amount );

            // Axel got $amount receipt token:
            const currentReceiptTokenId = (await vault.currentReceiptTokenId()).toNumber();
            expect(await receipt.balanceOf(axel.address, currentReceiptTokenId - 2 )).to.eq(amount);
            expect(await receipt.balanceOf(axel.address, currentReceiptTokenId - 1 )).to.eq(amount + 1);

            expect(await receipt.receiptDataCount(currentReceiptTokenId-2)).to.eq(1);
            expect(await receipt.receiptDataCount(currentReceiptTokenId-1)).to.eq(1);

            const receiptData = await receipt.receiptData(currentReceiptTokenId-2, 0);
            expect(receiptData.originalTokenId).eq(tokenId);

            const receiptData2 = await receipt.receiptData(currentReceiptTokenId-1, 0);
            expect(receiptData2.originalTokenId).eq(tokenId+1);

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
