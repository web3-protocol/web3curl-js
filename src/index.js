#!/usr/bin/env node

import yargs from "yargs";
import { hideBin } from 'yargs/helpers'
import { parseUrl, fetchParsedUrl } from 'web3protocol';

const y = yargs(hideBin(process.argv))
  .usage("web3curl <web3-url>")
  .demandCommand(1)
let args = y.parse()

try {
    let opts = {}
    const parsedUrl = await parseUrl(y.argv._[0], opts)
    const callResult = await fetchParsedUrl(parsedUrl, opts)
    console.log(callResult.output.toString())
}
catch(err) {
    console.log("An error occured: " + err)
    process.exit(1);
}