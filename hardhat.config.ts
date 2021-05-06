import { HardhatUserConfig } from 'hardhat/types'

import '@nomiclabs/hardhat-ethers'
import '@nomiclabs/hardhat-waffle'
import '@eth-optimism/plugins/hardhat/compiler'
import '@eth-optimism/plugins/hardhat/ethers'

import dotenv from 'dotenv-safe'
dotenv.config()

const config: HardhatUserConfig = {
  solidity: "0.7.6",
  ovm: {
    solcVersion: '0.7.6' // Your version goes here.
  },
  networks: {
    optimism: {
      url: process.env.L2_NODE_URL || 'http://localhost:8545',
      accounts: [process.env.PRIVATE_KEY],
      gasPrice: 0,
      gas: 9000000
    }
  },
};

export default config
