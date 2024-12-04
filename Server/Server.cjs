const express = require('express');
const { exec } = require('child_process'); // To run external scripts
const { createRequire } = require('module'); // For importing ES modules

const app = express();
const PORT = 3000;

// Middleware to parse JSON body
app.use(express.json());

// Handle POST request
app.post('/run', async (req, res) => {
    const { scriptName, did, signature } = req.body; // Extract the scriptName, did, and signature from the request

    if (!scriptName || !did || !signature) {
        return res.status(400).json({ error: 'Script name, DID, and signature are required' });
    }

    try {
        // Use dynamic import to load the module and call the exported function
        const scriptModule = await import(`./${scriptName}.js`);
        
        // Pass the DID and signature to the verifySignature function
        const result = await scriptModule.verifySignature(did, signature); // Modified function to accept parameters

        res.json({ success: true, isValid: result });
    } catch (error) {
        console.error('Error executing script:', error);
        res.status(500).json({ error: 'Script execution failed', details: error.message });
    }
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
