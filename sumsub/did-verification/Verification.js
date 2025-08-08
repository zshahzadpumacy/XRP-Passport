import { DIDVCFetcher } from './did-vc-fetcher.js';
import readline from 'readline';

// Function to get user input
function getUserInput() {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    console.log('\n🧪 DID VERIFICATION REQUEST');
    console.log('============================');
    console.log('Please enter your credentials:');
    console.log('');

    rl.question('Enter your DID (e.g., did:xrpl:rnK1a4KBtitcxPkK6M2Lu8kfLEjtnx7zDS): ', (did) => {
      if (!did || did.trim() === '') {
        console.error('❌ DID is required!');
        rl.close();
        process.exit(1);
      }

      rl.question('Enter your private key (e.g., sEd7FfYmEZw2RCCC7Z9sfQqRqUwVw68): ', (privateKey) => {
        if (!privateKey || privateKey.trim() === '') {
          console.error('❌ Private key is required!');
          rl.close();
          process.exit(1);
        }

        rl.close();
        resolve({ 
          did: did.trim(), 
          privateKey: privateKey.trim() 
        });
      });
    });
  });
}

async function testVCFetcher() {
  try {
    // Get user input
    const { did, privateKey } = await getUserInput();
    
    console.log(`\nDID: ${did}`);
    console.log(`Private Key: ${privateKey.substring(0, 10)}...`);
    console.log('');
    
    console.log('🎯 FETCHING VC WITH DID AND PRIVATE KEY');
    console.log('==========================================');
    console.log(`DID: ${did}`);
    console.log(`Private Key: ${privateKey.substring(0, 10)}...`);
    console.log('');
    
    const fetcher = new DIDVCFetcher();
    const result = await fetcher.getVCWithDIDAndKey(did, privateKey);
    
    if (result.success) {
      console.log('\n✅ VC FETCHED SUCCESSFULLY!');
      console.log('=============================');
      console.log(`DID: ${result.did}`);
      console.log(`Address: ${result.address}`);
      console.log(`URI: ${result.uri}`);
      
      console.log('\n📜 VC DETAILS:');
      console.log('===============');
      console.log(`ID: ${result.vc.id}`);
      console.log(`Type: ${result.vc.type.join(', ')}`);
      console.log(`Issuer: ${result.vc.issuer}`);
      console.log(`Issuance Date: ${result.vc.issuanceDate}`);
      console.log(`KYC Status: ${result.vc.credentialSubject.kycVerification.status}`);
      console.log(`KYC Applicant ID: ${result.vc.credentialSubject.kycVerification.applicantId}`);
      console.log(`KYC External User ID: ${result.vc.credentialSubject.kycVerification.externalUserId}`);
      
      console.log('\n✅ DID VERIFICATION COMPLETED');
      console.log('==============================');
      
    } else {
      console.log('\n❌ VERIFICATION FAILED');
      console.log('=======================');
      console.log(`Error: ${result.error}`);
    }
    
    return result;
    
  } catch (error) {
    console.error('\n❌ VERIFICATION ERROR');
    console.error('=====================');
    console.error(`Error: ${error.message}`);
    return { success: false, error: error.message };
  }
}

// Run test if this file is executed directly
testVCFetcher()
  .then(result => {
    if (result.success) {
      process.exit(0);
    } else {
      console.log('\n❌ Library test failed!');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('\n❌ Library test error:', error.message);
    process.exit(1);
  });

export { testVCFetcher }; 