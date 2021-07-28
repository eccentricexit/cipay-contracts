// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.7.6;

contract TestAggregatorV3 {
    function latestRoundData()
        external
        pure
        returns (
            uint80 roundId,
            int256 answer,
            uint256 startedAt,
            uint256 updatedAt,
            uint80 answeredInRound
        )
    {
        return (0, 20000000000000, 0, 0, 0);
    }
}
