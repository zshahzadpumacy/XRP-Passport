import FormData from 'form-data';
import fetch from 'node-fetch';

export class PinataUploader {
  constructor() {
    this.PINATA_JWT = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySW5mb3JtYXRpb24iOnsiaWQiOiJjYTEzZjI2My04ZjYxLTRlZTktOGU5ZS1lODhiMjkyY2NhYjQiLCJlbWFpbCI6InpzaGFoemFkcHVtYWN5QGdtYWlsLmNvbSIsImVtYWlsX3ZlcmlmaWVkIjp0cnVlLCJwaW5fcG9saWN5Ijp7InJlZ2lvbnMiOlt7ImRlc2lyZWRSZXBsaWNhdGlvbkNvdW50IjoxLCJpZCI6IkZSQTEifSx7ImRlc2lyZWRSZXBsaWNhdGlvbkNvdW50IjoxLCJpZCI6Ik5ZQzEifV0sInZlcnNpb24iOjF9LCJtZmFfZW5hYmxlZCI6ZmFsc2UsInN0YXR1cyI6IkFDVElWRSJ9LCJhdXRoZW50aWNhdGlvblR5cGUiOiJzY29wZWRLZXkiLCJzY29wZWRLZXlLZXkiOiI2MWI1ZTY0MjM4MDY1ZDdlMjRmOCIsInNjb3BlZEtleVNlY3JldCI6Ijk0OTMyMDdhNTM5MGI2YWMwMjQxODI5NjIzZjJlZjczYzkxZDU4OWUwMTM2NWVkMDg5YzY0MjNlZDIyMjAyZjgiLCJleHAiOjE3NjYxNDY3OTV9.f6_DwmfqOU5C5isMZYd5Nxx3Je5k2aPriJv58O_yNjE";
    this.UPLOAD_URL = "https://api.pinata.cloud/pinning/pinFileToIPFS";
  }

  async uploadDIDDocument(jsonContent, filename = "DID_Document.json") {
    try {
      console.log('📤 Uploading to Pinata IPFS...');
      
      // Create form data
      const formData = new FormData();
      formData.append('file', Buffer.from(jsonContent), {
        filename: filename,
        contentType: 'text/plain'
      });

      // Make the request
      const response = await fetch(this.UPLOAD_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.PINATA_JWT}`,
          ...formData.getHeaders()
        },
        body: formData
      });

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.status} - ${response.statusText}`);
      }

      const responseData = await response.json();
      const ipfsHash = responseData.IpfsHash;
      
      // Match Android implementation exactly
      const uri = `https://ivory-bitter-tiglon-303.mypinata.cloud/ipfs/${ipfsHash}`;
      
      // Convert URI to hexadecimal (same as Android code)
      const bytes = Buffer.from(uri, 'utf8');
      const hexadecimalString = bytes.toString('hex');
      
      console.log('✅ Upload successful!');
      console.log(`   IPFS Hash: ${ipfsHash}`);
      console.log(`   URI: ${uri}`);
      console.log(`   Hex: ${hexadecimalString}`);
      
      return {
        ipfsHash,
        uri,
        hexadecimalString
      };
      
    } catch (error) {
      console.error('❌ Upload failed:', error.message);
      throw error;
    }
  }

  async uploadVerifiableCredential(credential, userId) {
    try {
      const filename = `${userId}-kyc-credential.json`;
      const jsonContent = JSON.stringify(credential, null, 2);
      
      console.log(`📤 Uploading VC for user ${userId}...`);
      
      const result = await this.uploadDIDDocument(jsonContent, filename);
      
      // Add metadata to the result
      result.credentialId = credential.id;
      result.userId = userId;
      result.uploadDate = new Date().toISOString();
      
      return result;
      
    } catch (error) {
      console.error('❌ VC upload failed:', error.message);
      throw error;
    }
  }
} 