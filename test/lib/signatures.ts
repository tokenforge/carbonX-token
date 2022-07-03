import {BigNumberish, Signer} from "ethers";
import {ethers} from "hardhat";
import {CarbonX} from "../../typechain";


export const createSignature = async (
    token: CarbonX,
    to: string,
    tokenId: BigNumberish,
    amount: BigNumberish,
    hash: string,
    signerAccount: Signer,
) => {
    let message = '';

    if(hash == '') {
        message = await token["createMessage(address,uint256,uint256)"](to, tokenId, amount)
    } else {
        message = await token["createMessage(address,uint256,uint256,string)"](to, tokenId, amount, hash)
    }
    return await signerAccount.signMessage(ethers.utils.arrayify(message));
};

