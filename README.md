# web3curl

[![npm version](https://badge.fury.io/js/web3curl.svg)](https://www.npmjs.com/package/web3curl)

A Curl-like app to fetch [ERC-6860 `web3://` protocol](https://eips.ethereum.org/EIPS/eip-6860) URLs.

## Usage

```bash
web3curl "web3://0xA5aFC9fE76a28fB12C60954Ed6e2e5f8ceF64Ff2/resourceName"
```

Calling this above will output ``???``.

## Installation

Globally:

```bash
npm install -g web3curl
web3curl "web3://0xA5aFC9fE76a28fB12C60954Ed6e2e5f8ceF64Ff2/resourceName"
```

Locally:

```bash
npm install web3curl
npx web3curl "web3://0xA5aFC9fE76a28fB12C60954Ed6e2e5f8ceF64Ff2/resourceName"
```

## Working with local/custom nodes

If you want to override a chain RPC, or add new chains, use the ``--web3-chain`` option. For example, to use a local node for the mainnet chain : 

```bash
web3curl --web3-chain 1=http://127.0.0.1:8545 "web3://0x2279B7A0a67DB372996a5FaB50D91eAA73d2eBe6/testFunc/1?returns=(uint)"
```

## Debugging

Use the ``-v`` option to have access to more details about the execution.

```bash
web3curl -v "web3://0xA5aFC9fE76a28fB12C60954Ed6e2e5f8ceF64Ff2/levelAndTile/2/50?returns=(uint256,uint256)"
```

will output:

```
* Fetching URL web3://0xA5aFC9fE76a28fB12C60954Ed6e2e5f8ceF64Ff2/levelAndTile/2/50?returns=(uint256,uint256)
* Parsing URL ...
* Host domain name resolver: (none)
* Contract address: 0xA5aFC9fE76a28fB12C60954Ed6e2e5f8ceF64Ff2
* Contract chain id: 1
* Resolve mode determination... 
> 0xdd473fae
< 0x
* Resolve mode: auto
* Contract call mode: method
* Method name: levelAndTile
* Method arguments types: [{"type":"uint256"},{"type":"uint256"}]
* Method arguments values: ["0x2","0x32"]
* Contract return processing: jsonEncodeValues
* Contract return processing: jsonEncodeValues: Types of values to encode: [{"type":"uint256"},{"type":"uint256"}]
*
* Calling contract ...
* RPC: https://ethereum.publicnode.com
* Contract address: 0xA5aFC9fE76a28fB12C60954Ed6e2e5f8ceF64Ff2
> 0xd55dd04300000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000032
< 0x00000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000024
*
* Decoding contract return ...
* HTTP Status code: 200
* HTTP Headers: 
*   Content-Type: application/json
["0x1","0x24"]
```
