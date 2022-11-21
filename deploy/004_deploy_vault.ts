import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
    const {deployments, getNamedAccounts} = hre;
    const {deploy, execute, log} = deployments;

    const {deployer} = await getNamedAccounts();
    console.log("Deployer", deployer)

    const carbonX = await deployments.get('CarbonX');
    
    const carbonReceiptToken = await deployments.get('CarbonReceipt55');
    console.log("Using CarbonReceipt: " + carbonReceiptToken.address);
    
    const instance = await deploy('CarbonVault', {
        from: deployer,
        args: [carbonReceiptToken.address, carbonX.address],
        log: true,
        autoMine: true, // speed up deployment on local network (ganache, hardhat), no effect on live networks
    });

    log("Vault: " + instance.address);

    // The transaction that was sent to the network to deploy the Contract
    log("- Transaction: " + instance.transactionHash);

    log("Ready.");

    const minterRole = '0x9f2df0fed2c77648de5860a4cc508cd0818c85b8b8a1ab4ceeef8d981c8956a6'; 
    await execute('CarbonReceipt55', {from: deployer, log: true}, 'grantRole', minterRole, instance.address);
    
};
export default func;
func.dependencies = ['CarbonVault'];
