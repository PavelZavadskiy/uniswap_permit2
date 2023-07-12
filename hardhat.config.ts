// import { HardhatUserConfig } from 'hardhat/config';
// import '@nomicfoundation/hardhat-toolbox';

import * as dotenv from 'dotenv';
dotenv.config();

import '@nomiclabs/hardhat-truffle5';
import '@nomiclabs/hardhat-etherscan';
import '@nomiclabs/hardhat-ethers';
import '@nomiclabs/hardhat-waffle';
//require('@nomiclabs/hardhat-toolbox');
require('@nomiclabs/hardhat-web3');
require('solidity-coverage');

module.exports = {
  solidity: {
    version: '0.8.17',
    settings: {
      optimizer: {
        enabled: true,
        runs: 1000,
      },
      viaIR: true,
    },
  },

  mocha: {
    timeout: 50000,
  },
};
