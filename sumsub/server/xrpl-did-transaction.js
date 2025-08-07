import xrpl from 'xrpl';

export class XRPLDIDTransaction {
  constructor() {
    this.client = null;
    this.isConnected = false;
  }

  async connect() {
    try {
      this.client = new xrpl.Client("wss://s.devnet.rippletest.net:51233/");
      await this.client.connect();
      this.isConnected = this.client.isConnected();
      console.log("🔗 Connected to XRPL Devnet:", this.isConnected);
      return this.isConnected;
    } catch (error) {
      console.error('❌ Failed to connect to XRPL:', error.message);
      return false;
    }
  }

  async disconnect() {
    if (this.client && this.isConnected) {
      await this.client.disconnect();
      console.log("🔌 Disconnected from XRPL server.");
    }
  }

  // Validate seed format
  validateSeed(secret) {
    console.log(`🔍 Validating seed: ${secret.substring(0, 10)}...`);
    
    // Check if seed contains invalid characters
    const invalidChars = ['0', 'O', 'l', 'I'];
    for (const char of invalidChars) {
      if (secret.includes(char)) {
        console.error(`❌ Seed contains invalid character: ${char}`);
        return false;
      }
    }
    
    // Basic validation - check if it starts with 's' and has reasonable length
    if (!secret.startsWith('s') || secret.length < 25) {
      console.error('❌ Invalid seed format - should start with "s" and be at least 25 characters');
      return false;
    }
    
    console.log('✅ Seed is valid');
    return true;
  }

  // Create a proper IPFS URI and convert to hex
  createIPFSUri(ipfsHash) {
    // Create ipfs:// URI (not HTTP gateway URL)
    const ipfsUri = `ipfs://${ipfsHash}`;
    console.log(`IPFS URI: ${ipfsUri}`);
    
    // Convert to hex using XRPL helper
    const uriHex = xrpl.convertStringToHex(ipfsUri);
    console.log(`URI Hex: ${uriHex}`);
    
    return uriHex;
  }

  async createDIDTransaction(secret, ipfsResult) {
    try {
      console.log('\n🌐 CREATING XRPL DID TRANSACTION:');
      console.log('==================================');
      console.log(`IPFS Hash: ${ipfsResult.ipfsHash}`);
      console.log(`Full URI: ${ipfsResult.uri}`);
      
      // Validate the seed first
      if (!this.validateSeed(secret)) {
        throw new Error('Invalid seed provided');
      }
      
      // Connect to XRPL
      const connected = await this.connect();
      if (!connected) {
        throw new Error('Failed to connect to XRPL');
      }

      // Create wallet from seed
      console.log('🔑 Creating wallet from seed...');
      const wallet = xrpl.Wallet.fromSeed(secret);
      console.log(`Wallet address: ${wallet.address}`);
      console.log(`Public key: ${wallet.publicKey}`);

      // Validate the wallet address
      if (!xrpl.isValidClassicAddress(wallet.address)) {
        throw new Error('Invalid wallet address generated');
      }
      console.log('✅ Wallet address is valid');

      // Get current ledger info
      const ledgerInfo = await this.client.request({
        command: "ledger",
        ledger_index: "validated",
      });
      const currentLedgerIndex = ledgerInfo.result.ledger_index;
      console.log(`Current Ledger Index: ${currentLedgerIndex}`);

      // Create proper IPFS URI and convert to hex
      const uriHex = this.createIPFSUri(ipfsResult.ipfsHash);

      // Log all transaction parameters
      console.log('\n📋 TRANSACTION PARAMETERS:');
      console.log('==========================');
      console.log(`Account: ${wallet.address}`);
      console.log(`URI: ${uriHex}`);
      console.log(`SigningPubKey: ${wallet.publicKey}`);

      // Prepare the DID transaction with hex URI
      const prepared = await this.client.autofill({
        "TransactionType": "DIDSet",
        "Account": wallet.address,
        "URI": uriHex,
        "SigningPubKey": wallet.publicKey
      });

      const max_ledger = prepared.LastLedgerSequence;
      console.log(`Transaction cost: ${xrpl.dropsToXrp(prepared.Fee)} XRP`);
      console.log(`Transaction expires after ledger: ${max_ledger}`);

      // Sign the transaction
      const signed = wallet.sign(prepared);
      console.log(`Transaction signed with hash: ${signed.hash}`);

      // Submit and wait for result
      console.log('📤 Submitting transaction to XRPL...');
      const hst_result = await this.client.submitAndWait(signed.tx_blob);

      if (hst_result.result.meta.TransactionResult === "tesSUCCESS") {
        console.log('✅ DID Transaction succeeded!');
        console.log(`🔗 Transaction URL: https://devnet.xrpl.org/transactions/${signed.hash}`);
        
        return {
          success: true,
          transactionHash: signed.hash,
          transactionUrl: `https://devnet.xrpl.org/transactions/${signed.hash}`,
          account: wallet.address,
          uri: uriHex,
          ipfsUri: `ipfs://${ipfsResult.ipfsHash}`,
          fullUri: ipfsResult.uri,
          ipfsHash: ipfsResult.ipfsHash,
          fee: xrpl.dropsToXrp(prepared.Fee)
        };
      } else if (hst_result.result.meta.TransactionResult === "tecUNFUNDED_PAYMENT") {
        throw new Error('Issuer wallet does not have enough funds.');
      } else {
        throw new Error(`Transaction failed: ${hst_result.result.meta.TransactionResult}`);
      }

    } catch (error) {
      console.error('❌ DID Transaction failed:', error.message);
      throw error;
    } finally {
      await this.disconnect();
    }
  }

  async createDIDForCredential(secret, ipfsResult) {
    try {
      console.log('\n🎯 CREATING DID TRANSACTION FOR CREDENTIAL:');
      console.log('==========================================');
      console.log(`IPFS Hash: ${ipfsResult.ipfsHash}`);
      console.log(`URI: ${ipfsResult.uri}`);
      
      const result = await this.createDIDTransaction(secret, ipfsResult);
      
      console.log('\n✅ DID TRANSACTION SUCCESSFUL!');
      console.log('==============================');
      console.log(`Account: ${result.account}`);
      console.log(`Transaction Hash: ${result.transactionHash}`);
      console.log(`Transaction URL: ${result.transactionUrl}`);
      console.log(`Fee: ${result.fee} XRP`);
      console.log(`URI Hex: ${result.uri}`);
      console.log(`IPFS URI: ${result.ipfsUri}`);
      console.log(`Full IPFS URI: ${result.fullUri}`);
      console.log(`IPFS Hash: ${result.ipfsHash}`);
      
      return {
        ...result,
        credentialId: ipfsResult.credentialId,
        userId: ipfsResult.userId
      };
      
    } catch (error) {
      console.error('❌ DID transaction for credential failed:', error.message);
      throw error;
    }
  }
} 