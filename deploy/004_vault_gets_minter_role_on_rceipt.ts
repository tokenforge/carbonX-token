import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
    const {deployments, getNamedAccounts} = hre;
    const {deploy, execute, log} = deployments;

    const {deployer} = await getNamedAccounts();
    console.log("Deployer", deployer)

    const carbonReceiptToken = await deployments.get('CarbonReceipt');
    console.log("Using CarbonReceipt: " + carbonReceiptToken.address);

    const carbonVault = await deployments.get('CarbonVault');
    console.log("Using CarbonReceipt: " + carbonVault.address);
    
    const minterRole = '0x9f2df0fed2c77648de5860a4cc508cd0818c85b8b8a1ab4ceeef8d981c8956a6'; 
    await execute('CarbonReceipt', {from: deployer, log: true}, 'grantRole', minterRole, carbonVault.address);
    
};
export default func;
func.dependencies = ['TokenForge721', 'CarbonReceipt', 'CarbonVault'];
