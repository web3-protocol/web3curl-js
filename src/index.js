#!/usr/bin/env node

import yargs from "yargs";
import { writeFileSync } from 'fs'
import { hideBin } from 'yargs/helpers'
import { Client } from 'web3protocol';
import { getDefaultChainList } from 'web3protocol/src/chains/index.js';

const y = yargs(hideBin(process.argv))
  .usage("web3curl [options] <web3-url>")
  .option('output', {
    alias: 'o',
    type: 'string',
    requiresArg: true,
    description: "Write to file instead of stdout"
  })
  .option('verbose', {
    alias: 'v',
    type: 'boolean',
    default: false,
    description: 'Make the operation more talkative',
  })
  .option('web3-chain', {
    alias: 'c',
    type: 'string',
    requiresArg: true,
    description: "Add/override a chain definition. Format: <chain-id>=<rpc-provider-url>. Can be used multiple times. Examples: 1=https://eth-mainnet.alchemyapi.io/v2/<your_api_key> 42170=https://nova.arbitrum.io/rpc 5=http://127.0.0.1:8545"
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


//
// Main execution
//

const url = args._[0]

// Prepare the client
const web3Client = new Client(chainList)



  //
  // Step 1 : Parse the URL
  //

if(args.verbose) {
  process.stderr.write("* Parsing URL " + url + " ...\n")
}

let parsedUrl
try {
  parsedUrl = await web3Client.parseUrl(url)
}
catch(err) {
  process.stderr.write("web3curl: Error: " + err.message + "\n")
  process.exit(1);
}

// Parsed URL infos
if(args.verbose) {
  process.stderr.write("* Host domain name resolver: " + (parsedUrl.nameResolution.resolver ?? "(none)") + "\n")
  if(parsedUrl.nameResolution.resolver) {
    process.stderr.write("* Host domain name resolver chain: " + parsedUrl.nameResolution.chainId + "\n")
    process.stderr.write("* Host domain name resolved: " + parsedUrl.nameResolution.resolvedName + "\n")
  }
  process.stderr.write("* Contract address: " + parsedUrl.contractAddress + "\n")
  process.stderr.write("* Resolve mode: " + parsedUrl.mode + "\n")
  process.stderr.write("* Contract call mode: " + parsedUrl.contractCallMode + "\n")
  if(parsedUrl.contractCallMode == "calldata") {
    process.stderr.write("* Calldata: " + parsedUrl.calldata + "\n")
  }
  else if(parsedUrl.contractCallMode == "method") {
    process.stderr.write("* Method name: " + parsedUrl.methodName + "\n")
    process.stderr.write("* Method arguments types: " + JSON.stringify(parsedUrl.methodArgs) + "\n")
    process.stderr.write("* Method arguments values: " + JSON.stringify(parsedUrl.methodArgValues, 
      (key, value) => typeof value === "bigint" ? "0x" + value.toString(16) : value) + "\n")
  }
  process.stderr.write("* Contract return processing: " + parsedUrl.contractReturnProcessing + "\n")
  if(parsedUrl.contractReturnProcessing == "decodeABIEncodedBytes") {
    process.stderr.write("* Contract return processing: " + parsedUrl.contractReturnProcessing + ": MIME type: " + (parsedUrl.contractReturnProcessingOptions.mimeType ?? "(not set)") + "\n")
  }
  else if(parsedUrl.contractReturnProcessing == "jsonEncodeValues") {
    process.stderr.write("* Contract return processing: " + parsedUrl.contractReturnProcessing + ": Types of values to encode: " + JSON.stringify(parsedUrl.contractReturnProcessingOptions.jsonEncodedValueTypes) + "\n")
  }
}


//
// Step 2 : Fetch the contract return
//

if(args.verbose) {
  process.stderr.write("* Calling contract ...\n")
}

let contractReturn
try {
  contractReturn = await web3Client.fetchContractReturn(parsedUrl)
}
catch(err) {
  process.stderr.write("web3curl: Error: " + err.message + "\n")
  process.exit(1);
}

if(args.verbose) {
  process.stderr.write("< " + contractReturn + "\n")
}


//
// Step 3 : Process the contract return
//

if(args.verbose) {
  process.stderr.write("* Decoding contract return ...\n")
}

let fetchedWeb3Url
try {
  fetchedWeb3Url = await web3Client.processContractReturn(parsedUrl, contractReturn)
}
catch(err) {
  process.stderr.write("web3curl: Error: " + err.message + "\n")
  process.exit(1);
}

if(args.verbose) {
  process.stderr.write("* HTTP Status code: " + fetchedWeb3Url.httpCode + "\n")
  process.stderr.write("* HTTP Headers: " + (fetchedWeb3Url.httpHeaders.length == 0 ? "(none)" : "") + "\n")
  Object.entries(fetchedWeb3Url.httpHeaders).forEach(([headerName, headerValue]) => {
    process.stderr.write("*  " + headerName + ": " + headerValue + "\n")
  })
}



// Try to decode as utf8 text
let outputStr = new TextDecoder('utf-8').decode(fetchedWeb3Url.output)

// If we have "replacement character" (U+FFFD), then it has bad utf8
if(outputStr.indexOf("�") !== -1 && args.output === undefined) {
  process.stderr.write('Warning: Binary output can mess up your terminal. Use "--output -" to tell\n' +
    'Warning: web3curl to output it to your terminal anyway, or consider "--output\n' + 
    'Warning: <FILE>" to save to a file.\n')
  process.exit(1);
}

// Saving to file was requested
if(args.output && args.output != "-") {
  try {
    writeFileSync(args.output, Buffer.from(fetchedWeb3Url.output));
  }
  catch(err) {
    process.stderr.write("web3curl: Failed to save file: " + err.message + "\n")
    process.exit(1);
  }
}
// Else, we print on console
else {
  process.stdout.write(outputStr)
}
