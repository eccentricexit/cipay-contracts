pragma solidity 0.7.6;
pragma abicoder v2;

import "./Libraries/BytesUtil.sol";
import "./Libraries/AddressUtils.sol";
import "./Libraries/SigUtil.sol";
import "./Libraries/SafeMath.sol";
import "./Interfaces/ERC1271.sol";
import "./Interfaces/ERC1271Constants.sol";
import "./Interfaces/ERC1654.sol";
import "./Interfaces/ERC1654Constants.sol";
import "./Interfaces/ERC20.sol";

contract GenericMetaTxProcessor is ERC1271Constants, ERC1654Constants {

    // ////////////// LIBRARIES /////////////////
    using SafeMath for uint256;
    using AddressUtils for address;
    // //////////////////////////////////////////

    bytes32 constant EIP712DOMAIN_TYPEHASH = keccak256(
        "EIP712Domain(string name,string version,address verifyingContract)"
    );
    bytes32 DOMAIN_SEPARATOR;

    bytes32 constant ERC20METATRANSACTION_TYPEHASH = keccak256(
        "ERC20MetaTransaction(address from,address to,address tokenContract,uint256 amount,bytes data,uint256 batchId,uint256 batchNonce,uint256 expiry,uint256 txGas,uint256 baseGas,address relayer)"
    );
    // //////////////////////////////////////////

    // //////////////// EVENTS //////////////////
    event MetaTx(
        address indexed from,
        uint256 indexed batchId,
        uint256 indexed batchNonce
    );
    // //////////////////////////////////////////

    // //////////////// STATE ///////////////////
    mapping(address => mapping(uint256 => uint256)) batches;
    // //////////////////////////////////////////

    constructor() {
        DOMAIN_SEPARATOR = keccak256(
            abi.encode(
                EIP712DOMAIN_TYPEHASH,
                keccak256("Generic Meta Transaction"),
                keccak256("1"),
                address(this)
            )
        );
    }

    struct Call {
        address from;
        address to;
        bytes data;
        bytes signature;
    }

    struct CallParams {
        address tokenContract;
        uint256 amount;
        uint256 batchId;
        uint256 batchNonce;
        uint256 expiry;
        uint256 txGas;
        uint256 baseGas;
        address relayer;
    }

    function executeMetaTransaction(
        Call memory callData,
        CallParams memory callParams
    ) public {
        require(
            callParams.relayer == address(0) || callParams.relayer == msg.sender,
            "wrong relayer"
        );
        require(block.timestamp < callParams.expiry, "expired");
        require(batches[callData.from][callParams.batchId] + 1 == callParams.batchNonce, "batchNonce out of order");

        bytes memory dataToHash = abi.encodePacked(
            "\x19\x01",
            DOMAIN_SEPARATOR,
            keccak256(
              abi.encode(
                ERC20METATRANSACTION_TYPEHASH,
                callData.from,
                callData.to,
                callParams.tokenContract,
                callParams.amount,
                keccak256(callData.data),
                callParams.batchId,
                callParams.batchNonce,
                callParams.expiry,
                callParams.txGas,
                callParams.baseGas,
                callParams.relayer
              )
            )
        );
        require(SigUtil.recover(keccak256(dataToHash), callData.signature) == callData.from, "signer != from");
        batches[callData.from][callParams.batchId] = callParams.batchNonce;
        ERC20 tokenContract = ERC20(callParams.tokenContract);
        require(tokenContract.transferFrom(callData.from, callData.to, callParams.amount), "ERC20_TRANSFER_FAILED");

        emit MetaTx(callData.from, callParams.batchId, callParams.batchNonce);
    }

    // // ////////////////////////////// VIEW /////////////////////////

    function meta_nonce(address from, uint256 batchId) external view returns(uint256) {
        return batches[from][batchId];
    }
}
