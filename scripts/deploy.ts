import { l2ethers as ethers } from 'hardhat'

async function main () {
  console.log('network:', await ethers.provider.getNetwork())

  const signer = (await ethers.getSigners())[0]
  console.log('signer:', await signer.getAddress())

  // Deploy meta tx proxy.
  const MetaTxProxy = await ethers.getContractFactory('GenericMetaTxProcessor', {
    signer: (await ethers.getSigners())[0]
  })

  const metaTxProxy = await MetaTxProxy.deploy()
  await metaTxProxy.deployed()

  console.log('MetaTxProxy deployed to:', metaTxProxy.address)
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error)
    process.exit(1)
  })
