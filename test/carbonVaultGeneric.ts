import {ethers} from 'hardhat';
import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';

import {SignerWithAddress} from '@nomiclabs/hardhat-ethers/signers';

import {BigNumber, BigNumberish} from "ethers";
import {
    CarbonReceipt20,
    CarbonReceipt20__factory, CarbonReceipt55, CarbonReceipt55__factory,
    CarbonVault,
    CarbonX
} from "../typechain";
import {createSignature} from "./lib/signatures";
import {createContracts, getCarbonTokenMockNotAccepting} from "./lib/factory";

chai.use(chaiAsPromised);
const {expect} = chai;


describe('CarbonX Vault Tests', () => {
    let token: CarbonX,
        receipt20: CarbonReceipt20,
        receipt55: CarbonReceipt55,
        vault: CarbonVault,
        axel: SignerWithAddress,
        ben: SignerWithAddress,
        chantal: SignerWithAddress,
        governance: SignerWithAddress,
        backend: SignerWithAddress
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

    describe('deal with minted tokens', async () => {
        const
            tokenId = 100101,
            amount = 25001,
            maxSupply = 1000101,
            hash = 'NgcFOAfYXwVrmQrUOyB0U5kWU4w1a8Gf2gPPTPBrGTqTl-6qe7ERStbEMamFV4niv1bhFKI5167vzMLApLOEBs0ArvvUiClrRAFb=w60'
        ;

        let sigForAxel: string,
            axelAsSigner: CarbonX
        ;
        
        beforeEach(async () => {
            
            // We replace the token with a Mock that is not accepting
            
            token = await getCarbonTokenMockNotAccepting(governance, backend);

            sigForAxel = await createSignature(token, axel.address, tokenId, amount, hash, backend);
            await token.create(axel.address, tokenId, amount, maxSupply, hash, sigForAxel);
            
            axelAsSigner = token.connect(axel);
            
            await vault.addSupportedToken(token.address);
        })

        it('reverts if the accepted token decides to not accept staking at the moment', async() => {
            expect(axelAsSigner.safeTransferFrom(axel.address, vault.address, tokenId, amount, '0x'))
                .to.be.revertedWithCustomError(vault, 'ErrTransferIntoVaultIsNotAccepted')
                .withArgs(token.address);
            
        })

    })

});

export function ether(e: BigNumberish): BigNumber {
    return ethers.utils.parseUnits(e.toString(), 'ether');
}

