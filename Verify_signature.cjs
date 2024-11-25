const EC = require('elliptic').ec;
const crypto = require('crypto');

const ec = new EC('secp256k1');

function verifysignature(signature, publicKeyHex) {
    if (Array.isArray(publicKeyHex)) {
        publicKeyHex = publicKeyHex[0];
    }

    console.log('Public Key (Hex) is: ', publicKeyHex);

    const data = 'Helloworld';
    const hash = crypto.createHash('sha256').update(data).digest();

    const signatureHex = signature.toDER('hex');
    console.log('Signature (Hex) is: ', signatureHex);

    const publicKey = ec.keyFromPublic(publicKeyHex, 'hex');
    const isValid = publicKey.verify(hash, signature);
    console.log('Is the Signature Valid? ', isValid);

    return isValid;
}
module.exports = {verifysignature};



