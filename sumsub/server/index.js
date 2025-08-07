import express from 'express'
import crypto   from 'crypto'
import dotenv   from 'dotenv'
import { createReadStream } from 'fs'
import { join } from 'path'
import { fileURLToPath } from 'url'
import { IntegratedVerifiableCredential } from './verifiable-credential-integrated.js';

dotenv.config()

const __filename = fileURLToPath(import.meta.url)
const __dirname = join(__filename, '..')

const { SUMSUB_APP_TOKEN, SUMSUB_SECRET_KEY, SUMSUB_WEBHOOK_SECRET, PORT = 3000 } = process.env
const app = express()

// Initialize VC system
const integratedVC = new IntegratedVerifiableCredential();

/* ---------- helpers ---------- */
async function createSdkToken(userId, level = 'basic-kyc-de', ttl = 600) {
  const body = JSON.stringify({ userId, levelName: level, ttlInSecs: ttl })
  const ts   = Math.floor(Date.now() / 1000).toString()
  const path = '/resources/accessTokens/sdk'
  const sig  = crypto.createHmac('sha256', SUMSUB_SECRET_KEY)
                     .update(ts + 'POST' + path + body)
                     .digest('hex')

  const res  = await fetch('https://api.sumsub.com' + path, {
    method : 'POST',
    headers: {
      'X-App-Token'    : SUMSUB_APP_TOKEN,
      'X-App-Access-Ts': ts,
      'X-App-Access-Sig': sig,
      'Content-Type'   : 'application/json'
    },
    body
  })
  if (!res.ok) throw new Error(await res.text())
  return (await res.json()).token
}

/* ---------- middleware ---------- */
app.set('view engine', 'ejs')
app.use(express.static('public'))                 // if you add CSS/JS later
app.set('views', 'views');

// Serve Sumsub SDK locally as fallback
app.get('/sdk/sns-websdk-builder.js', async (req, res) => {
  res.setHeader('Content-Type', 'application/javascript')
  res.setHeader('Cache-Control', 'public, max-age=3600')
  
  try {
    // Try to proxy from CDN directly
    const response = await fetch('https://static.sumsub.com/idensic/static/1.0/sns-websdk-builder.js')
    if (!response.ok) {
      throw new Error(`CDN responded with ${response.status}`)
    }
    response.body.pipe(res)
  } catch (error) {
    console.log('CDN failed, serving local fallback SDK')
    // Serve the local fallback file
    const localPath = join(__dirname, '..', 'public', 'sdk', 'sns-websdk-builder.js')
    try {
      createReadStream(localPath).pipe(res)
    } catch (localError) {
      console.error('Failed to serve local SDK:', localError.message)
      res.status(500).send('// SDK loading failed - check console for details')
    }
  }
})

/* ---------- routes ---------- */
// Debug route to check environment
app.get('/debug', (req, res) => {
  res.json({
    hasAppToken: !!SUMSUB_APP_TOKEN,
    hasSecretKey: !!SUMSUB_SECRET_KEY,
    hasWebhookSecret: !!SUMSUB_WEBHOOK_SECRET,
    appTokenLength: SUMSUB_APP_TOKEN?.length || 0,
    secretKeyLength: SUMSUB_SECRET_KEY?.length || 0,
    webhookSecretLength: SUMSUB_WEBHOOK_SECRET?.length || 0,
    serverUrl: `http://localhost:${PORT}`,
    kycUrl: `http://localhost:${PORT}/kyc`,
    webhookUrl: `https://383d44d3712e.ngrok-free.app/sumsub/webhook`
  })
})

// KYC page
app.get('/kyc', async (req, res, next) => {
  try {
    if (!SUMSUB_APP_TOKEN || !SUMSUB_SECRET_KEY) {
      return res.status(500).send(`
        <h1>Configuration Error</h1>
        <p>Missing environment variables:</p>
        <ul>
                  <li>SUMSUB_APP_TOKEN: ${SUMSUB_APP_TOKEN ? '✅ Set' : '❌ Missing'}</li>
        <li>SUMSUB_SECRET_KEY: ${SUMSUB_SECRET_KEY ? '✅ Set' : '❌ Missing'}</li>
        </ul>
        <p>Please check your .env file and restart the server.</p>
      `)
    }
    
    // Allow dynamic userId from query parameter, default to 'zsa-123'
    const userId = req.query.userId || 'zsa-123'
    const sdkToken = await createSdkToken(userId)
    res.render('kyc', { sdkToken, userId })
  } catch (e) { 
    console.error('Error creating SDK token:', e)
    res.status(500).send(`
      <h1>Token Creation Error</h1>
      <p>${e.message}</p>
      <p>Check your Sumsub credentials and try again.</p>
    `)
  }
})

