// SPDX-License-Identifier: MIT
// Adapted from OpenZeppelin's codebase.

pragma solidity >0.6.0 <0.8.0;

import "./ECDSA.sol";

/**
 * @dev https://eips.ethereum.org/EIPS/eip-712[EIP 712] is a standard for hashing and signing of typed structured data.
 *
 * The encoding specified in the EIP is very generic, and such a generic implementation in Solidity is not feasible,
 * thus this contract does not implement the encoding itself. Protocols need to implement the type-specific encoding
 * they need in their contracts using a combination of `abi.encode` and `keccak256`.
 *
 * This contract implements the EIP 712 domain separator ({_domainSeparatorV4}) that is used as part of the encoding
 * scheme, and the final step of the encoding to obtain the message digest that is then signed via ECDSA
 * ({_hashTypedDataV4}).
 *
 * The implementation of the domain separator was designed to be as efficient as possible while still properly updating
 * the chain id to protect against replay attacks on an eventual fork of the chain.
 *
 * NOTE: This contract implements the version of the encoding known as "v4", as implemented by the JSON RPC method
 * https://docs.metamask.io/guide/signing-data.html[`eth_signTypedDataV4` in MetaMask].
 *
 * _Available since v3.4._
 */
abstract contract EIP712 {
    /* solhint-disable var-name-mixedcase */
    // Cache the domain separator as an immutable value, but also store the chain id that it corresponds to, in order to
    // invalidate the cached domain separator if the chain id changes.
    bytes32 public immutable CACHED_DOMAIN_SEPARATOR;
    uint256 public immutable CACHED_CHAIN_ID;

    bytes32 public immutable HASHED_NAME;
    bytes32 public immutable HASHED_VERSION;
    bytes32 public immutable TYPE_HASH;
    /* solhint-enable var-name-mixedcase */

    /**
     * @dev Initializes the domain separator and parameter caches.
     *
     * The meaning of `name` and `version` is specified in
     * https://eips.ethereum.org/EIPS/eip-712#definition-of-domainseparator[EIP 712]:
     *
     * - `name`: the user readable name of the signing domain, i.e. the name of the DApp or the protocol.
     * - `version`: the current major version of the signing domain.
     *
     * NOTE: These parameters cannot be changed.
     */
    constructor(string memory name, string memory version) {
        bytes32 hashedName = keccak256(bytes(name));
        bytes32 hashedVersion = keccak256(bytes(version));
        bytes32 typeHash = keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)");
        HASHED_NAME = hashedName;
        HASHED_VERSION = hashedVersion;
        uint chainId;
        assembly {
            chainId := chainid()
        }
        CACHED_CHAIN_ID = chainId;
        CACHED_DOMAIN_SEPARATOR = buildDomainSeparator(typeHash, hashedName, hashedVersion);
        TYPE_HASH = typeHash;
    }

    /**
     * @dev Returns the domain separator for the current chain.
     */
    function domainSeparatorV4() public view returns (bytes32) {
        uint chainId;
        assembly {
            chainId := chainid()
        }
        if (chainId == CACHED_CHAIN_ID) {
            return CACHED_DOMAIN_SEPARATOR;
        } else {
            return buildDomainSeparator(TYPE_HASH, HASHED_NAME, HASHED_VERSION);
        }
    }

    function buildDomainSeparator(bytes32 typeHash, bytes32 name, bytes32 version) public view returns (bytes32) {
        uint chainId;
        assembly {
            chainId := chainid()
        }
        return keccak256(
            abi.encode(
                typeHash,
                name,
                version,
                chainId,
                address(this)
            )
        );
    }

    /**
     * @dev Given an already https://eips.ethereum.org/EIPS/eip-712#definition-of-hashstruct[hashed struct], this
     * function returns the hash of the fully encoded EIP712 message for this domain.
     *
     * This hash can be used together with {ECDSA-recover} to obtain the signer of a message. For example:
     *
     * ```solidity
     * bytes32 digest = hashTypedDataV4(keccak256(abi.encode(
     *     keccak256("Mail(address to,string contents)"),
     *     mailTo,
     *     keccak256(bytes(mailContents))
     * )));
     * address signer = ECDSA.recover(digest, signature);
     * ```
     */
    function hashTypedDataV4(bytes32 structHash) public view virtual returns (bytes32) {
        return ECDSA.toTypedDataHash(domainSeparatorV4(), structHash);
    }
}
