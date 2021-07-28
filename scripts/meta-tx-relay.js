// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
const hre = require("hardhat");

async function main() {
  // Hardhat always runs the compile task when running scripts with its command
  // line interface.
  //
  // If this script is run directly using `node` you may want to call compile
  // manually to make sure everything is compiled
  await hre.run('compile');

  // We get the contract to deploy
  const MetaTxRelay = await hre.ethers.getContractFactory("MetaTxRelay");
  const chainId = await ethers.provider.getSigner().getChainId()
  const metaTxRelay = await MetaTxRelay.deploy(chainId);

  await metaTxRelay.deployed();
  console.info("MetaTxRelay deployed to:", metaTxRelay.address);

  const name = 'TestToken'
  const symbol = 'TT'
  const initialSupply = 10000000
  erc20 = await (await ethers.getContractFactory('TestToken'))
    .deploy(initialSupply, name, symbol)

  await erc20.deployed();

  const tx = await metaTxRelay.setTokenAccepted(erc20.address, true)
  tx.wait()
  console.info(`Whitelisted token ${erc20.address}`)
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
