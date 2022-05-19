const { ethers } = require("ethers");

async function test() {
    
    const INFURA_PROJECT_ID='8b77384418fb4e41bb89d5c3f9737e2a'
    const INFURA_PROJECT_SECRET='086ac25e3bc74a77ac24e4ba0fc9d33e'

//    const wallet = new ethers.Wallet('d7985c0154e6d6bf694b71ae4f98e2d6471c99699fd827ddf5b949ddbc2e906a', web3Provider)

    const abi = [
        'function createMessage(address to, uint256 tokenId, uint256 amount, string memory tokenUri) public view returns (bytes32)',
        'function create(address to, uint256 tokenId, uint256 amount, string memory tokenUri, bytes memory signature) public'
    ]

    const providerInfuraRinkey = new ethers.providers.InfuraProvider(4, {
        projectId: INFURA_PROJECT_ID,
        projectSecret: INFURA_PROJECT_SECRET,
    });
    
    const providerInfura = new ethers.providers.InfuraProvider(80001, {
        projectId: INFURA_PROJECT_ID,
        projectSecret: INFURA_PROJECT_SECRET,
    });

    const contractRinkeby= new ethers.Contract('0x6C392b147761284d5F198702C468888776af8EAc', abi, providerInfuraRinkey)
    const sig = await contractRinkeby.createMessage('0x921BF4a560EC72cE238Ec443180090C2d8e4F554', 1, 100, 'ipfs://test.jpg')
    console.log(sig);
    
    const contractMumbai= new ethers.Contract('0x9b88e82c175A089aeeA38688b25A808d0c71F083', abi, providerInfura)

    const sig2 = await contractMumbai.createMessage('0x921BF4a560EC72cE238Ec443180090C2d8e4F554', 1, 100, 'ipfs://test.jpg')
    console.log(sig2);

}



const f = async () => {
    await test()
}

f();
