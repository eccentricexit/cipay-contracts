// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
const hre = require("hardhat");

async function main() {
  const l2Wallet = (await hre.ethers.getSigners())[0];
  console.info("Your wallet address:", l2Wallet.address);

  // We get the contract to deploy
  const MetaTxRelay = await (
    await ethers.getContractFactory("MetaTxRelay")
  ).connect(l2Wallet);
  const chainId = await ethers.provider.getSigner().getChainId();
  console.info("chainId", chainId);

  console.info("Deploying MetaTxRelay contract to Arbitrum");
  const metaTxRelay = await MetaTxRelay.deploy(chainId);
  await metaTxRelay.deployed();
  console.info(`MetaTxRelay contract is deployed to ${metaTxRelay.address}`);

  // DAI token on Arbitrum Mainnet
  const DAI_ADDRESS = "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1";

  const tx = await metaTxRelay.setTokenAccepted(DAI_ADDRESS, true);
  tx.wait();
  console.info(`Whitelisted token ${DAI_ADDRESS}`);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
