import { Resolver } from 'did-resolver';
import { Client, convertHexToString } from 'xrpl';
import { Errors } from './utils.js';

const XRPL_NODE = 'wss://s.devnet.rippletest.net:51233';

async function getDIDObject(address) {
  const client = new Client(XRPL_NODE);
  await client.connect();
  let result;
  try {
    result = await client.request({
      command: 'ledger_entry',
      did: address,
    });
  } catch (e) {
    if (e.message === 'entryNotFound') {
      throw new Error(Errors.notFound);
    }
    console.log(e.message);
    throw e;
  } finally {
    await client.disconnect();
  }
  return result.result.node;
}

async function getDID(address) {
  const object = await getDIDObject(address);

  if (object.LedgerEntryType !== 'DID') {
    throw new Error('Unexpected LedgerEntryType');
  }

  let decodedData = Buffer.from(object.URI, 'hex').toString('utf8');
  console.log("DID Document URL is: ", decodedData);

  try {
    const response = await fetch(decodedData);
    if (!response.ok) {
      throw new Error("Network response was not ok " + response.statusText);
    }

    const jsonData = await response.json(); // Parse the response as JSON
    
    return jsonData;

  } catch (error) {
    console.error("Error fetching JSON document:", error);
    return null;
  }
}


async function processDID(did, address) {
  let result;
  try {
    result = await getDID(address);
    
    if (typeof result === "object") {
      
  } else if (typeof result === "string") {
      
  }
  
    if (typeof result !== 'object') {
      return {
        error: {
          error: Errors.unsupportedFormat,
          message: 'DID does not resolve to a valid document containing a JSON document',
        },
      };
    }
    const docIdMatchesDid = result?.id === did;
    if (!docIdMatchesDid) {
      return {
        error: {
          error: Errors.notFound,
          message: 'resolver_error: DID document id does not match requested DID',
        },
      };
    }
  } catch (error) {
    if (error.message === Errors.notFound) {
      return { error: { error: 'notFound', message: 'notFound' } };
    } else {
      console.log(error.message);
      return {
        error: {
          error: Errors.unsupportedFormat,
          message: `resolver_error: DID must resolve to a valid document containing a JSON document: ${error}`,
        },
      };
    }
  }
  return { result };
}

export function getResolver() {
  async function resolve(did, parsed) {
    const address = parsed.id;

    const didDocumentMetadata = {};
    const result = await processDID(did, address);
    if (result.error) {
      return {
        didDocument: null,
        didDocumentMetadata,
        didResolutionMetadata: result.error,
      };
    }
    const didDocument = result.result || null;

    const contentType =
      typeof didDocument?.['@context'] !== 'undefined'
        ? 'application/did+ld+json'
        : 'application/did+json';

    return {
      didDocument,
      didDocumentMetadata,
      didResolutionMetadata: { contentType },
    };
  }

  return { xrpl: resolve };
}
