import { l2ethers as ethers } from 'hardhat'

async function main () {
  console.log('network:', await ethers.provider.getNetwork())

  const signer = (await ethers.getSigners())[0]
  console.log('signer:', await signer.getAddress())

  // Deploy dummy ERC20 token contract.
  const ERC20 = await ethers.getContractFactory('TestToken', {
    signer: (await ethers.getSigners())[0]
  })

  const name = 'TestToken'
  const symbol = 'TST'
  const initialSupply = (1000000000n*10n**18n).toString()
  const erc20 = await ERC20.deploy(initialSupply, name, symbol)
  await erc20.deployed()

  console.log('ERC20 deployed to:', erc20.address)

  // Deploy meta tx proxy.
  const MetaTxProxy = await ethers.getContractFactory('GenericMetaTxProcessor', {
    signer: (await ethers.getSigners())[0]
  })

  const metaTxProxy = await MetaTxProxy.deploy()
  await metaTxProxy.deployed()

  const ETH_ADDRESS = '0x4200000000000000000000000000000000000006'
  await metaTxProxy.setTokenAccepted(erc20.address, true)
  await metaTxProxy.setTokenAccepted(ETH_ADDRESS, true)


  console.log('MetaTxProxy deployed to:', metaTxProxy.address)
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error)
    process.exit(1)
  })
