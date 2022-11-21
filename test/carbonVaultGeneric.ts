import {ethers} from 'hardhat';
import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';

import {SignerWithAddress} from '@nomiclabs/hardhat-ethers/signers';

import {impersonateAccount, setBalance} from "@nomicfoundation/hardhat-network-helpers";

import {BigNumber, BigNumberish} from "ethers";
import {
    CarbonReceipt20,
    CarbonReceipt20__factory, CarbonReceipt55, CarbonReceipt55__factory,
    CarbonVault,
    CarbonX, CarbonXMockReentrancyAttack,
} from "../typechain";
import {createSignature} from "./lib/signatures";
import {
    createContracts,
    getCarbonTokenMockAssertDuringAccepting,
    getCarbonTokenMockAssertsDuringAcknowledge,
    getCarbonTokenMockNoAcknowledge,
    getCarbonTokenMockNotAccepting, getCarbonTokenMockReentrancyAttack,
    getCarbonTokenMockThrowingDuringAccepting,
    getCarbonTokenMockThrowsDuringAcknowledge
} from "./lib/factory";

chai.use(chaiAsPromised);
const {expect} = chai;


describe('CarbonX Vault Tests', () => {
    const
        tokenId = 100101,
        amount = 25001,
        maxSupply = 1000101,
        initialBalanceForContract = ethers.utils.parseUnits('50', "ether"),
        hash = 'NgcFOAfYXwVrmQrUOyB0U5kWU4w1a8Gf2gPPTPBrGTqTl-6qe7ERStbEMamFV4niv1bhFKI5167vzMLApLOEBs0ArvvUiClrRAFb=w60'
    ;

    let token: CarbonX,
        receipt20: CarbonReceipt20,
        receipt55: CarbonReceipt55,
        vault: CarbonVault,
        axel: SignerWithAddress,
        ben: SignerWithAddress,
        chantal: SignerWithAddress,
        governance: SignerWithAddress,
        backend: SignerWithAddress,

        vaultMock: CarbonVault
    ;

    beforeEach(async () => {
        [axel, ben, chantal, governance, backend] = await ethers.getSigners();

        const created20 = await createContracts<CarbonReceipt20, CarbonReceipt20__factory>(
            governance, 
            backend, 
            'CarbonReceipt20', 
            ['AAA', 'A2']
            );
        
        token = created20.token;
        receipt20 = created20.receipt;
        vault = created20.vault;

        const created55 = await createContracts<CarbonReceipt55, CarbonReceipt55__factory>(
            governance,
            backend,
            'CarbonReceipt55',
            ['AAA5', 'A5']
        );
        
        receipt55 = created55.receipt;
        
    });

    it('allows operator to change the receipt token', async() => {
        await expect(vault.changeReceiptToken(receipt55.address))
            .to.emit(vault, 'ReceiptTokenChanged')
            .withArgs(governance.address, receipt20.address, receipt55.address)
    })

    it('reverts when changing receipt token is replacing the old token with itself', async() => {
        await expect(vault.changeReceiptToken(receipt20.address))
            .to.be.revertedWithCustomError(vault, 'ErrTokenAddressHasNotChanged')    
    })

    it('reverts when not owner tries to change receipt token', async() => {
        await expect(vault.connect(chantal).changeReceiptToken(receipt55.address))
            .to.be.revertedWith('Ownable: caller is not the owner')
    })

    it('reverts when not owner tries to remove supported token', async() => {
        await expect(vault.connect(chantal).removeSupportedToken(receipt55.address))
            .to.be.revertedWith('Ownable: caller is not the owner')
    })

    it('reverts when not owner tries to add a new supported token', async() => {
        await expect(vault.connect(chantal).addSupportedToken(receipt55.address))
            .to.be.revertedWith('Ownable: caller is not the owner')
    })

    it('supports the right interfaces', async() => {
        expect(await vault.supportsInterface('0xffffffff')).to.be.false;
        expect(await vault.supportsInterface('0x01ffc9a7')).to.be.true; // IERC1155
    })

    async function prepareCarbonTokenWithImpersonation(token: CarbonX) {
        await impersonateAccount(token.address);
        await setBalance(token.address, initialBalanceForContract);

        const contractSigner = await ethers.getSigner(token.address);

        const sigForAxel = await createSignature(token, axel.address, tokenId, amount, hash, backend);
        await token.create(axel.address, tokenId, amount, maxSupply, hash, sigForAxel);

        const axelAsSigner = token.connect(axel);

        await vault.addSupportedToken(token.address);
        
        return {
            vaultMock: vault.connect(contractSigner),
            axelAsSigner,
        }
    }

    describe('handling CarbonX when non-accepting the staking mechanism', async () => {
        let axelAsSigner: CarbonX,
            vaultMock: CarbonVault
        ;
        
        beforeEach(async () => {
            // We replace the token with a Mock that is not accepting
            
            token = await getCarbonTokenMockNotAccepting(governance, backend);

            ({vaultMock, axelAsSigner} = await prepareCarbonTokenWithImpersonation(token));
        })

        it('reverts if the accepted token decides to not accept staking at the moment', async() => {
            // On the CarbonVault-Receiver-side, we expect this:
            await expect(vaultMock.onERC1155Received(axel.address, axel.address, tokenId, amount, '0x'))
                .to.be.revertedWithCustomError(vault, 'ErrTransferIntoVaultIsNotAccepted')
                .withArgs(token.address)

            // and the encapsulated ERC1155 this:             
            await expect(axelAsSigner.safeTransferFrom(axel.address, vault.address, tokenId, amount, '0x'))
                .to.be.revertedWith('ERC1155: transfer to non-ERC1155Receiver implementer');
            
            expect(await token.balanceOf(axel.address, tokenId)).to.eq(amount);
        })

        it('reverts in batch-mode if the accepted token decides to not accept staking at the moment', async() => {
            // On the CarbonVault-Receiver-side, we expect this:
            await expect(vaultMock.onERC1155BatchReceived(axel.address, axel.address, [tokenId], [amount], '0x'))
                .to.be.revertedWithCustomError(vault, 'ErrTransferIntoVaultIsNotAccepted')
                .withArgs(token.address)

            // and the encapsulated ERC1155 this:             
            await expect(axelAsSigner.safeBatchTransferFrom(axel.address, vault.address, [tokenId], [amount], '0x'))
                .to.be.revertedWith('ERC1155: transfer to non-ERC1155Receiver implementer');

            expect(await token.balanceOf(axel.address, tokenId)).to.eq(amount);
        })
        
    })

    describe('handling CarbonX when reverting during accepting the staking mechanism', async () => {
        let axelAsSigner: CarbonX,
            vaultMock: CarbonVault
        ;

        beforeEach(async () => {
            // We replace the token with a Mock that is not accepting

            token = await getCarbonTokenMockThrowingDuringAccepting(governance, backend);

            ({vaultMock, axelAsSigner} = await prepareCarbonTokenWithImpersonation(token));
        })

        it('reverts if the accepted token throws while accepting staking', async() => {
            // On the CarbonVault-Receiver-side, we expect this:
            await expect(vaultMock.onERC1155Received(axel.address, axel.address, tokenId, amount, '0x'))
                .to.be.revertedWith('We can\'t handle this current situation properly')

            // and the encapsulated ERC1155 this:
            await expect(axelAsSigner.safeTransferFrom(axel.address, vault.address, tokenId, amount, '0x'))
                .to.be.revertedWith('We can\'t handle this current situation properly')

            expect(await token.balanceOf(axel.address, tokenId)).to.eq(amount);
        })

        it('reverts in batch-mode if the accepted token throws while accepting staking', async() => {
            // On the CarbonVault-Receiver-side, we expect this:
            await expect(vaultMock.onERC1155BatchReceived(axel.address, axel.address, [tokenId], [amount], '0x'))
                .to.be.revertedWith('We can\'t handle this current situation properly')

            // and the encapsulated ERC1155 this:
            await expect(axelAsSigner.safeBatchTransferFrom(axel.address, vault.address, [tokenId], [amount], '0x'))
                .to.be.revertedWith('We can\'t handle this current situation properly')

            expect(await token.balanceOf(axel.address, tokenId)).to.eq(amount);
        })
    })

    describe('handling CarbonX when asserting during accepting the staking mechanism', async () => {
        let axelAsSigner: CarbonX,
            vaultMock: CarbonVault
        ;

        beforeEach(async () => {
            // We replace the token with a Mock that is not accepting

            token = await getCarbonTokenMockAssertDuringAccepting(governance, backend);

            ({vaultMock, axelAsSigner} = await prepareCarbonTokenWithImpersonation(token));
        })

        it('reverts if the accepted token throws while accepting staking', async() => {
            // On the CarbonVault-Receiver-side, we expect this:
            await expect(vaultMock.onERC1155Received(axel.address, axel.address, tokenId, amount, '0x'))
                .to.be.revertedWithCustomError(vault, 'ErrTransferToNotCompatibleImplementer')
                .withArgs(token.address)

            // and the encapsulated ERC1155 this:
            await expect(axelAsSigner.safeTransferFrom(axel.address, vault.address, tokenId, amount, '0x'))
                .to.be.revertedWith('ERC1155: transfer to non-ERC1155Receiver implementer');

            expect(await token.balanceOf(axel.address, tokenId)).to.eq(amount);
        })

        it('reverts in batch-mode if the accepted token throws while accepting staking', async() => {
            // On the CarbonVault-Receiver-side, we expect this:
            await expect(vaultMock.onERC1155BatchReceived(axel.address, axel.address, [tokenId], [amount], '0x'))
                .to.be.revertedWithCustomError(vault, 'ErrTransferToNotCompatibleImplementer')
                .withArgs(token.address)

            // and the encapsulated ERC1155 this:
            await expect(axelAsSigner.safeBatchTransferFrom(axel.address, vault.address, [tokenId], [amount], '0x'))
                .to.be.revertedWith('ERC1155: transfer to non-ERC1155Receiver implementer');


            expect(await token.balanceOf(axel.address, tokenId)).to.eq(amount);
        })
    })

    describe('handling CarbonX properly when acknowledge did not happen as expected', async () => {
        let axelAsSigner: CarbonX,
            vaultMock: CarbonVault
        ;

        beforeEach(async () => {
            // We replace the token with a Mock that is not accepting

            token = await getCarbonTokenMockNoAcknowledge(governance, backend);

            ({vaultMock, axelAsSigner} = await prepareCarbonTokenWithImpersonation(token));
        })

        it('reverts if the acknowledge did not happen at the end of staking', async() => {
            // On the CarbonVault-Receiver-side, we expect this:
            await expect(vaultMock.onERC1155Received(axel.address, axel.address, tokenId, amount, '0x'))
                .to.be.revertedWithCustomError(vault, 'ErrAcknowledgeFailRejectedTokens')
                .withArgs(token.address)

            // and the encapsulated ERC1155 this:
            await expect(axelAsSigner.safeTransferFrom(axel.address, vault.address, tokenId, amount, '0x'))
                .to.be.revertedWith('ERC1155: transfer to non-ERC1155Receiver implementer')

            expect(await token.balanceOf(axel.address, tokenId)).to.eq(amount);
        })

        it('reverts in batch-mode if the acknowledge did not happen at the end of staking', async() => {
            // On the CarbonVault-Receiver-side, we expect this:
            await expect(vaultMock.onERC1155BatchReceived(axel.address, axel.address, [tokenId], [amount], '0x'))
                .to.be.revertedWithCustomError(vault, 'ErrAcknowledgeFailRejectedTokens')
                .withArgs(token.address)

            // and the encapsulated ERC1155 this:
            await expect(axelAsSigner.safeBatchTransferFrom(axel.address, vault.address, [tokenId], [amount], '0x'))
                .to.be.revertedWith('ERC1155: transfer to non-ERC1155Receiver implementer')

            expect(await token.balanceOf(axel.address, tokenId)).to.eq(amount);
        })
    })

    describe('handling CarbonX properly when acknowledge reverts unexpectedly', async () => {
        let 
            axelAsSigner: CarbonX
        ;

        beforeEach(async () => {
            // We replace the token with a Mock that is not accepting

            token = await getCarbonTokenMockThrowsDuringAcknowledge(governance, backend);

            ({vaultMock, axelAsSigner} = await prepareCarbonTokenWithImpersonation(token));
        })

        it('reverts if the acknowledge did not happen at the end of staking', async() => {
            // On the CarbonVault-Receiver-side, we expect this:
            await expect(vaultMock.onERC1155Received(axel.address, axel.address, tokenId, amount, '0x'))
                .to.be.revertedWith('Something happened');

            // and the encapsulated ERC1155 this:
            await expect(axelAsSigner.safeTransferFrom(axel.address, vault.address, tokenId, amount, '0x'))
                .to.be.revertedWith('Something happened')

            expect(await token.balanceOf(axel.address, tokenId)).to.eq(amount);
        })

        it('reverts in batch-mode if the acknowledge did not happen at the end of staking', async() => {
            // On the CarbonVault-Receiver-side, we expect this:
            await expect(vaultMock.onERC1155BatchReceived(axel.address, axel.address, [tokenId], [amount], '0x'))
                .to.be.revertedWith('Something happened');

            // and the encapsulated ERC1155 this:
            await expect(axelAsSigner.safeBatchTransferFrom(axel.address, vault.address, [tokenId], [amount], '0x'))
                .to.be.revertedWith('Something happened')

            expect(await token.balanceOf(axel.address, tokenId)).to.eq(amount);
        })
    })

    describe('handling CarbonX properly when acknowledge asserts unexpectedly', async () => {
        let axelAsSigner: CarbonX
        ;
        
        beforeEach(async () => {
            // We replace the token with a Mock that is not accepting
            token = await getCarbonTokenMockAssertsDuringAcknowledge(governance, backend);

            ({vaultMock, axelAsSigner} = await prepareCarbonTokenWithImpersonation(token));
        })

        it('reverts if the acknowledge did not happen at the end of staking', async() => {
            // On the CarbonVault-Receiver-side, we expect this:
            await expect(vaultMock.onERC1155Received(axel.address, axel.address, tokenId, amount, '0x'))
                .to.be.revertedWithCustomError(vault, 'ErrTransferToNotCompatibleImplementer')
                .withArgs(token.address)
            
            // and the encapsulated ERC1155 this:
            await expect(axelAsSigner.safeTransferFrom(axel.address, vault.address, tokenId, amount, '0x'))
                .to.be.revertedWith('ERC1155: transfer to non-ERC1155Receiver implementer')

            expect(await token.balanceOf(axel.address, tokenId)).to.eq(amount);
        })

        it('reverts in batch-mode if the acknowledge did not happen at the end of staking', async() => {
            await expect(vaultMock.onERC1155BatchReceived(axel.address, axel.address, [tokenId], [amount], '0x'))
                .to.be.revertedWithCustomError(vault, 'ErrTransferToNotCompatibleImplementer')
                .withArgs(token.address)

            await expect(axelAsSigner.safeBatchTransferFrom(axel.address, vault.address, [tokenId], [amount], '0x'))
                .to.be.revertedWith('ERC1155: transfer to non-ERC1155Receiver implementer')

            expect(await token.balanceOf(axel.address, tokenId)).to.eq(amount);
        })
    })

    describe('handling CarbonX properly when bad actor performs reentrancy attack', async () => {
        let axelAsSigner: CarbonX;

        beforeEach(async () => {
            // We replace the token with a Mock that is not accepting
            token = await getCarbonTokenMockReentrancyAttack(governance, backend, vault.address);

            ({vaultMock, axelAsSigner} = await prepareCarbonTokenWithImpersonation(token));
        })

        it('wont re-entry into the trap', async() => {
            const attack = token as CarbonXMockReentrancyAttack;

            expect(await attack.counter()).to.eq(0);
            
            await attack.setBatchOrNot(0);

            await expect(axelAsSigner.safeTransferFrom(axel.address, vault.address, tokenId, amount, '0x'))
                .to.be.revertedWith('ReentrancyGuard: reentrant call')
                //.to.be.revertedWith('ReentrancyMock: failed call');
               
            expect(await attack.counter()).to.eq(0); // still Zero because of the revert 

            expect(await token.balanceOf(axel.address, tokenId)).to.eq(amount);
        })

        it('wont re-entry into the trap', async() => {
            const attack = token as CarbonXMockReentrancyAttack;

            expect(await attack.counter()).to.eq(0);

            await attack.setBatchOrNot(1);
            
            await expect(axelAsSigner.safeBatchTransferFrom(axel.address, vault.address, [tokenId], [amount], '0x'))
                .to.be.revertedWith('ReentrancyGuard: reentrant call')
            //.to.be.revertedWith('ReentrancyMock: failed call');

            expect(await attack.counter()).to.eq(0); // still Zero because of the revert 

            expect(await token.balanceOf(axel.address, tokenId)).to.eq(amount);
        })
        
    })

});

export function ether(e: BigNumberish): BigNumber {
    return ethers.utils.parseUnits(e.toString(), 'ether');
}

