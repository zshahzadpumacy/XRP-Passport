import { Resolver } from 'did-resolver'
import { getResolver } from './xrpl-did-resolver.js'
import { getSignature} from './Get_Signature.cjs';
import pkg from './Verify_signature.cjs';
const { verifysignature } = pkg;


const signature = getSignature();

const xrplResolver = getResolver()

const didResolver = new Resolver({
    ...xrplResolver
})

;(async () => {
    const doc = await didResolver.resolve('did:xrpl:r9ZzpADNRATj1r6sHYANB5Rv63PoLoHSz')
    
    const publicKeyHex = doc.didDocument?.publicKey?.map(key => key.publicKeyHex);

    const isValid = verifysignature(signature, publicKeyHex);
    console.log('Signature valid:', isValid);

})();