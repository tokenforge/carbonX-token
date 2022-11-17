import {ethers} from 'hardhat';
import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';

import {SignerWithAddress} from '@nomiclabs/hardhat-ethers/signers';

import {ContractTransaction} from "ethers";
import {
    CarbonReceipt55, CarbonReceipt55__factory,
} from "../typechain";

chai.use(chaiAsPromised);
const {expect} = chai;


describe('Carbon Receipt1155 Tests', () => {
    let tokenFactory: CarbonReceipt55__factory,
        receipt: CarbonReceipt55,
        axel: SignerWithAddress,
        ben: SignerWithAddress,
        chantal: SignerWithAddress,
        governance: SignerWithAddress,
        backend: SignerWithAddress
    ;

    beforeEach(async () => {
        [axel, ben, chantal, governance, backend] = await ethers.getSigners();

        tokenFactory = (await ethers.getContractFactory('CarbonReceipt55', governance)) as CarbonReceipt55__factory;

        receipt = await tokenFactory.deploy('Receipt', 'R55');
    });
    
    it('has the right setup', async() => {
        expect(receipt.address).to.properAddress;
        expect(await receipt.name()).to.eq('Receipt');
        expect(await receipt.symbol()).to.eq('R55');
    })

    it('reverts when non-admins will try to release permissions', async() => {
        await expect(receipt.connect(ben).delegatePermissionsTo(ben.address))
            .to.be.revertedWith(`AccessControl: account ${ben.address.toLowerCase()} is missing role ${await receipt.DEFAULT_ADMIN_ROLE()}`);
    })

    it('wont reverts when an admin is trying to release permissions', async() => {
        await expect(receipt.connect(governance).delegatePermissionsTo(ben.address))
            .to.emit(receipt, 'RoleGranted')
            .withArgs(await receipt.MINTER_ROLE(), ben.address, governance.address)
    })
    
    it('supports the right interfaces', async() => {
        expect(await receipt.supportsInterface('0xffffffff')).to.be.false;
        expect(await receipt.supportsInterface('0xd9b67a26')).to.be.true; // IERC1155
        expect(await receipt.supportsInterface('0x5a05180f')).to.be.true; // IAccessControlEnumerable
    })

    it('will revert when non-minter will try to mint', async() => {
        await expect(receipt.connect(chantal).mintReceipt(ben.address, 123, 1, 100, '0x'))
            .to.be.revertedWithCustomError(receipt, 'ErrMinterRoleRequired')
            .withArgs(chantal.address)
    })
    
    describe('can mint receipt tokens', async() => {
        
        const tokenId = 123,
            amount = 42,
            originalTokenId = 7
        ;
        
        let tx: ContractTransaction;
        
        beforeEach( async() => {
            tx = await receipt.mintReceipt(axel.address, tokenId, amount, originalTokenId, '0x' )
        })
        
        it('mints receipts successfully', async () => {
            expect(tx)
                .to.emit(receipt, 'TransferSingle')
                .withArgs(governance.address, ethers.constants.AddressZero, axel.address, tokenId, amount)
            
            const data = await receipt.receiptData(tokenId, 0);
            
            expect(data.originalTokenId).to.eq(originalTokenId)
            expect(data.amount).to.eq(amount)
            
            expect(data.blockNumber).to.eq(tx.blockNumber)
            
            expect(await receipt.receiptDataCount(tokenId)).to.eq(1);
        })
        
        it('wont have any receipt data for non-existing tokens', async () => {
            expect(await receipt.receiptDataCount(99999)).to.eq(0);
            await expect(receipt.receiptData(99999, 0)).to.revertedWith('Index out of Bounds')
        })

        it('will revert when fetch receiptData out of bounds', async() => {
            await expect(receipt.receiptData(tokenId, 1)).to.revertedWith('Index out of Bounds')
        })        
        
        
    })

});

