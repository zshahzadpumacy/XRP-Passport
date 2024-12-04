import { Resolver } from 'did-resolver';
import { getResolver } from './xrpl-did-resolver.js';
import { getSignature } from './Get_Signature.cjs';
import pkg from './Verify_signature.cjs';

const { verifysignature } = pkg;


// Exportable function that accepts DID and signature as parameters
export async function verifySignature(did, signature) {
    try {
        const xrplResolver = getResolver();
        const didResolver = new Resolver({ ...xrplResolver });

        const doc = await didResolver.resolve(did); // Use the provided DID

        const publicKeyHex = doc.didDocument?.publicKey?.map(key => key.publicKeyHex);
        const isValid = verifysignature(signature, publicKeyHex);

        return isValid; // Return true or false
    } catch (error) {
        console.error('Error during signature verification:', error);
        return false; // Return false in case of an error
    }
}
