// SPDX-License-Identifier: MIT
// Adapted from from OpenZeppelin's.

pragma solidity >0.6.0 <0.8.0;
pragma abicoder v2;

import "./utils/ECDSA.sol";
import "./utils/EIP712.sol";

/*
 * @dev Simple minimal meta transaction relay.
 */
contract MinimalForwarder is EIP712 {
    using ECDSA for bytes32;

    struct ForwardRequest {
        address from;
        address to;
        uint256 value;
        uint256 gas;
        uint256 nonce;
        bytes data;
    }

    bytes32 public immutable TYPEHASH = keccak256("ForwardRequest(address from,address to,uint256 value,uint256 gas,uint256 nonce,bytes data)");

    mapping(address => uint256) public nonces;
    mapping(address => bool) public whitelisted;
    address public governor;

    event CallExecuted(bool success, bytes returndata);
    event WhitelistUpdated(address _address, bool _whitelisted);

    constructor() EIP712("MinimalForwarder", "0.0.1") {}

    function verify(ForwardRequest calldata req, bytes calldata signature) public view returns (bool) {
        address signer = hashTypedDataV4(keccak256(abi.encode(
            TYPEHASH,
            req.from,
            req.to,
            req.value,
            req.gas,
            req.nonce,
            keccak256(req.data)
        ))).recover(signature);
        return nonces[req.from] == req.nonce && signer == req.from;
    }

    function execute(ForwardRequest calldata req, bytes calldata signature) public payable {
        require(verify(req, signature), "MinimalForwarder: signature does not match request");
        require(whitelisted[req.to], "Destination address not whitelisted.");
        nonces[req.from] = req.nonce + 1;

        // solhint-disable-next-line avoid-low-level-calls
        (bool success, bytes memory returndata) = req.to.call{gas: req.gas, value: req.value}(abi.encodePacked(req.data, req.from));
        // Validate that the relayer has sent enough gas for the call.
        // See https://ronan.eth.link/blog/ethereum-gas-dangers/
        assert(gasleft() > req.gas / 63);

        emit CallExecuted(success, returndata);
    }

    function setWhitelisted(address _address, bool _whitelisted) external {
        require(msg.sender == governor, "Only the governor can call this.");
        whitelisted[_address] = _whitelisted;

        emit WhitelistUpdated(_address, _whitelisted);
    }
}
