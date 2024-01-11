# web3curl

[![npm version](https://badge.fury.io/js/web3curl.svg)](https://www.npmjs.com/package/web3curl)

A Curl-like app to fetch [ERC-6860 / ERC-4804 `web3://` protocol](https://eips.ethereum.org/EIPS/eip-6860) URLs.

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

Use the ``-v`` option to have access to more details about the execution. ``-vv`` and ``-vvv`` can be used for even more output. ``-vv`` will add informations about the name resolution process, and ``-vvv`` will add the full bytes sent and received from the smart contract.

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
* Configured RPCs for chain 1 (fallback mode) : https://ethereum.publicnode.com https://cloudflare-eth.com
*
* Resolve mode determination... 
> 0xdd473fae
< 0x
* Resolve mode: auto
*
* Path parsing... 
* Contract call mode: method
* Method name: levelAndTile
* Method arguments types: [{"type":"uint256"},{"type":"uint256"}]
* Method arguments values: ["0x2","0x32"]
* Contract return processing: jsonEncodeValues
* Contract return processing: jsonEncodeValues: Types of values to encode: [{"type":"uint256"},{"type":"uint256"}]
*
* Calling contract ...
* Contract address: 0xA5aFC9fE76a28fB12C60954Ed6e2e5f8ceF64Ff2
> 0xd55dd04300000000000000000000000000000000000000000000000000000000...0000000000000000000000000000000000000000000000000000000000000032
* RPC provider used: https://ethereum.publicnode.com
< 0x00000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000024
*
* Decoding contract return ...
* HTTP Status code: 200
* HTTP Headers: 
*   Content-Type: application/json
["0x1","0x24"]
```

```bash
web3curl -v "web3://vitalikblog.eth/css/misc.css"
```

will output:

```
* Fetching URL web3://vitalikblog.eth/css/misc.css
* Parsing URL ...
* Host domain name resolver: ens
*   Domain name being resolved: vitalikblog.eth
*   Resolution chain id: 1
*   Resolution type: contentContractTxt
*   contentcontract TXT record: arb-nova:0xe4ba0e245436b737468c206ab5c8f4950597ab7f
*   Result address: 0xe4ba0e245436b737468c206ab5c8f4950597ab7f
*   Result chain id: 42170
* Contract address: 0xe4ba0e245436b737468c206ab5c8f4950597ab7f
* Contract chain id: 42170
* Configured RPCs for chain 42170 (fallback mode) : https://nova.arbitrum.io/rpc
*
* Resolve mode determination... 
> 0xdd473fae
< 0x6d616e75616c0000000000000000000000000000000000000000000000000000
* Resolve mode: manual
*
* Path parsing... 
* Contract call mode: calldata
* Calldata: 0x2f6373732f6d6973632e637373
* Contract return processing: decodeABIEncodedBytes
* Contract return processing: decodeABIEncodedBytes: MIME type: text/css
*
* Calling contract ...
* Contract address: 0xe4ba0e245436b737468c206ab5c8f4950597ab7f
> 0x2f6373732f6d6973632e637373
* RPC provider used: https://nova.arbitrum.io/rpc
< 0x0000000000000000000000000000000000000000000000000000000000000020...0000000000000000000000000000000000000000000000000000000000000126
*
* Decoding contract return ...
* HTTP Status code: 200
* HTTP Headers: 
*   Content-Type: text/css
<return data>
```

```bash
web3curl -vv "web3://vitalikblog.eth/css/misc.css"
```

will output:

```
* Fetching URL web3://vitalikblog.eth/css/misc.css
* Parsing URL ...
* Host domain name resolver: ens
*   Domain name being resolved: vitalikblog.eth
*   Resolution chain id: 1
*
*   Fetching resolver for domain name on 0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e ...
> 0x0178b8bfecdddb8dbf97c8dc8a5ab38a37c1c80f0c01595db53c2924459e40fbee118bc8
*   RPC provider used: https://ethereum.publicnode.com
< 0x0000000000000000000000004976fb03c32e5b8cfe2b6ccb31c09ba78ebaba41
*   Resolver contract: 0x4976fb03C32e5B8cfe2b6cCB31c09Ba78EBaBa41
*
*   Fetching contentcontract TXT field of domain name on 0x4976fb03C32e5B8cfe2b6cCB31c09Ba78EBaBa41 ...
> 0x59d1d43cecdddb8dbf97c8dc8a5ab38a37c1c80f0c01595db53c2924459e40fb...636f6e74656e74636f6e74726163740000000000000000000000000000000000
*   RPC provider used: https://ethereum.publicnode.com
< 0x0000000000000000000000000000000000000000000000000000000000000020...3036616235633866343935303539376162376600000000000000000000000000
*   contentcontract TXT record: arb-nova:0xe4ba0e245436b737468c206ab5c8f4950597ab7f
*
*   Resolution type: contentContractTxt
*   contentcontract TXT record: arb-nova:0xe4ba0e245436b737468c206ab5c8f4950597ab7f
*   Result address: 0xe4ba0e245436b737468c206ab5c8f4950597ab7f
*   Result chain id: 42170
* Contract address: 0xe4ba0e245436b737468c206ab5c8f4950597ab7f
* Contract chain id: 42170
* Configured RPCs for chain 42170 (fallback mode) : https://nova.arbitrum.io/rpc
*
* Resolve mode determination... 
> 0xdd473fae
< 0x6d616e75616c0000000000000000000000000000000000000000000000000000
* Resolve mode: manual
*
* Path parsing... 
* Contract call mode: calldata
* Calldata: 0x2f6373732f6d6973632e637373
* Contract return processing: decodeABIEncodedBytes
* Contract return processing: decodeABIEncodedBytes: MIME type: text/css
*
* Calling contract ...
* Contract address: 0xe4ba0e245436b737468c206ab5c8f4950597ab7f
> 0x2f6373732f6d6973632e637373
* RPC provider used: https://nova.arbitrum.io/rpc
< 0x0000000000000000000000000000000000000000000000000000000000000020...0000000000000000000000000000000000000000000000000000000000000126
*
* Decoding contract return ...
* HTTP Status code: 200
* HTTP Headers: 
*   Content-Type: text/css
<return data>
```
