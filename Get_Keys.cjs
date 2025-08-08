const xrpl = require('xrpl');
const EC = require('elliptic').ec;
const crypto = require('crypto');
 
async function getAddressFromSeed(seed) {
  // Generate the wallet from the seed
  const wallet = xrpl.Wallet.fromSeed(seed);
  // Display the address
  console.log("Address:", wallet.address);
  console.log("Public Key:", wallet.publicKey);
  console.log("Private Key:", wallet.privateKey);

  const ec = new EC('secp256k1');

  // Use private key
  const privateKeyHex = wallet.privateKey; 
  const keyPair = ec.keyFromPrivate(privateKeyHex);

  // Get the public key (derived from the private key)
  const publicKeyHex = keyPair.getPublic('hex');
  console.log('Public Key (Hex):', publicKeyHex);
}
 
// seed
const seed = 'sEdVrVmBsWumHmp15BqHKSRWvsVDZGH';
 
getAddressFromSeed(seed);



