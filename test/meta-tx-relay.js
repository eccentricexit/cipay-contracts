const { expect } = require("chai");

const ERC20MetaTransaction = [
  { name: "from", type: "address" },
  { name: "to", type: "address" },
  { name: "tokenContract", type: "address" },
  { name: "amount", type: "uint256" },
  { name: "nonce", type: "uint256" },
  { name: "expiry", type: "uint256" },
];

describe("Test MetaTxRelay", () => {
  const name = "Ether";
  const symbol = "ETH";
  const initialSupply = 10000000;
  const jsonRpcSigner = ethers.provider.getSigner();

  let erc20;
  let metaTxRelay;
  beforeEach(async () => {
    erc20 = await (await ethers.getContractFactory("TestToken"))
      .connect(jsonRpcSigner)
      .deploy(initialSupply, name, symbol);

    const chainId = await ethers.provider.getSigner().getChainId();

    metaTxRelay = await (await ethers.getContractFactory("MetaTxRelay"))
      .connect(jsonRpcSigner)
      .deploy(chainId);
  });

  it("should succeed when the sender has enough balance and the sender has a large enough allowance", async () => {
    const amount = 2500000;
    const [sender, receiver] = await ethers.getSigners();
    await metaTxRelay.setTokenAccepted(erc20.address, true);
    await metaTxRelay.setWallet(receiver.address);
    await erc20.approve(await metaTxRelay.address, amount);

    const chainId = await metaTxRelay.provider
      .getNetwork()
      .then((n) => n.chainId);
    const to = await receiver.getAddress();
    const from = await sender.getAddress();

    const types = { ERC20MetaTransaction };
    const domain = {
      name: "MetaTxRelay",
      version: "1.0.0",
      chainId,
      verifyingContract: metaTxRelay.address,
    };
    const message = {
      from,
      to,
      tokenContract: erc20.address,
      amount,
      nonce: Number(await metaTxRelay.nonce(from)) + 1,
      expiry: Math.ceil(Date.now() / 1000 + 24 * 60 * 60),
    };

    const signature = await sender._signTypedData(domain, types, message);

    const callData = {
      from: message.from,
      to: message.to,
      signature,
    };
    const callParams = {
      tokenContract: message.tokenContract,
      amount: message.amount,
      nonce: message.nonce,
      expiry: message.expiry.toString(),
    };

    const balanceBefore = await erc20.balanceOf(to);
    const tx = await metaTxRelay.executeMetaTransaction(callData, callParams);
    await tx.wait();
    const balanceAfter = await erc20.balanceOf(to);
    expect(
      balanceBefore.lt(balanceAfter),
      `Receiver balance should've increased`
    ).to.be.true;
  });
});
