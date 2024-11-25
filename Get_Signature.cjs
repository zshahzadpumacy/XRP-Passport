const EC = require('elliptic').ec;
const crypto = require('crypto');

const ec = new EC('secp256k1');

const privateKeyHex = '';
const keyPair = ec.keyFromPrivate(privateKeyHex);

// Declare the data to sign
const dataToSign = 'Helloworld';

// Generate the hash for the data
const hash = crypto.createHash('sha256').update(dataToSign).digest();

/**
 * Generates a signature for predefined data.
 * @returns {string} - The signature in hex format.
 */
function getSignature() {
    const signature = keyPair.sign(hash);
    return signature;
}

module.exports = { getSignature};

