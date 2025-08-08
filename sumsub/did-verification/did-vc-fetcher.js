import { Client, convertHexToString } from 'xrpl';
import fetch from 'node-fetch';

const XRPL_NODE = 'wss://s.devnet.rippletest.net:51233';

export class DIDVCFetcher {
  constructor() {
    this.client = null;
  }

  // Extract account address from DID
  extractAccountFromDID(did) {
    // DID format: did:xrpl:rE3ovLPwowUMdCWbQNwnKxtdK78PtRs74H
    const parts = did.split(':');
    if (parts.length === 3 && parts[0] === 'did' && parts[1] === 'xrpl') {
      return parts[2];
    }
    throw new Error('Invalid XRPL DID format');
  }

  // Get DID object from XRPL
  async getDIDObject(address) {
    this.client = new Client(XRPL_NODE);
    await this.client.connect();
    
    try {
      const result = await this.client.request({
        command: 'ledger_entry',
        did: address,
      });
      
      return result.result.node;
    } catch (error) {
      if (error.message === 'entryNotFound') {
        throw new Error('DID not found on XRPL');
      }
      throw error;
    } finally {
      await this.client.disconnect();
    }
  }

  // Extract URI from DID object and fetch VC
  async getVCFromDID(did) {
    try {
      console.log(`🔍 Fetching DID: ${did}`);
      
      const address = this.extractAccountFromDID(did);
      console.log(`Account address: ${address}`);
      
      const didObject = await this.getDIDObject(address);
      
      if (didObject.LedgerEntryType !== 'DID') {
        throw new Error('Unexpected LedgerEntryType - not a DID');
      }

      // Convert hex URI to readable format
      const uri = convertHexToString(didObject.URI);
      console.log(`📄 URI found: ${uri}`);
      
      // Fetch the VC from the URI
      const vc = await this.fetchVCFromURI(uri);
      
      return {
        success: true,
        did: did,
        address: address,
        uri: uri,
        vc: vc
      };
      
    } catch (error) {
      console.error('❌ Error fetching VC from DID:', error.message);
      return {
        success: false,
        error: error.message,
        did: did
      };
    }
  }

  // Convert IPFS URI to Pinata URL
  convertIPFSUriToPinataUrl(uri) {
    // Handle different URI formats
    if (uri.startsWith('ipfs://')) {
      // Extract IPFS hash from ipfs://QmHash
      const ipfsHash = uri.replace('ipfs://', '');
      return `https://ivory-bitter-tiglon-303.mypinata.cloud/ipfs/${ipfsHash}`;
    } else if (uri.startsWith('Qm') || uri.startsWith('bafy')) {
      // Direct IPFS hash
      return `https://ivory-bitter-tiglon-303.mypinata.cloud/ipfs/${uri}`;
    } else if (uri.includes('mypinata.cloud')) {
      // Already a Pinata URL
      return uri;
    } else {
      // Assume it's a direct URL
      return uri;
    }
  }

  // Fetch VC from URI (Pinata or other IPFS gateway)
  async fetchVCFromURI(uri) {
    try {
      console.log(`📥 Fetching VC from: ${uri}`);
      
      // Convert IPFS URI to Pinata URL
      const pinataUrl = this.convertIPFSUriToPinataUrl(uri);
      console.log(`🔄 Converted to Pinata URL: ${pinataUrl}`);
      
      const response = await fetch(pinataUrl);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch VC: ${response.status} - ${response.statusText}`);
      }
      
      const vc = await response.json();
      console.log('✅ VC fetched successfully');
      
      return vc;
      
    } catch (error) {
      console.error('❌ Error fetching VC from URI:', error.message);
      throw error;
    }
  }

  // Main function to get VC using DID and private key
  async getVCWithDIDAndKey(did, privateKey) {
    try {
      console.log('\n🎯 FETCHING VC WITH DID AND PRIVATE KEY');
      console.log('==========================================');
      console.log(`DID: ${did}`);
      console.log(`Private Key: ${privateKey.substring(0, 10)}...`);
      
      // Step 1: Get VC from DID
      const result = await this.getVCFromDID(did);
      
      if (!result.success) {
        throw new Error(result.error);
      }
      
      console.log('\n✅ VC FETCHED SUCCESSFULLY!');
      console.log('=============================');
      console.log(`DID: ${result.did}`);
      console.log(`Address: ${result.address}`);
      console.log(`URI: ${result.uri}`);
      
      // Step 2: Display VC details
      if (result.vc) {
        console.log('\n📜 VC DETAILS:');
        console.log('===============');
        console.log(`ID: ${result.vc.id || 'N/A'}`);
        console.log(`Type: ${result.vc.type ? result.vc.type.join(', ') : 'N/A'}`);
        console.log(`Issuer: ${result.vc.issuer || 'N/A'}`);
        console.log(`Issuance Date: ${result.vc.issuanceDate || 'N/A'}`);
        
        if (result.vc.credentialSubject?.kycVerification) {
          const kyc = result.vc.credentialSubject.kycVerification;
          console.log(`KYC Status: ${kyc.status || 'N/A'}`);
          console.log(`KYC Applicant ID: ${kyc.applicantId || 'N/A'}`);
          console.log(`KYC External User ID: ${kyc.externalUserId || 'N/A'}`);
        }
      }
      
      return result;
      
    } catch (error) {
      console.error('❌ Error in getVCWithDIDAndKey:', error.message);
      throw error;
    }
  }
} 