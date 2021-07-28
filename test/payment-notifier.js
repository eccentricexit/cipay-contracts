const { expect } = require("chai");

describe('PaymentNotifier', () => {
  let account1
  let account2
  let paymentNotifier
  let oracle
  before(async () => {
    ;[account1, account2] = await ethers.getSigners()
    oracle = await (await ethers.getContractFactory('TestAggregatorV3'))
      .connect(account1)
      .deploy()
    paymentNotifier = await (await ethers.getContractFactory('PaymentNotifier'))
      .connect(account1)
      .deploy(oracle.address)
  })

  describe('Basic test', () => {
    it('should emit an event and forward payment', async () => {
      const balanceBefore = await ethers.provider.getBalance(account1.address)

      const { answer: agreedBasePrice } = await oracle.latestRoundData()
      paymentNotifier = paymentNotifier.connect(account2)
      const tx = await paymentNotifier.requestPayment('test', agreedBasePrice, { value: '1' })
      const minedTX = await tx.wait();

      const balanceAfter = await ethers.provider.getBalance(account1.address)

      expect(minedTX.logs.length).to.equal(1)
      expect(balanceAfter.gt(balanceBefore)).to.be.true
    })

  })
})
