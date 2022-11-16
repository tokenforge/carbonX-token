import { config as dotEnvConfig } from "dotenv";


import "@nomicfoundation/hardhat-toolbox";
import "hardhat-deploy";

dotEnvConfig();

import { HardhatUserConfig } from "hardhat/types";

import "solidity-coverage";
import "hardhat-gas-reporter";

import {node_url, accounts, addForkConfiguration} from './utils/network';

const INFURA_API_KEY = process.env.INFURA_API_KEY || '';
const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY || '';

const PRIVATE_KEY_MAINNET = process.env.PRIVATE_KEY_MAINNET || '';

const config: HardhatUserConfig = {
    defaultNetwork: 'hardhat',
    solidity: {
        compilers: [{
            version: '0.8.6', settings: {
                optimizer: {
                    enabled: true,
                    runs: 2000,
                },
            }
        }],
    },

    namedAccounts: {
        deployer: 0,
        admin: 0,
        backend: 1,
    },

    networks: addForkConfiguration({

        hardhat: {
            initialBaseFeePerGas: 0, // to fix : https://github.com/sc-forks/solidity-coverage/issues/652, see https://github.com/sc-forks/solidity-coverage/issues/652#issuecomment-896330136
        },
        localhost: {
            url: node_url('localhost'),
            accounts: accounts(),
        },
        staging: {
            url: node_url('rinkeby'),
            accounts: accounts('rinkeby'),
        },

        rinkeby: {
            url: node_url('rinkeby'),
            accounts: accounts('rinkeby'),
            gas: 2100000,
            gasPrice: 8000000000
        },
        mumbai: {
            url: node_url('polygon-mumbai'),
            accounts: accounts('mumbai'),
        },
        matic: {
            url: node_url('polygon-matic'),
            accounts: accounts('matic'),
        },
        kovan: {
            url: node_url('kovan'),
            accounts: accounts('kovan'),
        },
        goerli: {
            url: node_url('goerli'),
            accounts: accounts('goerli'),
        },
        fuji: {
            url: 'https://api.avax-test.network/ext/bc/C/rpc',
            gasPrice: 225000000000,
            chainId: 43113,
            accounts: accounts('fuji'),
        },
        avalanche: {
            url: 'https://api.avax.network/ext/bc/C/rpc',
            gasPrice: 225000000000,
            chainId: 43114,
            accounts: accounts('fuji'),
        }
    }),
    etherscan: {
        // Your API key for Etherscan
        // Obtain one at https://etherscan.io/
        apiKey: ETHERSCAN_API_KEY,
    },

    paths: {
        sources: "./contracts",
        artifacts: "./artifacts",
        cache: "./cache"
    },

    typechain: {
        outDir: 'typechain',
        target: 'ethers-v5',
    },
    mocha: {
        timeout: 0,
    },
    external: process.env.HARDHAT_FORK
        ? {
            deployments: {
                // process.env.HARDHAT_FORK will specify the network that the fork is made from.
                // these lines allow it to fetch the deployments from the network being forked from both for node and deploy task
                hardhat: ['deployments/' + process.env.HARDHAT_FORK],
                localhost: ['deployments/' + process.env.HARDHAT_FORK],
            },
        }
        : undefined,

};

export default config;
