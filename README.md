# CarbonX Token Contracts + Vaults for Retirement

## Installation / Setup

Installation requires a working node-environment including npm.

### Install Prerequisites:

```
npm install
```

or

```
yarn install
```


### Build everything:


```
yarn build && yarn test
```


### Run unit tests:

```
yarn test
```


## Deployment

### Testnet 

Deployment:


```
npx hardhat run scripts/deploy.js --network fuji
```

Verification:

```

```

```
npx hardhat verify --network rinkeby DEPLOYED_CONTRACT_ADDRESS 0x.....
```

## Work with smart contract

### hardhat console

```
npx hardhat console --network fuji
```


Mint token:

```
await token.mint('0xC1dAe5cE49F.....', new hardhat.ethers.BigNumber.from('123456789000000000000000'));
```
