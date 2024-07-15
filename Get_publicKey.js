const RippleAPI = require('ripple-lib').RippleAPI;

function getPublicKeyHex(secret) {
    const api = new RippleAPI(); // Create a new instance of RippleAPI
    try {
        const keypair = api.deriveKeypair(secret);
        const publicKeyHex = keypair.publicKey;
        return publicKeyHex;
    } catch (error) {
        console.error('Error deriving public key:', error);
        return null;
    }
}

// Example usage:
const secret = ''; // Your secret key
console.log('Public Key Hex:', getPublicKeyHex(secret));



