const express = require('express');
const { exec } = require('child_process'); // To run external scripts
const { createRequire } = require('module'); // For importing ES modules
const { getSignature } = require('./Get_Signature.cjs');


const app = express();
const PORT = 3000;

// Middleware to parse JSON body
app.use(express.json());

// Handle POST request
app.post('/run', async (req, res) => {
    const { scriptName } =req.body;
    if (scriptName == 'resolver') {
        const { scriptName, did, privateKeyHex } = req.body; // Extract the scriptName, did, and signature from the request

        if (!scriptName || !did || !privateKeyHex) {
            return res.status(400).json({ error: 'Script name, DID, and signature are required' });
        }

        try {
            const signature = getSignature(privateKeyHex);
            console.log(signature)
            // Use dynamic import to load the module and call the exported function
            const scriptModule = await import(`./${scriptName}.js`);
            
            // Pass the DID and signature to the verifySignature function
            const result = await scriptModule.verifySignature(did, signature); // Modified function to accept parameters

            res.json({ success: true, isValid: result });
        } catch (error) {
            console.error('Error executing script:', error);
            res.status(500).json({ error: 'Script execution failed', details: error.message });
        }
    } else {
        const { scriptName, Secret, URI } = req.body; // Extract the scriptName, did, and signature from the request

        if (!scriptName || !Secret || !URI) {
            return res.status(400).json({ error: 'Script name, DID, and signature are required' });
        }

        try {
            const scriptModule = await import(`./${scriptName}.mjs`);
            const result = await scriptModule.main(Secret, URI);
            print("Server response = ", result)

            res.json({ success: true, created: result });
        } catch (error) {
            console.error('Error executing script:', error);
            res.status(500).json({ error: 'Script execution failed', details: error.message });
        }
    }
    
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
