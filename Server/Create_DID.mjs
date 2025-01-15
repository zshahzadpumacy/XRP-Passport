//const xrpl = require("xrpl");
//const r = require("ripple-keypairs");

import xrpl from 'xrpl'
import r from 'ripple-keypairs'

const client = new xrpl.Client("wss://s.devnet.rippletest.net:51233/");

export async function main(Secret, URI) {
    try {
        // Connect to the XRPL server
        await client.connect();

        // Once connected, check if the client is connected
        const isConnected = client.isConnected();
        console.log("Is connected:", isConnected);

        const wallet = xrpl.Wallet.fromSeed(Secret);
        console.log("Wallet address:", wallet.address);
        console.log("Wallet address:", wallet.publicKey);
   
        console.log("base = ", URI)

        const ledgerInfo = await client.request({
            command: "ledger",
            ledger_index: "validated",
        });
        const currentLedgerIndex = ledgerInfo.result.ledger_index;
        console.log("Current Ledger Index:", currentLedgerIndex);

        // Define LastLedgerSequence (add a buffer of 10 ledgers)
        const lastLedgerSequence = currentLedgerIndex + 10;

        const prepared = await client.autofill({
            "TransactionType": "DIDSet",
            "Account": wallet.address,
            "URI": URI,
            "SigningPubKey": wallet.publicKey
        })

        const max_ledger = prepared.LastLedgerSequence
        console.log("Prepared transaction instructions:", prepared)
        console.log("Transaction cost:", xrpl.dropsToXrp(prepared.Fee), "XRP")
        console.log("Transaction expires after ledger:", max_ledger)

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
        if (hst_result.result.meta.TransactionResult == "tesSUCCESS"){
            return true
        }
        //return hst_result.result.meta.TransactionResult
    } catch (error) {
        console.error("Error:", error);
        return false
    }
}

