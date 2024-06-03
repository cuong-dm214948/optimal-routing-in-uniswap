import { TokenList} from '@uniswap/token-lists';
import { schema } from '@uniswap/token-lists'
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
//import fs from 'fs';
const fs = require('fs');

//import path from 'path';
const path = require('path');
// Read and parse the token list JSON file
const tokenListPath = path.resolve('tokenlist.json');
const tokenListData = fs.readFileSync(tokenListPath, 'utf-8');
const myList: TokenList = JSON.parse(tokenListData);

// Function to validate the token list
async function validateTokenList(tokenList: TokenList, schema: object): Promise<void> {
  const ajv = new Ajv({ allErrors: true, verbose: true });
  addFormats(ajv);
  const validate = ajv.compile(schema);
  const valid = validate(tokenList);
  if (valid) {
    console.log("Valid Token List");
  } else {
    console.error("Invalid Token List:", validate.errors);
  }
}

// Validate the token list
validateTokenList(myList, schema);

// Print the resulting JSON to stdout
process.stdout.write(JSON.stringify(myList, null, 2));
