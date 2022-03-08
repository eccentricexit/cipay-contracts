// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.7.6;

import "./interfaces/AggregatorV3Interface.sol";

/**
 * Emits an event when receiving native payments.
 */
contract PaymentNotifier {
    AggregatorV3Interface public priceFeed;
    address payable public wallet;

    event PaymentReceived(
        string indexed _data,
        address indexed _payer,
        int256 _agreedBasePrice
    );

    constructor(address _priceFeed) {
        wallet = msg.sender;
        priceFeed = AggregatorV3Interface(_priceFeed);
    }

    function requestPayment(string memory _data, int256 _agreedBasePrice)
        external
        payable
    {
        (, int256 latestRoundPrice, , , ) = priceFeed.latestRoundData();
        require(latestRoundPrice == _agreedBasePrice, "Price should match");

        emit PaymentReceived(_data, msg.sender, _agreedBasePrice);
        wallet.transfer(msg.value);
    }
}
