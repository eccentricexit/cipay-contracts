require("@nomiclabs/hardhat-waffle");

// This is a sample Hardhat task. To learn how to create your own go to
// https://hardhat.org/guides/create-task.html
task("accounts", "Prints the list of accounts", async (taskArgs, hre) => {
  const accounts = await hre.ethers.getSigners();

  for (const account of accounts) {
    console.log(account.address);
  }
});

// You need to export an object to set up your config
// Go to https://hardhat.org/config/ to learn more

const rinkeby = {
  url: `https://rinkeby.infura.io/v3/${process.env.INFURA_PROJECT_ID}`,
  accounts: [process.env.DEPLOYER_KEY]
}

const rinkebyArbitrum = {
  url: `https://rinkeby.arbitrum.io/rpc`,
  gasLimit: 800000,
  gasPrice: 0,
  accounts: [process.env.DEPLOYER_KEY]
}

const configuration = {
  solidity: "0.7.6",
  networks: {
    hardhat: {
      chainId: 1337
    },
  }
};

if (process.env.DEPLOYER_KEY)
  configuration.networks.rinkebyArbitrum = rinkebyArbitrum

if (process.env.DEPLOYER_KEY && process.env.INFURA_PROJECT_ID)
  configuration.networks.rinkeby = rinkeby


module.exports = configuration