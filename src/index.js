#!/usr/bin/env node

import yargs from "yargs";
import { writeFileSync, createWriteStream } from 'fs'
import { hideBin } from 'yargs/helpers'
import { Client } from 'web3protocol';
import { getDefaultChainList } from 'web3protocol/chains';
import { formatBytes } from './utils.js'

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
  .option('verbose2', {
    alias: 'vv',
    type: 'boolean',
    default: false,
    description: 'Make the operation even more talkative',
  })
  .option('verbose3', {
    alias: 'vvv',
    type: 'boolean',
    default: false,
    description: 'Make the operation even more and more talkative',
  })
  .option('chain-rpc', {
    alias: 'c',
    type: 'string',
    requiresArg: true,
    description: "Add/override a chain RPC. Format: <chain-id>=<rpc-provider-url>. Can be used multiple times. Examples: 1=https://eth-mainnet.alchemyapi.io/v2/<your_api_key> 42170=https://nova.arbitrum.io/rpc 5=http://127.0.0.1:8545"
  })
  .option('chain-ens-registry', {
    alias: 'ens',
    type: 'string',
    requiresArg: true,
    description: "Add/override a chain ENS registry. Format: <chain-id>=<ens-registry-address>. Can be used multiple times. Examples: 1=0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e 31337=0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512"
  })
  .demandCommand(1)
let args = y.parse()

// Determine the verbosity level
let verbosityLevel = 0
if(process.argv.indexOf("-v") > -1) {
  verbosityLevel = 1
}
if(process.argv.indexOf("-vv") > -1) {
  verbosityLevel = 2
}
if(process.argv.indexOf("-vvv") > -1) {
  verbosityLevel = 3
}



//
// Prepare the chain list
//

// Get the default ones
let chainList = getDefaultChainList()

