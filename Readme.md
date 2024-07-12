# XRP Passport
For our solution we have followed the DID format of W3C standard which is:
<pre>"did:" method-name ":" method-specific-idstring</pre>
So our DID looks something like this:
<pre>did:xrpl:devnet:rHfXZxhm1We4auAUge6ANrbWsEXiXaGfyp</pre>
The specific components are:
- **method-name**: Method-name is **xrpl** which shows that this did belongs to XRP ledger.
- **network-id**: Network-id mentions on which XRPL network this ID is running on, which in our case is **devnet**.
- **xrpl-specific-idstring**: Xrpl-Specific-Idstring is basically XRPL address which is **rHfXZxhm1We4auAUge6ANrbWsEXiXaGfyp**

This repository contains files of ongoing work on XRP Passport project:
- DID Document Creation.
- DID object creation.
- Account Information.
- Extracting Public Key.

### DID Document Creation
A DID document (Decentralized Identifier Document) based on the W3C standard is gernerated. This document is like a profile that contains a cryptographic public key that the DID subject can use to authenticate itself and prove its association with the DID and the authenticity of stored data.
### DID Object Creation
A DID object is created after the scuuessfull implementation of DIDset transaction. For this transaction we derived a key pair from a secret to obtain the signingPubKey, one of the required parameters for DIDset transactions. Another requirement is a URI. To meet this, we created a DID JSON Document as mentioned above, uploaded it to the IPFS platform, and received a URL in return, which we converted into a hexadecimal string before using it. After successfully executing the DIDset transaction and creation of a DID object on the XRP devnet we also successfully tested DIDDelete transaction which we verified from XRP devnet explorer.
### Account Information
By using account_objects command we were able to view the changes that were made by our transactions such as the creation of the DID object, its deletion and reserve requirments. It helped us in testing and verifying our transactions.
### Extracting Public Key
This file was used to extract Public key which was used in DID Document creation.

## Accomplishments
Overall we are pleased with our progress as implementation of our decentralized solution is going smoothly. We were able to create a DID document according to W3C standard, store it on the IPFS decentralized storage platform and successfully create and delete a DID object on XRP ledger. Our transactions worked smoothly and their results were reflected in XRPL devnet explorer. Work on DID resolvber is also progressing smoothly whith hopes of using new verification methods.
## Challenges
We have encountered our fair share of issues during this journey. Since our solution is unique and one-of-a-kind on XRPL, there isn't enough documentation available for easy implementation. Creating a DID document based on the W3C standard was a major effort. We had to navigate through all the information to extract what was required for our solution. For instance, the W3C documentation mentions many verification methods, but we implemented public key verification and are exploring other verification methods supported by XRPL. We are in close contact with our mentor, Mayukha Vadari, and are working towards developing a DID resolver.
