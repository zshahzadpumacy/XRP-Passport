import crypto from 'crypto';
import xrpl from 'xrpl';
import pkg from 'elliptic';
const { ec: EC } = pkg;
import readline from 'readline';
import fs from 'fs/promises';
import { PinataUploader } from './pinata-uploader.js';
import { XRPLDIDTransaction } from './xrpl-did-transaction.js';

const ec = new EC('secp256k1');

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Promise wrapper for readline
function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

// Integrated Verifiable Credential system for webhook pipeline
export class IntegratedVerifiableCredential {
  constructor() {
    this.didDocument = null;
    this.issuerDid = null;
    this.publicKeyHex = null;
    this.privateKey = null;
    this.isInitialized = false;
    this.pinataUploader = new PinataUploader();
    this.xrplDIDTransaction = new XRPLDIDTransaction();
  }

  // Initialize with XRPL seed (called when webhook is received)
  async initializeWithSeed(seed = null) {
    console.log('🔐 Initializing Verifiable Credential System\n');
    
    try {
      // Prompt for seed if not provided
      let finalSeed = seed;
      if (!finalSeed) {
        finalSeed = await question('🔑 Enter your XRPL seed (or press Enter for default): ');
        finalSeed = finalSeed.trim() || 'sEd7FfYmEZw2RCCC7Z9sfQqRqUwVw68';
      }
      
      console.log(`\nUsing seed: ${finalSeed.substring(0, 10)}...`);
      
      // Derive wallet from seed
      const wallet = await this.getAddressFromSeed(finalSeed);
      
      if (!wallet) {
        console.log('❌ Failed to derive wallet. Exiting.');
        return false;
      }
      
      // Create DID document
      this.didDocument = this.createDIDDocument(wallet.address, wallet.publicKeyHex);
      this.issuerDid = this.didDocument.id;
      this.publicKeyHex = wallet.publicKeyHex;
      this.privateKey = wallet.privateKey;
      this.seed = finalSeed; // Store the original seed
      this.isInitialized = true;
      
      console.log('\n📜 DID DOCUMENT CREATED:');
      console.log('========================');
      console.log(`DID: ${this.didDocument.id}`);
      console.log(`Address: ${wallet.address}`);
      console.log(`Public Key: ${this.publicKeyHex.substring(0, 20)}...`);
      
      return true;
      
    } catch (error) {
      console.error('❌ Error during initialization:', error.message);
      return false;
    }
  }

  // Initialize without interactive prompts (for production webhook use)
  async initializeWithDefaultSeed(seed = null) {
    console.log('🔐 Initializing Verifiable Credential System (Production Mode)\n');
    
    try {
      // Use provided seed or default
      let finalSeed = seed || 'sEd7FfYmEZw2RCCC7Z9sfQqRqUwVw68';
      console.log(`\nUsing seed: ${finalSeed.substring(0, 10)}...`);
      
      // Derive wallet from seed
      const wallet = await this.getAddressFromSeed(finalSeed);
      
      if (!wallet) {
        console.log('❌ Failed to derive wallet. Exiting.');
        return false;
      }
      
      // Create DID document
      this.didDocument = this.createDIDDocument(wallet.address, wallet.publicKeyHex);
      this.issuerDid = this.didDocument.id;
      this.publicKeyHex = wallet.publicKeyHex;
      this.privateKey = wallet.privateKey;
      this.seed = finalSeed; // Store the original seed
      this.isInitialized = true;
      
      console.log('\n📜 DID DOCUMENT CREATED:');
      console.log('========================');
      console.log(`DID: ${this.didDocument.id}`);
      console.log(`Address: ${wallet.address}`);
      console.log(`Public Key: ${this.publicKeyHex.substring(0, 20)}...`);
      
      return true;
      
    } catch (error) {
      console.error('❌ Error during initialization:', error.message);
      return false;
    }
  }

  async getAddressFromSeed(seed) {
    try {
      // Generate the wallet from the seed
      const wallet = xrpl.Wallet.fromSeed(seed);
      
      console.log("\n🔑 XRPL WALLET DERIVED:");
      console.log("==========================");
      console.log(`Address: ${wallet.address}`);
      console.log(`Public Key: ${wallet.publicKey}`);
      console.log(`Private Key: ${wallet.privateKey}`);

      // Use elliptic curve for key derivation
      const privateKeyHex = wallet.privateKey;
      const keyPair = ec.keyFromPrivate(privateKeyHex);
      const publicKeyHex = keyPair.getPublic('hex');
      
      console.log(`Public Key (Hex): ${publicKeyHex}`);
      
      return {
        address: wallet.address,
        publicKey: wallet.publicKey,
        privateKey: wallet.privateKey,
        publicKeyHex: publicKeyHex
      };
    } catch (error) {
      console.error('❌ Error deriving wallet:', error.message);
      return null;
    }
  }