// Handle the RPC addition/overrides
if(args.chainRpc) {
  if((args.chainRpc instanceof Array) == false) {
    args.chainRpc = [args.chainRpc]
  }

  let chainOverrides = []
  args.chainRpc.map(newChain => newChain.split('=')).map(newChainComponents => {
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

    // Find if chain is already overriden
    let alreadyDefinedChainOverride = Object.entries(chainOverrides).find(chainOverride => chainOverride[1].id == chainId) || null

    // If already exist, add the RPC to the list
    if(alreadyDefinedChainOverride) {
      chainOverrides[alreadyDefinedChainOverride[0]].rpcUrls.push(chainRpcUrl)
    }
    // If does not exist, create it
    else {
      let chainOverride = {
        id: chainId,
        rpcUrls: [chainRpcUrl]
      }
      chainOverrides.push(chainOverride)
    }
  })

  // Add the overrides on the main chain list
  chainOverrides.map(chainOverride => {
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

// Handle the ENS registry addition/overrides
if(args.chainEnsRegistry) {
  if((args.chainEnsRegistry instanceof Array) == false) {
    args.chainEnsRegistry = [args.chainEnsRegistry]
  }

  args.chainEnsRegistry.map(newChain => newChain.split('=')).map(newChainComponents => {
    if(newChainComponents.length <= 1) {
      console.log("Chain format is invalid");
      process.exit(1)
    }
    let chainId = parseInt(newChainComponents[0]);
    if(isNaN(chainId) || chainId <= 0) {
      console.log("Chain id is invalid");
      process.exit(1)
    }
    let chainEnsRegistry = newChainComponents.slice(1).join("=");

    // Find if chain is already overriden
    let existingChain = Object.entries(chainList).find(chain => chain[1].id == chainId) || null

    // If already exist, add/update the ENS registry to the list
    if(existingChain) {
      if(chainList[existingChain[0]].contracts === undefined) {
        chainList[existingChain[0]].contracts = {}
      }
      chainList[existingChain[0]].contracts.ensRegistry = { address: chainEnsRegistry }
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

if(verbosityLevel >= 1) {
  process.stderr.write("* Fetching URL " + url + "\n")
  process.stderr.write("* Parsing URL ...\n")
}

let parsedUrl = {}
let urlMainParts
try {
  // Step 1.1 : Extract parts of the URL, determine if a chain id was provided.
  let chainId
  ({urlMainParts, chainId} = web3Client.parseUrlBasic(url))
  parsedUrl.chainId = chainId
}
catch(err) {
  process.stderr.write("web3curl: Basic parsing: Error: " + err.message + "\n")
  process.exit(1);
}

try {
  // Step 1.2 : For a given hostname, determine the target contract address.
  let {contractAddress, chainId: updatedChainId, nameResolution} = await web3Client.determineTargetContractAddress(urlMainParts.hostname, parsedUrl.chainId)
  parsedUrl.contractAddress = contractAddress
  parsedUrl.chainId = updatedChainId
  // Informations on how the hostname of the URL was resolved
  parsedUrl.nameResolution = nameResolution
}
catch(err) {
  process.stderr.write("web3curl: Hostname resolution: Error: " + err.message + "\n")
  process.exit(1);
}

// Verbosity : Print domain name resolution infos
if(verbosityLevel >= 1) {
  process.stderr.write("* Host domain name resolver: " + (parsedUrl.nameResolution.resolver ?? "(none)") + "\n")

  if(parsedUrl.nameResolution.resolver) {
    process.stderr.write("*   Domain name being resolved: " + parsedUrl.nameResolution.resolvedName + "\n")
    process.stderr.write("*   Resolution chain id: " + parsedUrl.nameResolution.resolverChainId + "\n")
    
    if(verbosityLevel >= 2) {
      process.stderr.write("*\n")
    }

    // Fetch resolver call
    if(verbosityLevel >= 2 && parsedUrl.nameResolution.fetchNameResolverCall) {
      let call = parsedUrl.nameResolution.fetchNameResolverCall
      
      process.stderr.write("*   Fetching resolver for domain name on " + call.contractAddress + " ...\n")
      process.stderr.write("> " + formatBytes(call.calldata, verbosityLevel) + "\n")

      for(let badRpcIndex = 0; badRpcIndex < call.callResult.rpcUrlUsedIndex; badRpcIndex++) {
        process.stderr.write("*   RPC provider error, skipped: " + call.callResult.rpcUrls[badRpcIndex] + " : " + call.callResult.rpcUrlsErrors[badRpcIndex] + "\n")
      }
      process.stderr.write("*   RPC provider used: " + call.callResult.rpcUrls[call.callResult.rpcUrlUsedIndex] + "\n")

      process.stderr.write("< " + formatBytes(call.callResult.data, verbosityLevel) + "\n")

      process.stderr.write("*   Resolver contract: " + call.decodedResult + "\n")
      process.stderr.write("*\n")
    }

    // Fetch contentcontract TXT call
    if(verbosityLevel >= 2 && parsedUrl.nameResolution.erc6821ContentContractTxtCall) {
      let call = parsedUrl.nameResolution.erc6821ContentContractTxtCall

      process.stderr.write("*   Fetching contentcontract TXT field of domain name on " + call.contractAddress + " ...\n")
      process.stderr.write("> " + formatBytes(call.calldata, verbosityLevel) + "\n")

      for(let badRpcIndex = 0; badRpcIndex < call.callResult.rpcUrlUsedIndex; badRpcIndex++) {
        process.stderr.write("*   RPC provider error, skipped: " + call.callResult.rpcUrls[badRpcIndex] + " : " + call.callResult.rpcUrlsErrors[badRpcIndex] + "\n")
      }
      process.stderr.write("*   RPC provider used: " + call.callResult.rpcUrls[call.callResult.rpcUrlUsedIndex] + "\n")
      
      process.stderr.write("< " + formatBytes(call.callResult.data, verbosityLevel) + "\n")

      process.stderr.write("*   contentcontract TXT record: " + (call.decodedResult ? call.decodedResult : "(empty)") + "\n")
      process.stderr.write("*\n")
    }

    // Resolve call
    if(verbosityLevel >= 2 && parsedUrl.nameResolution.resolveNameCall) {
      let call = parsedUrl.nameResolution.resolveNameCall
      
      process.stderr.write("*   Resolving domain name with resolver " + call.contractAddress + " ...\n")
      process.stderr.write("> " + formatBytes(call.calldata, verbosityLevel) + "\n")

      for(let badRpcIndex = 0; badRpcIndex < call.callResult.rpcUrlUsedIndex; badRpcIndex++) {
        process.stderr.write("*   RPC provider error, skipped: " + call.callResult.rpcUrls[badRpcIndex] + " : " + call.callResult.rpcUrlsErrors[badRpcIndex] + "\n")
      }
      process.stderr.write("*   RPC provider used: " + call.callResult.rpcUrls[call.callResult.rpcUrlUsedIndex] + "\n")
      
      process.stderr.write("< " + formatBytes(call.callResult.data, verbosityLevel) + "\n")

      process.stderr.write("*   Resolved name: " + (call.decodedResult ? call.decodedResult : "(empty)") + "\n")
      process.stderr.write("*\n")
    }
    
    process.stderr.write("*   Resolution type: " + parsedUrl.nameResolution.resolutionType + "\n")
    if(parsedUrl.nameResolution.resolutionType == "contentContractTxt") {
      process.stderr.write("*   contentcontract TXT record: " + parsedUrl.nameResolution.erc6821ContentContractTxt + "\n")
    }
    process.stderr.write("*   Result address: " + parsedUrl.nameResolution.resultAddress + "\n")
    process.stderr.write("*   Result chain id: " + (parsedUrl.nameResolution.resultChainId ?? "(not overidden)") + "\n")
  }

  process.stderr.write("* Contract address: " + parsedUrl.contractAddress + "\n")
  process.stderr.write("* Contract chain id: " + parsedUrl.chainId + "\n")
  let configuredChain = chainList.find(chain => chain.id == parsedUrl.chainId) || null
  if(configuredChain == null) {
    process.stderr.write("web3curl: No chain configuration found for chain : " + parsedUrl.chainId + "\n")
    process.exit(1);
  }
  process.stderr.write("* Configured RPCs for chain " + parsedUrl.chainId + " (fallback mode) : " + configuredChain.rpcUrls.join(" ") + "\n")
  process.stderr.write("*\n")

  process.stderr.write("* Resolve mode determination... \n")
}

try {
  // Step 1.3 : Determine the web3 mode.
  const resolveModeDeterminationResult = await web3Client.determineResolveMode(parsedUrl.contractAddress, parsedUrl.chainId)
  // Web3 resolve mode: 'auto', 'manual' or 'resourceRequest'
  parsedUrl.mode = resolveModeDeterminationResult.mode
  // Infos about the mode determination
  parsedUrl.modeDetermination = resolveModeDeterminationResult.modeDetermination
}
catch(err) {
  process.stderr.write("web3curl: Resolve mode determination: Error: " + err.message + "\n")
  process.exit(1);
}

// Verbosity : Print mode determination infos
if(verbosityLevel >= 1) {
  process.stderr.write("> " + formatBytes(parsedUrl.modeDetermination.calldata, verbosityLevel) + "\n")

  for(let badRpcIndex = 0; badRpcIndex < parsedUrl.modeDetermination.callResult.rpcUrlUsedIndex; badRpcIndex++) {
    process.stderr.write("* RPC provider error, skipped: " + parsedUrl.modeDetermination.callResult.rpcUrls[badRpcIndex] + " : " + parsedUrl.modeDetermination.callResult.rpcUrlsErrors[badRpcIndex] + "\n")
  }
  process.stderr.write("* RPC provider used: " + parsedUrl.modeDetermination.callResult.rpcUrls[parsedUrl.modeDetermination.callResult.rpcUrlUsedIndex] + "\n")
  
  process.stderr.write("< " + formatBytes(parsedUrl.modeDetermination.callResult.data, verbosityLevel) + "\n")
  process.stderr.write("* Resolve mode: " + parsedUrl.mode + "\n")

  process.stderr.write("*\n")

  process.stderr.write("* Path parsing... \n")
}

try {
  // Step 1.4 : Parse the path part of the URL, given the web3 resolve mode.
  let parsedPath = await web3Client.parsePathForResolveMode(urlMainParts.path, parsedUrl.mode, parsedUrl.chainId)
  parsedUrl = {...parsedUrl, ...parsedPath}
}
catch(err) {
  process.stderr.write("web3curl: Path parsing: Error: " + err.message + "\n")
  process.exit(1);
}

// Verbosity : Print contract call infos
if(verbosityLevel >= 1) {
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

  process.stderr.write("*\n")
}


//
// Step 2 : Fetch the contract return
//

if(verbosityLevel >= 1) {
  process.stderr.write("* Calling contract ...\n")
  process.stderr.write("* Contract address: " + parsedUrl.contractAddress + "\n")
  process.stderr.write("> " + formatBytes(parsedUrl.calldata, verbosityLevel) + "\n")
}

let contractReturn
try {
  contractReturn = await web3Client.fetchContractReturn(parsedUrl)
}
catch(err) {
  if(err.rpcUrls !== undefined) {
    for(let badRpcIndex = 0; badRpcIndex < err.rpcUrls.length; badRpcIndex++) {
      process.stderr.write("* RPC provider error: " + err.rpcUrls[badRpcIndex] + " : " + err.rpcUrlsErrors[badRpcIndex] + "\n")
    }
  }
  process.stderr.write("web3curl: Error: " + err.message + "\n")
  process.exit(1);
}

if(verbosityLevel >= 1) {
  for(let badRpcIndex = 0; badRpcIndex < contractReturn.rpcUrlUsedIndex; badRpcIndex++) {
    process.stderr.write("* RPC provider error, skipped: " + contractReturn.rpcUrls[badRpcIndex] + " : " + contractReturn.rpcUrlsErrors[badRpcIndex] + "\n")
  }
  process.stderr.write("* RPC provider used: " + contractReturn.rpcUrls[contractReturn.rpcUrlUsedIndex] + "\n")
  process.stderr.write("< " + formatBytes(contractReturn.data, verbosityLevel) + "\n")
  process.stderr.write("*\n")
}


//
// Step 3 : Process the contract return
//

if(verbosityLevel >= 1) {
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

if(verbosityLevel >= 1) {
  process.stderr.write("* HTTP Status code: " + fetchedWeb3Url.httpCode + "\n")
  process.stderr.write("* HTTP Headers: " + (fetchedWeb3Url.httpHeaders.length == 0 ? "(none)" : "") + "\n")
  Object.entries(fetchedWeb3Url.httpHeaders).forEach(([headerName, headerValue]) => {
    process.stderr.write("*   " + headerName + ": " + headerValue + "\n")
  })
}


// Fetch output from stream
const reader = fetchedWeb3Url.output.getReader();
let chunkNumber = 0;
let fileWriteStream = null;
while (true) {
  const { done, value } = await reader.read();

  // We got a chunk
  if(value) {
    // First chunk: Detect: if output is non-utf8 and not output target was
    // specified, ask for confirmation before printing on console
    if(chunkNumber == 0) {
      // Try to decode as utf8 text
      let outputStr = new TextDecoder('utf-8').decode(value)

      // If we have "replacement character" (U+FFFD), then it has bad utf8
      if(outputStr.indexOf("�") !== -1 && args.output === undefined) {
        process.stderr.write('Warning: Binary output can mess up your terminal. Use "--output -" to tell\n' +
          'Warning: web3curl to output it to your terminal anyway, or consider "--output\n' + 
          'Warning: <FILE>" to save to a file.\n')
        process.exit(1);
      }
    }

    // If requested, save on file
    if(args.output && args.output != "-") {
      if(fileWriteStream == null) {
        fileWriteStream = createWriteStream(args.output);
      }

      try {
        fileWriteStream.write(value)
      }
      catch(err) {
        process.stderr.write("web3curl: Failed to save file: " + err.message + "\n")
        process.exit(1);
      }
    }
    // Else, we print on console
    else {
      let outputStr = new TextDecoder('utf-8').decode(value)
      process.stdout.write(outputStr)
    }

    chunkNumber++;
  }

  // When no more data needs to be consumed, break the reading
  if (done) {
    break;
  }
}


if(fileWriteStream) {
  fileWriteStream.close()
}