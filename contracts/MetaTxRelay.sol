// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.7.6;
pragma abicoder v2;

import "./libraries/BytesUtil.sol";
import "./libraries/SigUtil.sol";
import "./interfaces/ERC20.sol";

contract MetaTxRelay {
    struct Call {
        address from;
        address to;
        bytes signature;
    }

    struct CallParams {
        address tokenContract;
        uint256 amount;
        uint256 nonce;
        uint256 expiry;
    }

    mapping(address => bool) public tokenAccepted;
    mapping(address => uint256) public nonce;

    address public relayer;
    address public governor;

    bytes32 public DOMAIN_SEPARATOR;
    bytes32 public constant EIP712DOMAIN_TYPEHASH =
        keccak256(
            abi.encodePacked(
                "EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"
            )
        );
    bytes32 public constant ERC20METATRANSACTION_TYPEHASH =
        keccak256(
            abi.encodePacked(
                "ERC20MetaTransaction(address from,address to,address tokenContract,uint256 amount,uint256 nonce,uint256 expiry)"
            )
        );

    event MetaTx(address indexed _from, uint256 indexed _nonce);

    constructor(uint256 _chainId) {
        DOMAIN_SEPARATOR = keccak256(
            abi.encode(
                EIP712DOMAIN_TYPEHASH,
                keccak256("MetaTxRelay"),
                keccak256("1.0.0"),
                _chainId,
                address(this)
            )
        );
        relayer = msg.sender;
        governor = msg.sender;
    }

    function executeMetaTransaction(
        Call memory _callData,
        CallParams memory _callParams
    ) public {
        require(tokenAccepted[_callParams.tokenContract], "Token not accepted");
        require(msg.sender == relayer, "Only relayer.");
        require(block.timestamp < _callParams.expiry, "Sig expired");
        require(
            nonce[_callData.from] + 1 == _callParams.nonce,
            "Bad signature nonce"
        );

        bytes memory dataToHash = abi.encodePacked(
            "\x19\x01",
            DOMAIN_SEPARATOR,
            keccak256(
                abi.encode(
                    ERC20METATRANSACTION_TYPEHASH,
                    _callData.from,
                    _callData.to,
                    _callParams.tokenContract,
                    _callParams.amount,
                    _callParams.nonce,
                    _callParams.expiry
                )
            )
        );
        require(
            SigUtil.recover(keccak256(dataToHash), _callData.signature) ==
                _callData.from,
            "signer != from"
        );
        nonce[_callData.from] = _callParams.nonce;
        ERC20 tokenContract = ERC20(_callParams.tokenContract);
        require(
            tokenContract.transferFrom(
                _callData.from,
                _callData.to,
                _callParams.amount
            ),
            "ERC20_TRANSFER_FAILED"
        );

        emit MetaTx(_callData.from, _callParams.nonce);
    }

    function setGovernor(address _governor) external {
        require(msg.sender == governor, "Only governor");
        governor = _governor;
    }

    function setTokenAccepted(address _tokenAddr, bool _accepted) external {
        require(msg.sender == governor, "Only governor");
        tokenAccepted[_tokenAddr] = _accepted;
    }

    function recover(Call memory _callData, CallParams memory _callParams)
        external
        view
        returns (address)
    {
        bytes memory dataToHash = abi.encodePacked(
            "\x19\x01",
            DOMAIN_SEPARATOR,
            keccak256(
                abi.encode(
                    ERC20METATRANSACTION_TYPEHASH,
                    _callData.from,
                    _callData.to,
                    _callParams.tokenContract,
                    _callParams.amount,
                    _callParams.nonce,
                    _callParams.expiry
                )
            )
        );
        return SigUtil.recover(keccak256(dataToHash), _callData.signature);
    }
}
