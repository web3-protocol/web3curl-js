#!/usr/bin/env node

import yargs from "yargs";
import { hideBin } from 'yargs/helpers'
import { Client } from 'web3protocol';
import { getDefaultChainList } from 'web3protocol/src/chains/index.js';

const y = yargs(hideBin(process.argv))
  .usage("web3curl [options] <web3-url>")
  .option('web3-chain', {
    alias: 'wc',
    type: 'string',
    description: "Add/override a chain definition\nFormat: <chain-id>=<rpc-provider-url> \nMultiple can be provided with multiple --web3-chain use. Override existing chain settings. Examples:\n1=https://eth-mainnet.alchemyapi.io/v2/<your_api_key>\n42170=https://nova.arbitrum.io/rpc\n 5=http://127.0.0.1:8545"
  })
  .demandCommand(1)
let args = y.parse()


// Add/override chain definitions
let web3ChainOverrides = []
if(args.web3Chain) {
  if((args.web3Chain instanceof Array) == false) {
    args.web3Chain = [args.web3Chain]
  }

  args.web3Chain.map(newChain => newChain.split('=')).map(newChainComponents => {
    if(newChainComponents.length <= 1) {
      console.log("Chain format is invalid");
      process.exit(1)
    }
    let chainId = parseInt(newChainComponents[0]);
    if(isNaN(chainId) || chainId <= 0) {
      console.log("Chain id is invalid");
      process.exit(1)
    }
    let chainRpcUrl = newChainComponents.slice(1).join("=");

    web3ChainOverrides.push({
      id: chainId,
      rpcUrls: [chainRpcUrl]
    })
  })
}


// Execute the web3 call
try {
    let chainList = getDefaultChainList()
    let web3Client = new Client(chainList)

    let fetchedWeb3Url = await web3Client.fetchUrl(y.argv._[0])

    let outputStr = new TextDecoder().decode(fetchedWeb3Url.output)
    console.log(outputStr)
}
catch(err) {
    console.log("An error occured: " + err)
    process.exit(1);
}