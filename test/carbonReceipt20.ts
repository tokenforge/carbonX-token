import {ethers} from 'hardhat';
import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';

import {SignerWithAddress} from '@nomiclabs/hardhat-ethers/signers';

import {ContractTransaction} from "ethers";
import {
    CarbonReceipt20,
    CarbonReceipt20__factory,
} from "../typechain";

chai.use(chaiAsPromised);
const {expect} = chai;


describe('Carbon Receipt20 Tests', () => {
    let tokenFactory: CarbonReceipt20__factory,
        receipt: CarbonReceipt20,
        axel: SignerWithAddress,
        ben: SignerWithAddress,
        chantal: SignerWithAddress,
        governance: SignerWithAddress,
        backend: SignerWithAddress
    ;

    beforeEach(async () => {
        [axel, ben, chantal, governance, backend] = await ethers.getSigners();

        tokenFactory = (await ethers.getContractFactory('CarbonReceipt20', governance)) as CarbonReceipt20__factory;

        receipt = await tokenFactory.deploy('Receipt', 'R20');
    });

    it('has the right setup', async () => {
        expect(receipt.address).to.properAddress;
        expect(await receipt.name()).to.eq('Receipt');
        expect(await receipt.symbol()).to.eq('R20');
    })

    it('reverts when non-admins will try to release permissions', async () => {
        await expect(receipt.connect(ben).delegatePermissionsTo(ben.address))
            .to.be.revertedWithCustomError(receipt, `ErrAdminRoleRequired`).withArgs(ben.address);
    })

    it('wont reverts when an admin is trying to release permissions', async () => {
        await expect(receipt.connect(governance).delegatePermissionsTo(ben.address))
            .to.emit(receipt, 'RoleGranted')
            .withArgs(await receipt.MINTER_ROLE(), ben.address, governance.address)
    })

    it('supports the right interfaces', async () => {
        expect(await receipt.supportsInterface('0xffffffff')).to.be.false;
        //expect(await receipt.supportsInterface('0xd9b67a26')).to.be.true; // IERC1155
        expect(await receipt.supportsInterface('0x5a05180f')).to.be.true; // IAccessControlEnumerable
    })

    it('will revert when non-minter will try to mint', async () => {
        await expect(receipt.connect(chantal).mintReceipt(ben.address, 123, 1, 100, 'uri://', '0x'))
            .to.be.revertedWithCustomError(receipt, 'ErrMinterRoleRequired')
            .withArgs(chantal.address)
    })

    it('will revert when non-minter will try to batch.mint', async () => {
        await expect(receipt.connect(chantal).batchMintReceipt(ben.address, [123], [1], [100], ['uri://'], '0x'))
            .to.be.revertedWithCustomError(receipt, 'ErrMinterRoleRequired')
            .withArgs(chantal.address)
    })

    describe('can mint receipt tokens', async () => {

        const tokenId = 123,
            amount = 42,
            originalTokenId = 7
        ;

        it('mints receipts successfully', async () => {
            let tx: ContractTransaction = await receipt.mintReceipt(axel.address, tokenId, amount, originalTokenId, 'uri://', '0x')
            expect(tx)
                .to.emit(receipt, 'TransferSingle')
                .withArgs(governance.address, ethers.constants.AddressZero, axel.address, tokenId, amount)

        })

    })

});