  createDIDDocument(address, publicKeyHex) {
    return {
      "@context": "https://w3id.org/did/v1",
      "id": `did:xrpl:${address}`,
      "publicKey": [
        {
          "id": `did:xrpl:${address}`,
          "type": "Secp256k1VerificationKey2018",
          "controller": `did:xrpl:${address}`,
          "publicKeyHex": publicKeyHex
        }
      ],
      "assertionMethod": [
        `did:xrpl:${address}`
      ],
      "authentication": [
        `did:xrpl:${address}`
      ]
    };
  }

  // Create verifiable credential from Sumsub webhook data
  async createKYCVerifiableCredential(applicantId, externalUserId, verificationResult, verificationData) {
    if (!this.isInitialized) {
      throw new Error('VC system not initialized. Call initializeWithSeed() first.');
    }

    const now = new Date();
    const expirationDate = new Date(now.getTime() + (365 * 24 * 60 * 60 * 1000)); // 1 year
    
    const credential = {
      "@context": [
        "https://www.w3.org/2018/credentials/v1",
        "https://www.w3.org/2018/credentials/examples/v1"
      ],
      "id": `${this.issuerDid}#kyc-${applicantId}`,
      "type": [
        "VerifiableCredential",
        "KYCVerificationCredential"
      ],
      "issuer": this.issuerDid,
      "issuanceDate": now.toISOString(),
      "expirationDate": expirationDate.toISOString(),
      "credentialSubject": {
        "id": `did:example:${externalUserId}`,
        "kycVerification": {
          "status": verificationResult.reviewAnswer,
          "applicantId": applicantId,
          "externalUserId": externalUserId,
          "verificationLevel": verificationData.levelName || "basic-kyc-de",
          "verificationDate": now.toISOString(),
          "issuer": "Sumsub",
          "verificationData": verificationData
        }
      },
      "credentialSchema": {
        "id": "https://schema.org/KYCVerificationCredential",
        "type": "JsonSchemaValidator2018"
      }
    };

    // Sign the credential with XRPL private key
    const signedCredential = this.signCredential(credential);
    
    console.log('\n🎯 VERIFIABLE CREDENTIAL CREATED:');
    console.log('==================================');
    console.log(`Applicant ID: ${applicantId}`);
    console.log(`External User ID: ${externalUserId}`);
    console.log(`Status: ${verificationResult.reviewAnswer}`);
    console.log(`Issuer: ${this.issuerDid}`);
    console.log(`Signed: ✅ Yes (with XRPL private key)`);

    return signedCredential;
  }

  // Sign the verifiable credential using Secp256k1
  signCredential(credential) {
    const normalizedCredential = this.normalizeCredential(credential);
    const signature = this.createSecp256k1Signature(normalizedCredential);
    
    return {
      ...credential,
      "proof": {
        "type": "Secp256k1Signature2018",
        "created": new Date().toISOString(),
        "verificationMethod": `${this.issuerDid}#keys-1`,
        "proofPurpose": "assertionMethod",
        "jws": signature
      }
    };
  }

  // Normalize credential for signing (removes proof if exists)
  normalizeCredential(credential) {
    const normalized = { ...credential };
    delete normalized.proof;
    return JSON.stringify(normalized, Object.keys(normalized).sort());
  }

  // Create Secp256k1 signature (compatible with XRPL)
  createSecp256k1Signature(data) {
    if (!this.privateKey) {
      throw new Error('Private key not available');
    }

    const hash = crypto.createHash('sha256').update(data).digest();
    const keyPair = ec.keyFromPrivate(this.privateKey);
    const signature = keyPair.sign(hash);
    
    return signature.toDER('hex');
  }

  // Verify a verifiable credential
  verifyCredential(verifiableCredential) {
    try {
      const credential = { ...verifiableCredential };
      const proof = credential.proof;
      
      if (!proof) {
        return { isValid: false, error: 'No proof found in credential' };
      }

      delete credential.proof;
      const normalizedCredential = this.normalizeCredential(credential);
      
      // Verify signature using Secp256k1
      const hash = crypto.createHash('sha256').update(normalizedCredential).digest();
      const keyPair = ec.keyFromPublic(this.publicKeyHex, 'hex');
      
      const isValid = keyPair.verify(hash, proof.jws);
      
      return {
        isValid,
        error: isValid ? null : 'Invalid signature'
      };
    } catch (error) {
      return {
        isValid: false,
        error: `Verification error: ${error.message}`
      };
    }
  }