// Credential viewer page
app.get('/credential-viewer', (req, res) => {
  res.render('credential');
})

// token refresh (SDK calls this if TTL expires)
app.get('/refreshToken', async (req, res, next) => {
  try {
    const { userId, levelName } = req.query
    if (!userId) {
      return res.status(400).send('userId is required')
    }
    res.send(await createSdkToken(userId, levelName))
  } catch (e) { next(e) }
})

// Verifiable Credential endpoints
app.get('/credential/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const credential = await vc.getStoredCredential(userId);
    
    if (!credential) {
      return res.status(404).json({ error: 'Credential not found' });
    }
    
    res.json({
      success: true,
      credential,
      didDocument: DID_DOCUMENT
    });
  } catch (error) {
    console.error('Error retrieving credential:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/credential/:userId/presentation', async (req, res) => {
  try {
    const { userId } = req.params;
    const credential = await vc.getStoredCredential(userId);
    
    if (!credential) {
      return res.status(404).json({ error: 'Credential not found' });
    }
    
    const presentation = vc.createPresentation(credential, `did:example:${userId}`);
    
    res.json({
      success: true,
      presentation,
      didDocument: DID_DOCUMENT
    });
  } catch (error) {
    console.error('Error creating presentation:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/credential/verify', express.json(), (req, res) => {
  try {
    const { credential } = req.body;
    
    if (!credential) {
      return res.status(400).json({ error: 'Credential is required' });
    }
    
    const isValid = vc.verifyCredential(credential);
    
    res.json({
      success: true,
      isValid,
      message: isValid ? 'Credential is valid' : 'Credential is invalid'
    });
  } catch (error) {
    console.error('Error verifying credential:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Enhanced verification endpoint with Sumsub cross-verification
app.post('/credential/verify-with-sumsub', express.json(), async (req, res) => {
  try {
    const { credential } = req.body;
    
    if (!credential) {
      return res.status(400).json({ error: 'Credential is required' });
    }
    
    const verificationResult = await vc.verifyCredentialWithSumsub(credential);
    
    res.json({
      success: true,
      ...verificationResult
    });
  } catch (error) {
    console.error('Error verifying credential with Sumsub:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get verification status from Sumsub directly
app.get('/sumsub/verification/:applicantId', async (req, res) => {
  try {
    const { applicantId } = req.params;
    const sumsubData = await vc.getSumsubVerificationStatus(applicantId);
    
    if (!sumsubData) {
      return res.status(404).json({ error: 'Verification not found' });
    }
    
    res.json({
      success: true,
      data: sumsubData
    });
  } catch (error) {
    console.error('Error fetching Sumsub verification:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// webhook (Sumsub ➜ you)
app.post('/sumsub/webhook', (req, res) => {
  let rawBody = '';
  
  // Capture raw body before parsing
  req.on('data', chunk => {
    rawBody += chunk.toString();
  });
  
  req.on('end', () => {
    try {
      // Parse the JSON body
      const body = JSON.parse(rawBody);
      
      const sig = req.headers['x-payload-digest'];
      
      // Verify webhook signature
      if (!sig) {
        console.log('[WEBHOOK] Missing signature header');
        return res.status(400).json({ error: 'Missing signature header' });
      }
      
      // Verify signature using SHA256
      const expectedSig = crypto.createHmac('sha256', SUMSUB_WEBHOOK_SECRET || SUMSUB_SECRET_KEY)
                               .update(rawBody)
                               .digest('hex');
      
      if (sig !== expectedSig) {
        console.log('[WEBHOOK] Invalid signature');
        return res.status(403).json({ error: 'Invalid signature' });
      }
      
      // Process the webhook payload
      const payload = body;
      const eventType = payload.type;
      
      // Handle different webhook events
      switch (eventType) {
        case 'applicantReviewed':
          handleApplicantReviewed(payload);
          break;
        case 'applicantPending':
          handleApplicantPending(payload);
          break;
        case 'applicantOnHold':
          handleApplicantOnHold(payload);
          break;
        case 'applicantReset':
          handleApplicantReset(payload);
          break;
        default:
          console.log('[WEBHOOK] Unknown event type:', eventType);
      }
      
      res.status(200).json({ received: true });
      
    } catch (error) {
      console.error('[WEBHOOK] Error processing webhook:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });
});

// Webhook event handlers
async function handleApplicantReviewed(payload) {
  const { applicantId, reviewResult, externalUserId, levelName, reviewStatus, applicantType, sandboxMode, clientId } = payload;
  
  if (reviewResult?.reviewAnswer === 'GREEN') {
    console.log(`[WEBHOOK] ✅ User ${externalUserId} (${applicantId}) verified successfully`);
    
    try {
                   // Initialize interactive VC system with seed prompt
             console.log('\n🔐 VERIFICATION SUCCESSFUL - CREATING INTERACTIVE VC');
             console.log('==================================================');
             
             const initSuccess = await integratedVC.initializeWithSeed();
      
      if (!initSuccess) {
        console.log('[WEBHOOK] ❌ Failed to initialize VC system');
        return;
      }
      
      // Create verifiable credential with XRPL integration
      const verificationData = {
        levelName,
        reviewStatus,
        applicantType,
        sandboxMode,
        clientId
      };
      
      // Use the complete VC creation method (local storage + IPFS upload + XRPL DID)
      const result = await integratedVC.createAndStoreCredential(
        applicantId, 
        externalUserId, 
        reviewResult, 
        verificationData
      );
      
      console.log('\n🎉 COMPLETE VC CREATION SUCCESS!');
      console.log('==================================');
      console.log(`Local Path: ${result.localPath}`);
      console.log(`IPFS Hash: ${result.ipfsResult.ipfsHash}`);
      console.log(`IPFS URI: ${result.ipfsResult.uri}`);
      console.log(`Hex: ${result.ipfsResult.hexadecimalString}`);
      console.log(`Credential ID: ${result.credential.id}`);
      console.log(`Issuer: ${integratedVC.issuerDid}`);
      console.log(`XRPL Account: ${result.didResult.account}`);
      console.log(`XRPL Transaction Hash: ${result.didResult.transactionHash}`);
      console.log(`XRPL Transaction URL: ${result.didResult.transactionUrl}`);
      console.log(`XRPL Fee: ${result.didResult.fee} XRP`);
      
      // Verify the credential
      const verificationResult = integratedVC.verifyCredential(result.credential);
      console.log(`\n🔍 Credential verification: ${verificationResult.isValid ? '✅ VALID' : '❌ INVALID'}`);
      
      console.log('\n🎉 SUCCESS! Complete pipeline executed:');
      console.log('✅ Verifiable credential created and signed');
      console.log('✅ Credential stored locally');
      console.log('✅ Credential uploaded to IPFS via Pinata');
      console.log('✅ DID transaction created on XRPL');
      console.log();
      console.log(`🌐 Your credential is available at: ${result.ipfsResult.uri}`);
      console.log(`🔗 XRPL transaction: ${result.didResult.transactionUrl}`);
      
      // TODO: Update database status to 'verified'
      // TODO: Send success email to user with credential info
      
    } catch (error) {
      console.error('[WEBHOOK] Error creating interactive verifiable credential:', error);
    } finally {
      // Close the readline interface
      integratedVC.close();
    }
    
      } else if (reviewResult?.reviewAnswer === 'RED') {
      console.log(`[WEBHOOK] ❌ User ${externalUserId} (${applicantId}) verification failed`);
    // TODO: Update database status to 'failed'
    // TODO: Send failure email to user
  } else {
    console.log(`[WEBHOOK] ⚠️ User ${externalUserId} (${applicantId}) - unknown result:`, reviewResult);
  }
}

function handleApplicantPending(payload) {
  const { applicantId, externalUserId } = payload;
  console.log(`[WEBHOOK] ⏳ User ${externalUserId} (${applicantId}) verification pending`);
  // TODO: Update user status to "pending"
}

function handleApplicantOnHold(payload) {
  const { applicantId, externalUserId } = payload;
  console.log(`[WEBHOOK] ⏸️ User ${externalUserId} (${applicantId}) verification on hold`);
  // TODO: Update user status to "on hold"
}

function handleApplicantReset(payload) {
  const { applicantId, externalUserId } = payload;
  console.log(`[WEBHOOK] 🔄 User ${externalUserId} (${applicantId}) verification reset`);
  // TODO: Reset user verification status
}

/* ---------- start ---------- */
app.listen(PORT, () => console.log(`🚀  http://localhost:${PORT}/kyc`))
