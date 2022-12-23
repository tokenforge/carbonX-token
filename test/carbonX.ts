import {ethers} from 'hardhat';
import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';

import {SignerWithAddress} from '@nomiclabs/hardhat-ethers/signers';

import {BigNumber, BigNumberish} from "ethers";
import {CarbonX, CarbonX__factory} from "../typechain";
import {createSignature} from "./lib/signatures";
import {keccak256, toUtf8Bytes} from "ethers/lib/utils";

chai.use(chaiAsPromised);
const {expect} = chai;

describe('CarbonX BasicTests', () => {
    let
        axel: SignerWithAddress,
        ben: SignerWithAddress,
        chantal: SignerWithAddress,
        governance: SignerWithAddress,
        backend: SignerWithAddress,
        tokenFactory: CarbonX__factory;

    beforeEach(async () => {
        [axel, ben, chantal, governance, backend] = await ethers.getSigners();

        tokenFactory = (await ethers.getContractFactory('CarbonX', governance)) as CarbonX__factory;
    });

    it('Will deny a zero-address for signer on ctor', async () => {
        await expect(tokenFactory.deploy("Token", ethers.constants.AddressZero, 'ipfs://'))
            .to.be.revertedWithCustomError(tokenFactory, 'ErrSignerMustNotBeZeroAddress');
    })

    describe('Basic Tests', () => {
        let token: CarbonX;

        beforeEach(async () => {
            token = await tokenFactory.deploy("Token", backend.address, 'ipfs://');
            await token.deployed();

            expect(token.address).to.properAddress;
        });
        
        it('Has the right name', async() => {
            expect(await token.name()).to.eq('Token');
        })

        it('reverts when changing signer to zero-address', async () => {
            await expect(token.setSigner(ethers.constants.AddressZero))
                .to.be.revertedWithCustomError(tokenFactory, 'ErrSignerMustNotBeZeroAddress');
        })

        it('reverts when changing signer as non-owner', async () => {
            const benAsSigner = token.connect(ben);
            await expect(benAsSigner.setSigner(ben.address))
                .to.be.revertedWith("Ownable: caller is not the owner")
        })

        it('wont emit events when signer will bre replaced with itself', async () => {
            await expect(token.setSigner(await token.getSigner()))
                .to.not.emit(token, 'SignerChanged')
        })

        it('governance can change signer account', async () => {
            await expect(token.setSigner(axel.address))
                .to.emit(token, 'SignerChanged')
                .withArgs(backend.address, axel.address);
        })

        // 4
        describe('we can create and mint tokens', async () => {
            const
                tokenId = 1001,
                amount = 1,
                maxSupply = 100,
                hash = 'NgcFOAfYXwVrmQrUOyB0U5kWU4w1a8Gf2gPPTPBrGTqTl-6qe7ERStbEMamFV4niv1bhFKI5167vzMLApLOEBs0ArvvUiClrRAFb=w600';

            let sigForAxel: string,
                axelAsMinter: CarbonX,
                chantalAsMinter: CarbonX;

            beforeEach(async () => {
                sigForAxel = await createSignature(token, axel.address, tokenId, amount, hash, backend);
                axelAsMinter = token.connect(axel);
                chantalAsMinter = token.connect(chantal);
            })

            it('should create tokens to Axel successfully', async () => {
                const totalSupplyBefore = await token.totalSupply(tokenId);

                const balanceBefore = await token.balanceOf(axel.address, tokenId);
                expect(balanceBefore).to.eq(0);

                await expect(axelAsMinter.create(axel.address, tokenId, amount, maxSupply, hash, sigForAxel))
                    .to.emit(token, 'TransferSingle')
                    .withArgs(axel.address, ethers.constants.AddressZero, axel.address, tokenId, amount)
                    .to.not.emit(token, 'TokenUriChanged')

                const balance = await token.balanceOf(axel.address, tokenId);
                expect(balance).to.eq(1);

                const totalSupply = await token.totalSupply(tokenId);
                expect(totalSupply).to.eq(totalSupplyBefore.add(amount));

                const uri = await token.uri(tokenId);
                expect(uri).to.eq(hash);
            });

            it('should create tokens to Axel successfully although tokenUri is empty', async () => {
                const emptyUrl = '';
                const newSigForAxel = await createSignature(token, axel.address, tokenId, amount, emptyUrl, backend);
                await expect(axelAsMinter.create(axel.address, tokenId, amount, maxSupply, emptyUrl, newSigForAxel))
                    .to.emit(token, 'TransferSingle')
                    .withArgs(axel.address, ethers.constants.AddressZero, axel.address, tokenId, amount)
                    .to.not.emit(token, 'TokenUriChanged')


                const uri = await token.uri(tokenId);
                expect(uri).to.eq(emptyUrl);
            });

            it('should fail when creating tokens will happen with invalid signature', async () => {
                const otherUrl = '';
                const newSigForAxel = await createSignature(token, axel.address, tokenId, amount, otherUrl, backend);

                await expect(axelAsMinter.create(axel.address, tokenId, amount, maxSupply, hash, newSigForAxel))
                    .to.be.revertedWithCustomError(token, 'ErrInvalidSignature');
            });


            it('will emit an event when tokenUri get changed', async () => {
                await axelAsMinter.create(axel.address, tokenId, amount, maxSupply, hash, sigForAxel)

                const newUri = 'uri://new';

                await expect(token.setTokenUri(tokenId, newUri))
                    .to.emit(token, 'TokenUriChanged')
                    .withArgs(tokenId, keccak256(toUtf8Bytes(hash)), keccak256(toUtf8Bytes(newUri)))

                const uri = await token.uri(tokenId);
                expect(uri).to.eq(newUri);
            });

            it('will revert when tokenUri will be changed by notOwner', async () => {
                await axelAsMinter.create(axel.address, tokenId, amount, maxSupply, hash, sigForAxel)

                const newUri = 'uri://new';

                await expect(token.connect(ben).setTokenUri(tokenId, newUri))
                    .to.be.revertedWith('Ownable: caller is not the owner')
            });

            it('should revert when re-creating same token', async () => {
                await axelAsMinter.create(axel.address, tokenId, amount, maxSupply, hash, sigForAxel);

                await expect(axelAsMinter.create(axel.address, tokenId, amount, maxSupply, hash, sigForAxel))
                    .to.be.revertedWithCustomError(token, 'ErrTokenAlreadyExists')
                    .withArgs(tokenId)
            });

            it('should revert if amount is greater than max supply', async () => {
                const balanceBefore = await token.balanceOf(axel.address, tokenId);
                expect(balanceBefore).to.eq(0);

                await expect(axelAsMinter.create(axel.address, tokenId, amount, amount - 1, hash, sigForAxel))
                    .to.be.revertedWithCustomError(token, 'ErrInitialSupplyGreaterThanNaxSupply')
                    .withArgs(tokenId, amount, amount - 1)
            });

            it('should not be able to mint exceeding max supply', async () => {
                const balanceBefore = await token.balanceOf(axel.address, tokenId);
                expect(balanceBefore).to.eq(0);

                await axelAsMinter.create(axel.address, tokenId, amount, maxSupply, hash, sigForAxel);

                const sigForBen = await createSignature(token, ben.address, tokenId, maxSupply, '', backend);
                await expect(axelAsMinter.mintTo(ben.address, tokenId, maxSupply, sigForBen))
                    .to.be.revertedWithCustomError(token, 'ErrMintWouldViolateMaxTokenSupply')
                    .withArgs(tokenId, amount + maxSupply, maxSupply)
            });

            it('minting of un-created token will be reverted', async () => {
                const sigForBen = await createSignature(token, ben.address, tokenId, 5, '', backend);
                await expect(axelAsMinter.mintTo(ben.address, tokenId, 5, sigForBen))
                    .to.be.revertedWithCustomError(token, 'ErrTokenNotExists')
                    .withArgs(tokenId)
            });

            describe('minting tokens', async () => {

                let totalSupplyBefore: BigNumber, balanceBefore: BigNumber; 

                beforeEach( async () => {
                    totalSupplyBefore = await token.totalSupply(tokenId);

                    balanceBefore = await token.balanceOf(ben.address, tokenId);
                    await axelAsMinter.create(axel.address, tokenId, amount, maxSupply, hash, sigForAxel);
                })
                
                it('can mint more tokens to Others successfully', async () => {
                    expect(balanceBefore).to.eq(0);

                    const sigForBen = await createSignature(token, ben.address, tokenId, 5, '', backend);
                    await expect(axelAsMinter.mintTo(ben.address, tokenId, 5, sigForBen))
                        .to.emit(token, 'TransferSingle')
                        .withArgs(axel.address, ethers.constants.AddressZero, ben.address, tokenId, 5);

                    const balanceAxel = await token.balanceOf(axel.address, tokenId);
                    expect(balanceAxel).to.eq(amount);

                    const balanceBen = await token.balanceOf(ben.address, tokenId);
                    expect(balanceBen).to.eq(5);

                    const totalSupply = await token.totalSupply(tokenId);
                    expect(totalSupply).to.eq(totalSupplyBefore.add(amount + 5));
                });

                it('will fail when minting will happen with invalid signature', async () => {
                    const sigForBen = await createSignature(token, ben.address, tokenId, 6, '', backend);
                    
                    await expect(axelAsMinter.mintTo(ben.address, tokenId, 5, sigForBen))
                        .to.be.revertedWithCustomError(token, 'ErrInvalidSignature');
                });

                it('let me mint my tokens with a signature', async () => {
                    expect(balanceBefore).to.eq(0);

                    const sigForBen = await createSignature(token, ben.address, tokenId, 10, '', backend);
                    const benAsMinter = token.connect(ben);
                    
                    await expect(benAsMinter.mint(tokenId, 10, sigForBen))
                        .to.emit(token, 'TransferSingle')
                        .withArgs(ben.address, ethers.constants.AddressZero, ben.address, tokenId, 10);
                });

            })

            it('reverts when I try to mint not-existing tokens', async () => {
                const sigForBen = await createSignature(token, ben.address, tokenId, 10, '', backend);
                const benAsMinter = token.connect(ben);

                await expect(benAsMinter.mint(tokenId + 123, 10, sigForBen))
                    .to.be.revertedWithCustomError(token, 'ErrTokenNotExists')
                    .withArgs(tokenId + 123)
            });


        });

    })
});

export function ether(e: BigNumberish): BigNumber {
    return ethers.utils.parseUnits(e.toString(), 'ether');
}

