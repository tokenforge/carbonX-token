import {ethers} from 'hardhat';
import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';

import {SignerWithAddress} from '@nomiclabs/hardhat-ethers/signers';

import {ContractTransaction} from "ethers";
import {
    CarbonReceipt55, CarbonReceipt55__factory,
} from "../typechain";
import {getReMintAttackerMock} from "./lib/factory";

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

    it('has the right setup', async () => {
        expect(receipt.address).to.properAddress;
        expect(await receipt.name()).to.eq('Receipt');
        expect(await receipt.symbol()).to.eq('R55');
    })

    it('reverts when non-admins will try to release permissions', async () => {
        await expect(receipt.connect(chantal).delegatePermissionsTo(chantal.address))
            .to.be.revertedWithCustomError(receipt, `ErrAdminRoleRequired`).withArgs(chantal.address);
    })

    it('wont reverts when an admin is trying to release permissions', async () => {
        await expect(receipt.connect(governance).delegatePermissionsTo(ben.address))
            .to.emit(receipt, 'RoleGranted')
            .withArgs(await receipt.MINTER_ROLE(), ben.address, governance.address)
    })

    it('reverts when non-admins will try to change uri', async () => {
        await expect(receipt.connect(chantal).setURI('new://uri'))
            .to.be.revertedWithCustomError(receipt, `ErrAdminRoleRequired`).withArgs(chantal.address);
    })

    it('accepts changing URI for admins and emits the corresponding event', async () => {
        await expect(receipt.setURI('new://uri'))
            .to.emit(receipt, 'UriChanged')
            .withArgs('new://uri');
    })


    it('supports the right interfaces', async () => {
        expect(await receipt.supportsInterface('0xffffffff')).to.be.false;
        expect(await receipt.supportsInterface('0xd9b67a26')).to.be.true; // IERC1155
        expect(await receipt.supportsInterface('0x5a05180f')).to.be.true; // IAccessControlEnumerable
    })

    it('will revert when non-minter will try to mint', async () => {
        await expect(receipt.connect(chantal).mintReceipt(ben.address, 123, 3, 100, 'uri://', '0x'))
            .to.be.revertedWithCustomError(receipt, 'ErrMinterRoleRequired')
            .withArgs(chantal.address)
    })

    it('will revert when non-minter will try to batch-mint', async () => {
        await expect(receipt.connect(chantal).batchMintReceipt(ben.address, [123], [4], [100], ['uri://'], '0x'))
            .to.be.revertedWithCustomError(receipt, 'ErrMinterRoleRequired')
            .withArgs(chantal.address)
    })

    it('will revert when batch-mint gets invalid arguments', async () => {
        await expect(receipt.batchMintReceipt(ben.address, [123], [], [100], ['uri://'], '0x'))
            .to.be.revertedWithCustomError(receipt, 'ErrInvalidArguments')
    })

    it('will revert when batch-mint gets invalid arguments II', async () => {
        await expect(receipt.batchMintReceipt(ben.address, [123], [234], [], ['uri://'], '0x'))
            .to.be.revertedWithCustomError(receipt, 'ErrInvalidArguments')
    })

    it('will revert when batch-mint gets invalid arguments III', async () => {
        await expect(receipt.batchMintReceipt(ben.address, [123], [234], [100], ['uri://', 'XX'], '0x'))
            .to.be.revertedWithCustomError(receipt, 'ErrInvalidArguments')
    })

    it('will revert when batch-mint gets invalid arguments IV', async () => {
        await expect(receipt.batchMintReceipt(ben.address, [], [234], [100], ['uri://'], '0x'))
            .to.be.revertedWithCustomError(receipt, 'ErrInvalidArguments')
    })
    
    it('will revert when attacker will try to mint again with Reentrancy-Attack', async () => {
        const attacker = await getReMintAttackerMock(governance, receipt.address);
        await receipt.grantRole(await receipt.MINTER_ROLE(), attacker.address);

        await expect(receipt.mintReceipt(attacker.address, 123, 3, 100, 'uri://', '0x'))
            .to.be.revertedWith('ReentrancyGuard: reentrant call');
    })

    it('will revert when attacker will try to batch-mint again with Reentrancy-Attack', async () => {
        const attacker = await getReMintAttackerMock(governance, receipt.address);
        await receipt.grantRole(await receipt.MINTER_ROLE(), attacker.address);

        await attacker.setBatchOrNot(1);

        await expect(receipt.batchMintReceipt(attacker.address, [123], [3], [100], ['uri://'], '0x'))
            .to.be.revertedWith('ReentrancyGuard: reentrant call');
    })

    describe('can mint receipt tokens', async () => {
        const tokenId = 123,
            amount = 42,
            originalTokenId = 7
        ;

        let tx: ContractTransaction;

        beforeEach(async () => {
            tx = await receipt.mintReceipt(axel.address, tokenId, amount, originalTokenId, 'uri://', '0x')
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

        it('will have the right tokenUri', async () => {
            expect(await receipt.uri(tokenId)).to.eq('uri://');
        })

        it('will revert when we query uri for non-existing token', async () => {
            await expect(receipt.uri(404)).to.revertedWithCustomError(receipt, 'ErrTokenNotExists').withArgs(404);
        })

        it('will revert when fetch receiptData out of bounds', async () => {
            await expect(receipt.receiptData(tokenId, 1)).to.revertedWith('Index out of Bounds')
        })

        it('will not overwrite the tokenUri on second minting attempt of existing token-id', async () => {
            expect(receipt.mintReceipt(axel.address, tokenId, 123, originalTokenId, 'new-uri://', '0x'))
                .to.emit(receipt, 'TransferSingle')
                .withArgs(governance.address, ethers.constants.AddressZero, axel.address, tokenId, 123)

            expect(await receipt.uri(tokenId)).to.eq('uri://');
        })

        it('will not clear the tokenUri on second minting attempt of existing token-id', async () => {
            expect(receipt.mintReceipt(axel.address, tokenId, 123, originalTokenId, '', '0x'))
                .to.emit(receipt, 'TransferSingle')
                .withArgs(governance.address, ethers.constants.AddressZero, axel.address, tokenId, 123)

            expect(await receipt.uri(tokenId)).to.eq('uri://');
        })

        it('will receive base URI when not set specifically per token-id', async () => {
            await receipt.setURI('uri://berlin');
            await receipt.mintReceipt(axel.address, 444, amount, originalTokenId, '', '0x')

            expect(await receipt.uri(444)).to.eq('uri://berlin');
        })

    })
});

