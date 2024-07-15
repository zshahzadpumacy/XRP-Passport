const xrpl = require("xrpl");
const r = require("ripple-keypairs");

const client = new xrpl.Client("wss://s.devnet.rippletest.net:51233/");

async function main() {
    try {
        // Connect to the XRPL server
        await client.connect();

        // Once connected, check if the client is connected
        const isConnected = client.isConnected();
        console.log("Is connected:", isConnected);

        const secret = "";

        const keypair = r.deriveKeypair(secret);
        const signingPubKey = keypair.publicKey.toString("hex");  // Convert to hexadecimal
        console.log("SigningPubKey:", signingPubKey);

        const wallet = xrpl.Wallet.fromSeed(secret);
        console.log("Wallet address:", wallet.address);

        const max_ledger = xrpl.max_ledger

        data = "https://ipfs.io/ipfs/QmX6xiMuuUY2h6hLaLweh8tExSxNvdpqhPvFwdt1uTyxdo?filename=DID_Document.json"
        let hexadecimalString = Buffer.from(data, 'utf8').toString('hex');
        console.log("base = ", hexadecimalString)
        
        /* const prepared = await client.autofill({
            "TransactionType": "DIDDelete",
            "Account": wallet.address,
            "Fee": "12",
            "Sequence": max_ledger,
            "SigningPubKey": signingPubKey
        }) */

        const prepared = await client.autofill({
            "TransactionType": "DIDSet",
            "Account": wallet.address,
            "Fee": "10",
            "Sequence": max_ledger,
            "URI": hexadecimalString,
            "SigningPubKey": signingPubKey
        })

        const signed = wallet.sign(prepared)
        const hst_result = await client.submitAndWait(signed.tx_blob)

        if (hst_result.result.meta.TransactionResult == "tesSUCCESS") {
            console.log(`Transaction succeeded: https://devnet.xrpl.org/transactions/${signed.hash}`)
        } 
        else if (hst_result.result.meta.TransactionResult == "tecUNFUNDED_PAYMENT"){
            throw `Issuer wallet does not have enough funds.`
        }
        else {
            throw `Error sending transaction: ${hst_result.result.meta.TransactionResult}`
        }


        await client.disconnect();
        console.log("Disconnected from XRPL server.");
    } catch (error) {
        console.error("Error:", error);
    }
}

// Start the main function
main();
