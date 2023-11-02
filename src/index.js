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


//
// Prepare the chain list
//

// Get the default ones
let chainList = getDefaultChainList()

// Handle the addition/overrides
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

    let chainOverride = {
      id: chainId,
      rpcUrls: [chainRpcUrl]
    }

    // Find if the chain already exist
    let alreadyDefinedChain = Object.entries(chainList).find(chain => chain[1].id == chainOverride.id) || null

    // If it exists, override RPCs
    if(alreadyDefinedChain) {
      chainList[alreadyDefinedChain[0]].rpcUrls = [...chainOverride.rpcUrls]
    }
    // If does not exist, create it
    else {
      let newChain = {
        id: chainOverride.id,
        name: 'custom-' + chainOverride.id,
        rpcUrls: [...chainOverride.rpcUrls],
      }
      chainList.push(newChain)
    }
  })
}    


// Prepare the client
let web3Client = new Client(chainList)

// Execute the web3 call
try {
  let fetchedWeb3Url = await web3Client.fetchUrl(y.argv._[0])

  let outputStr = new TextDecoder().decode(fetchedWeb3Url.output)
  console.log(outputStr)
}
catch(err) {
  console.log("An error occured: " + err)
  process.exit(1);
}