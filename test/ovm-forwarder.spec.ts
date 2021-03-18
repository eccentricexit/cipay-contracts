import { l2ethers as ethers } from 'hardhat'
import { Contract } from 'ethers'
import { expect } from 'chai';

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
      name: 'MetaTxProxy',
      version: '1.0.0',
      chainId,
      verifyingContract,
    },
    primaryType: 'ForwardRequest',
  }
};

async function buildRequest(MetaTxProxy, input) {
  const nonce = await MetaTxProxy.nonces(input.from).then(nonce => nonce.toString());
  return { value: 0, gas: 1e6, nonce, ...input };
}

async function buildTypedData(MetaTxProxy, request) {
  // const chainId = await MetaTxProxy.provider.getNetwork().then(n => n.chainId);
  // For some reason the chain id in the EVM is still the outdated 420 and differs
  // from the value returned by the provider so we hardcode it instead of querying it.
  const chainId = 420
  const typeData = getMetaTxTypeData(chainId, MetaTxProxy.address);
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

describe('Optimistic MetaTxProxy', () => {
  const name = 'ETH'
  const initialSupply = 10000000
  const jsonRpcSigner = ethers.provider.getSigner()

  let ERC20: Contract
  let MetaTxProxy: Contract
  beforeEach(async () => {
    ERC20 = await (await ethers.getContractFactory('ERC20'))
      .connect(jsonRpcSigner)
      .deploy(initialSupply, name)

    MetaTxProxy = await (await ethers.getContractFactory('MetaTxProxy'))
      .connect(jsonRpcSigner)
      .deploy()
  })

  describe('transferFrom', () => {
    it('should succeed when the sender has enough balance and the sender has a large enough allowance', async () => {
      const amount = 2500000
      await MetaTxProxy.setWhitelisted(ERC20.address, true)
      await ERC20.approve(await MetaTxProxy.address, amount)
      const [, receiver] = await ethers.getSigners()
      const receiverAddress = await receiver.getAddress()

      const balanceBefore = Number(await ERC20.balanceOf(receiverAddress))

      const from = await jsonRpcSigner.getAddress();
      const data = ERC20.interface.encodeFunctionData('transferFrom', [from, receiverAddress, amount])
      const request = await buildRequest(MetaTxProxy, { to: ERC20.address, from, data });
      const toSign = await buildTypedData(MetaTxProxy, request);
      const signature = await signTypedData(jsonRpcSigner.provider, from, toSign)

      expect(await MetaTxProxy.verify(request, signature), 'signature validation failed').to.be.true

      await MetaTxProxy.execute(request, signature)
      const balanceAfter = Number(await ERC20.balanceOf(receiverAddress))

      expect(balanceAfter, 'receiver should have received tokens').to.be.greaterThan(balanceBefore)
    })
  })
})
