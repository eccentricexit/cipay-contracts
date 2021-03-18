import { l2ethers as ethers } from 'hardhat'
import { Contract } from 'ethers'

const EIP712Domain = [
  { name: 'name', type: 'string' },
  { name: 'version', type: 'string' },
  { name: 'chainId', type: 'uint256' },
  { name: 'verifyingContract', type: 'address' }
];

const ForwardRequest = [
  { name: 'from', type: 'address' },
  { name: 'to', type: 'address' },
  { name: 'value', type: 'uint256' },
  { name: 'gas', type: 'uint256' },
  { name: 'nonce', type: 'uint256' },
  { name: 'data', type: 'bytes' },
];

function getMetaTxTypeData(chainId, verifyingContract) {
  return {
    types: {
      EIP712Domain,
      ForwardRequest,
    },
    domain: {
      name: 'MinimalForwarder',
      version: '0.0.1',
      chainId,
      verifyingContract,
    },
    primaryType: 'ForwardRequest',
  }
};

async function buildRequest(MinimalForwarder, input) {
  const nonce = await MinimalForwarder.nonces(input.from).then(nonce => nonce.toString());
  return { value: 0, gas: 1e6, nonce, ...input };
}

async function buildTypedData(MinimalForwarder, request) {
  // const chainId = await MinimalForwarder.provider.getNetwork().then(n => n.chainId);
  // For some reason the chain id in the EVM is still the outdated 420 and differs
  // from the value returned by the provider so we hardcode it instead of querying it.
  const chainId = 420
  const typeData = getMetaTxTypeData(chainId, MinimalForwarder.address);
  return { ...typeData, message: request };
}

async function signTypedData(provider, from, toSign) {
  // Otherwise, send the signTypedData RPC call
  // Note that hardhatvm and metamask require different EIP712 input
  const isHardhat = toSign.domain.chainId == 31337 || toSign.domain.chainId === 420;
  const [method, argData] = isHardhat
    ? ['eth_signTypedData', toSign]
    : ['eth_signTypedData_v4', JSON.stringify(toSign)]

  return await provider.send(method, [from, argData]);
}

const signer = ethers.provider.getSigner()

describe('Optimistic MinimalForwarder', () => {
  const name = 'ETH'
  const initialSupply = 10000000

  let ERC20: Contract
  let MinimalForwarder: Contract
  beforeEach(async () => {
    ERC20 = await (await ethers.getContractFactory('ERC20'))
      .connect(signer)
      .deploy(initialSupply, name)

    MinimalForwarder = await (await ethers.getContractFactory('MinimalForwarder'))
      .connect(signer)
      .deploy()
  })

  describe('transferFrom', () => {
    it('should succeed when the signer has enough balance and the sender has a large enough allowance', async () => {
      const amount = 2500000

      await ERC20.connect(signer).approve(await MinimalForwarder.address, amount)
      const from = await signer.getAddress();
      const to = ERC20.address;
      const data = ERC20.interface.encodeFunctionData('transferFrom', [from, to, amount])

      const request = await buildRequest(MinimalForwarder, { to, from, data });
      const toSign = await buildTypedData(MinimalForwarder, request);
      const signature = await signTypedData(signer.provider, from, toSign)

      await MinimalForwarder.verify(request, signature)

    })
  })
})
