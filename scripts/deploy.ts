import { l2ethers as ethers } from 'hardhat'

async function main () {
  console.log('network:', await ethers.provider.getNetwork())

  const signer = (await ethers.getSigners())[0]
  console.log('signer:', await signer.getAddress())

  // Deploy dummy ERC20 token contract.
  const ERC20 = await ethers.getContractFactory('ERC20', {
    signer: (await ethers.getSigners())[0]
  })

  const name = 'WETH'
  const initialSupply = 10000000
  const erc20 = await ERC20.deploy(initialSupply, name)
  await erc20.deployed()

  console.log('ERC20 deployed to:', erc20.address)

  // Deploy meta tx proxy.
  const MetaTxProxy = await ethers.getContractFactory('MetaTxProxy', {
    signer: (await ethers.getSigners())[0]
  })

  const metaTxProxy = await MetaTxProxy.deploy()
  await metaTxProxy.deployed()

  console.log('MetaTxProxy deployed to:', metaTxProxy.address)

  // Whitelist erc20 and authorize transferFrom.
  await metaTxProxy.setWhitelisted(erc20.address, true);
  console.info('ERC20 whitelisted.')
  const approveAmount = 100
  await erc20.approve(metaTxProxy.address, approveAmount);

  console.info('Approved proxy for ', approveAmount)
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error)
    process.exit(1)
  })
