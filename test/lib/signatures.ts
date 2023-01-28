// SPDX-License-Identifier: MIT
// (C) by TokenForge GmbH, Berlin
// Author: Hagen Hübel, hagen@token-forge.io
/**
 * @dev Learn more about this on https://token-forge.io
 

 _______    _              ______                   
|__   __|  | |            |  ____|                  
   | | ___ | | _____ _ __ | |__ ___  _ __ __ _  ___ 
   | |/ _ \| |/ / _ \ '_ \|  __/ _ \| '__/ _` |/ _ \
   | | (_) |   <  __/ | | | | | (_) | | | (_| |  __/
   |_|\___/|_|\_\___|_| |_|_|  \___/|_|  \__, |\___|
                                          __/ |     
                                         |___/      

 */

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