  // Store credential to file
  async storeCredential(verifiableCredential, userId) {
    const filename = `${userId}-kyc-credential.json`;
    const filepath = `./credentials/${filename}`;
    
    // Ensure credentials directory exists
    try {
      await fs.mkdir('./credentials', { recursive: true });
    } catch (error) {
      // Directory already exists
    }
    
    await fs.writeFile(filepath, JSON.stringify(verifiableCredential, null, 2));
    console.log(`\n💾 Credential stored: ${filepath}`);
    return filepath;
  }

  // Upload credential to Pinata IPFS
  async uploadCredentialToIPFS(verifiableCredential, userId) {
    try {
      console.log('\n🌐 UPLOADING TO IPFS VIA PINATA:');
      console.log('==================================');
      
      const uploadResult = await this.pinataUploader.uploadVerifiableCredential(verifiableCredential, userId);
      
      console.log('\n✅ IPFS UPLOAD SUCCESSFUL!');
      console.log('============================');
      console.log(`IPFS Hash: ${uploadResult.ipfsHash}`);
      console.log(`URI: ${uploadResult.uri}`);
      console.log(`Hex: ${uploadResult.hexadecimalString}`);
      console.log(`Credential ID: ${uploadResult.credentialId}`);
      console.log(`User ID: ${uploadResult.userId}`);
      console.log(`Upload Date: ${uploadResult.uploadDate}`);
      
      return uploadResult;
      
    } catch (error) {
      console.error('❌ IPFS upload failed:', error.message);
      throw error;
    }
  }

  // Create DID transaction on XRPL
  async createDIDTransaction(secret, ipfsResult) {
    try {
      const didResult = await this.xrplDIDTransaction.createDIDForCredential(secret, ipfsResult);
      
      console.log('\n✅ XRPL DID TRANSACTION SUCCESSFUL!');
      console.log('====================================');
      console.log(`Account: ${didResult.account}`);
      console.log(`Transaction Hash: ${didResult.transactionHash}`);
      console.log(`Transaction URL: ${didResult.transactionUrl}`);
      console.log(`Fee: ${didResult.fee} XRP`);
      console.log(`URI: ${didResult.uri}`);
      
      return didResult;
      
    } catch (error) {
      console.error('❌ XRPL DID transaction failed:', error.message);
      throw error;
    }
  }

  // Complete VC creation with local storage, IPFS upload, and XRPL DID transaction
  async createAndStoreCredential(applicantId, externalUserId, verificationResult, verificationData) {
    try {
      // Create the credential
      const credential = await this.createKYCVerifiableCredential(
        applicantId,
        externalUserId,
        verificationResult,
        verificationData
      );
      
      // Store locally
      const localPath = await this.storeCredential(credential, externalUserId);
      
      // Upload to IPFS
      const ipfsResult = await this.uploadCredentialToIPFS(credential, externalUserId);
      
      // Create DID transaction on XRPL
      const didResult = await this.createDIDTransaction(this.seed, ipfsResult);
      
      return {
        credential,
        localPath,
        ipfsResult,
        didResult
      };
      
    } catch (error) {
      console.error('❌ Error in complete VC creation:', error.message);
      throw error;
    }
  }

  // Get stored credential
  async getStoredCredential(userId) {
    const filename = `${userId}-kyc-credential.json`;
    const filepath = `./credentials/${filename}`;
    
    try {
      const data = await fs.readFile(filepath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      return null;
    }
  }

  // Close readline interface
  close() {
    if (rl) {
      rl.close();
    }
  }
}

// Export the DID document for compatibility
export const DID_DOCUMENT = {
  "@context": "https://w3id.org/did/v1",
  "id": "did:xrpl:rE3ovLPwowUMdCWbQNwnKxtdK78PtRs74H",
  "publicKey": [
    {
      "id": "did:xrpl:rE3ovLPwowUMdCWbQNwnKxtdK78PtRs74H",
      "type": "Secp256k1VerificationKey2018",
      "controller": "did:xrpl:rE3ovLPwowUMdCWbQNwnKxtdK78PtRs74H",
      "publicKeyHex": "045A496BFFC3BCFE94644160F614336FE12CE8D120C08935B2F5A5CCCB5216E0DA38483533C4AAD3335CE0BEC8E6C6B1A63BBDFEDFF239A01E93134"
    }
  ],
  "assertionMethod": [
    "did:xrpl:rE3ovLPwowUMdCWbQNwnKxtdK78PtRs74H"
  ],
  "authentication": [
    "did:xrpl:rE3ovLPwowUMdCWbQNwnKxtdK78PtRs74H"
  ]
}; 