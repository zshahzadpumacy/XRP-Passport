package com.example.cleanpassport;


import android.os.AsyncTask;
import android.os.Bundle;
import android.util.Log;
import android.view.View;
import android.widget.Button;
import android.widget.EditText;
import android.widget.LinearLayout;
import android.widget.ProgressBar;
import android.widget.ScrollView;
import android.widget.TextView;
import android.widget.Toast;

import androidx.appcompat.app.AppCompatActivity;


import com.google.common.primitives.UnsignedInteger;

import org.bouncycastle.jce.ECNamedCurveTable;
import org.bouncycastle.jce.provider.BouncyCastleProvider;
import org.bouncycastle.math.ec.ECPoint;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import okhttp3.Call;
import okhttp3.Callback;
import okhttp3.HttpUrl;
import okhttp3.MediaType;
import okhttp3.MultipartBody;
import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.RequestBody;
import okhttp3.Response;

import org.xrpl.xrpl4j.client.JsonRpcClientErrorException;
import org.xrpl.xrpl4j.client.XrplClient;
import org.xrpl.xrpl4j.crypto.keys.KeyPair;
import org.xrpl.xrpl4j.crypto.keys.Base58EncodedSecret;
import org.xrpl.xrpl4j.crypto.keys.PublicKey;
import org.xrpl.xrpl4j.crypto.keys.Seed;

import org.bouncycastle.jce.spec.ECParameterSpec;
import org.xrpl.xrpl4j.model.client.accounts.AccountInfoRequestParams;
import org.xrpl.xrpl4j.model.client.accounts.AccountInfoResult;
import org.xrpl.xrpl4j.model.client.common.LedgerIndex;
import org.xrpl.xrpl4j.model.client.common.LedgerSpecifier;
import org.xrpl.xrpl4j.model.client.fees.FeeResult;
import org.xrpl.xrpl4j.model.client.ledger.LedgerRequestParams;
import org.xrpl.xrpl4j.model.transactions.Address;
import org.xrpl.xrpl4j.model.transactions.XrpCurrencyAmount;

import java.io.IOException;
import java.math.BigInteger;
import java.nio.charset.StandardCharsets;
import java.security.KeyFactory;
import java.security.PrivateKey;
import java.security.Security;
import java.security.spec.ECPrivateKeySpec;
import java.security.spec.EllipticCurve;
import java.util.concurrent.CompletableFuture;


public class MainActivity extends AppCompatActivity {

    private static final String TAG = "MainActivity";
    private static final String XRPL_TESTNET_URL = "https://s.devnet.rippletest.net:51234/";
    HttpUrl rippledUrl = HttpUrl.get(XRPL_TESTNET_URL);
    XrplClient xrplClient = new XrplClient(rippledUrl);
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        // Initial Screen
        LinearLayout initialScreen = findViewById(R.id.initialScreen);
        ScrollView verificationScreen = findViewById(R.id.verificationScreen);
        LinearLayout createDidScreen = findViewById(R.id.createDidScreen);

        Button createDidButton = findViewById(R.id.createDidButton);
        Button verifyDidButton = findViewById(R.id.verifyDidButton);
        Button backButton = findViewById(R.id.backButton);
        Button createButton = findViewById(R.id.createButton);
        Button backToInitialButton = findViewById(R.id.backToInitialButton);

        // Transition to Verification Screen
        verifyDidButton.setOnClickListener(v -> {
            initialScreen.setVisibility(View.GONE);
            verificationScreen.setVisibility(View.VISIBLE);
        });
        backButton.setOnClickListener(v -> {
            verificationScreen.setVisibility(View.GONE);
            initialScreen.setVisibility(View.VISIBLE);
        });
        createDidButton.setOnClickListener(v -> {
            initialScreen.setVisibility(View.GONE);
            createDidScreen.setVisibility(View.VISIBLE);
        });
        backToInitialButton.setOnClickListener(v -> {
            createDidScreen.setVisibility(View.GONE);
            initialScreen.setVisibility(View.VISIBLE);
        });

        EditText xrpSecretInput = findViewById(R.id.xrpSecretInput);

        createButton.setOnClickListener(v -> {
            String xrpSecret = xrpSecretInput.getText().toString().trim();
            //Log.d("XRP Secret", "Secret: " + xrpSecret);

            if (xrpSecret.isEmpty()) {
                Toast.makeText(MainActivity.this, "Please enter XRP Secret", Toast.LENGTH_SHORT).show();
                return;
            }
            ProgressBar progressBar = findViewById(R.id.progressBar);
            TextView CreateresponseTextView = findViewById(R.id.CreateTextView);

            runOnUiThread(() -> {
                progressBar.setVisibility(View.VISIBLE);
                CreateresponseTextView.setText(""); // Clear previous result
            });
            new Thread(() -> {
                String[] result_address = generateKeyPair(xrpSecret);
                //Log.d(TAG, "Publickeyhex: " + result_address[0]);
                //Log.d(TAG, "Address: " + result_address[1]);
                //Log.d(TAG, "Public key: " + result_address[2]);

                String DID_Document = createDIDJson(result_address[0], result_address[1]);
                //System.out.println("DID_Document is: " + DID_Document);

                String URI2 = null;
                try {
                    URI2 = UploadDID_Document(DID_Document)
                            .exceptionally(e -> {
                                System.err.println("Error: " + e.getMessage());
                                return null; // Return null in case of an error
                            })
                            .get();

                } catch (Exception e) {
                    e.printStackTrace(); // Handle potential exceptions from CompletableFuture.get()
                }
                //System.out.println("Base = " + URI2);
                CreateApiCall(xrpSecret, URI2,result_address[1]);

                //new FetchAccountInfoTask().execute(result_address[1]);

                //String Create_response = CreateApiCall(result_address[1], URI2, result_address[2]);
            }).start();

        });

        // Verification Screen Elements
        EditText privateKeyInput = findViewById(R.id.privateKeyInput);
        EditText didInput = findViewById(R.id.didInput);
        Button sendRequestButton = findViewById(R.id.generateSignatureButton);
        TextView responseTextView = findViewById(R.id.signatureTextView);
        TextView CreateresponseTextView = findViewById(R.id.CreateTextView);
        TextView DIDTextView = findViewById(R.id.CreateDIDView);

        sendRequestButton.setOnClickListener(v -> {
            String privateKeyHex = privateKeyInput.getText().toString().trim();
            String didString = didInput.getText().toString().trim();

            if (privateKeyHex.isEmpty()) {
                responseTextView.setText("Please enter a valid private key.");
                return;
            }

            if (didString.isEmpty()) {
                responseTextView.setText("Please enter a valid DID string.");
                return;
            }

            // Make the API call
            makeApiCall(didString, privateKeyHex);
        });
    }

    private String[] generateKeyPair(String seed) {
        try {

            // Generate a random KeyPair using the ED25519 seed
            KeyPair keyPair = Seed.fromBase58EncodedSecret(Base58EncodedSecret.of(seed)).deriveKeyPair();

            // Convert keys to hexadecimal strings
            String publicKeyHex = bytesToHex(keyPair.publicKey().value().toByteArray());
            String privateKeyHex = bytesToHex(keyPair.privateKey().value().toByteArray());

            PublicKey publicKey = keyPair.publicKey();
            String classicAddress = String.valueOf(publicKey.deriveAddress());
            String result = String.valueOf(getpublickeyhex(privateKeyHex));

            // Log the public and private keys
            //Log.d(TAG, "Generated Public Key: " + publicKeyHex);
            //Log.d(TAG, "Generated Private Key: " + privateKeyHex);
            //Log.d(TAG, "Generated Address: " + classicAddress);
            //Log.d(TAG, "Generated pub: " + result);

            return new String[]{result, classicAddress, publicKeyHex};
        } catch (Exception e) {
            Log.e(TAG, "Error generating KeyPair: " + e.getMessage(), e);
            return null;
        }
    }

    public StringBuilder getpublickeyhex(String privateKeyHex) throws Exception {
        // Add Bouncy Castle as a Security Provider
        Security.addProvider(new BouncyCastleProvider());

        // Convert the hex seed to a BigInteger
        BigInteger privateKeyValue = new BigInteger(privateKeyHex, 16);

        BigInteger N = new BigInteger("FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141", 16);

        // Ensure private key is in range [1, N-1]
        if (privateKeyValue.compareTo(N) >= 0) {
            privateKeyValue = privateKeyValue.mod(N);
        }

        // Get the Secp256k1 curve parameters from Bouncy Castle
        ECParameterSpec bcSpec = ECNamedCurveTable.getParameterSpec("secp256k1");

        // Convert Bouncy Castle ECParameterSpec to Java's ECParameterSpec
        java.security.spec.ECParameterSpec ecSpec = new java.security.spec.ECParameterSpec(
                new EllipticCurve(
                        new java.security.spec.ECFieldFp(bcSpec.getCurve().getField().getCharacteristic()),
                        bcSpec.getCurve().getA().toBigInteger(),
                        bcSpec.getCurve().getB().toBigInteger()
                ),
                new java.security.spec.ECPoint(
                        bcSpec.getG().getAffineXCoord().toBigInteger(),
                        bcSpec.getG().getAffineYCoord().toBigInteger()
                ),
                bcSpec.getN(),
                bcSpec.getH().intValue()
        );

        // Generate the private key using Secp256k1
        ECPrivateKeySpec privateKeySpec = new ECPrivateKeySpec(privateKeyValue, ecSpec);
        KeyFactory keyFactory = KeyFactory.getInstance("EC");

        PrivateKey privateKey = keyFactory.generatePrivate(privateKeySpec);

        // Get the public key from the private key
        ECPoint Q = bcSpec.getG().multiply(privateKeyValue); // Public key point
        byte[] publicKeyBytes = Q.getEncoded(false); // false for uncompressed format

        // Print the public key in hex format
        StringBuilder publicKeyHex = new StringBuilder();
        for (byte b : publicKeyBytes) {
            publicKeyHex.append(String.format("%02X", b));
        }
        //System.out.println("Public Key (Hex): " + publicKeyHex);
        return publicKeyHex;
    }

    public String createDIDJson(String publicKeyHex, String classicAddress) {

        try {
            // Root JSON Object
            JSONObject didJson = new JSONObject();
            String did = "did:xrpl:" + classicAddress;
            didJson.put("@context", "https://w3id.org/did/v1");
            didJson.put("id", did);

            // PublicKey Object
            JSONObject publicKey = new JSONObject();
            publicKey.put("id", did);
            publicKey.put("type", "Secp256k1VerificationKey2018");
            publicKey.put("controller", did);
            publicKey.put("publicKeyHex", publicKeyHex);

            // PublicKey Array
            JSONArray publicKeyArray = new JSONArray();
            publicKeyArray.put(publicKey);
            didJson.put("publicKey", publicKeyArray);

            // AssertionMethod Array
            JSONArray assertionMethodArray = new JSONArray();
            assertionMethodArray.put(did);
            didJson.put("assertionMethod", assertionMethodArray);

            // Authentication Array
            JSONArray authenticationArray = new JSONArray();
            authenticationArray.put(did);
            didJson.put("authentication", authenticationArray);


            String jsonContent = didJson.toString(4);
            jsonContent = jsonContent.replace("\\/", "/");

            return jsonContent;

        } catch (Exception e) {
            e.printStackTrace();
            return null;
        }
    }

    public CompletableFuture<String> UploadDID_Document(String jsonContent) {
        final String PINATA_JWT = "";
        final String UPLOAD_URL = "https://api.pinata.cloud/pinning/pinFileToIPFS";

        OkHttpClient client = new OkHttpClient();
        StringBuilder hexadecimalString = new StringBuilder();

        RequestBody fileBody = RequestBody.create(jsonContent, MediaType.parse("text/plain"));

        MultipartBody requestBody = new MultipartBody.Builder()
                .setType(MultipartBody.FORM)
                .addFormDataPart("file", "DID_Document.json", fileBody)
                .build();

        Request request = new Request.Builder()
                .url(UPLOAD_URL)
                .addHeader("Authorization", "Bearer " + PINATA_JWT)
                .post(requestBody)
                .build();

        CompletableFuture<String> future = new CompletableFuture<>();

        client.newCall(request).enqueue(new Callback() {
            @Override
            public void onFailure(Call call, IOException e) {
                future.completeExceptionally(e);
            }

            @Override
            public void onResponse(Call call, Response response) throws IOException {
                if (response.isSuccessful()) {
                    String responseBody = response.body().string();
                    try {
                        JSONObject jsonObject = new JSONObject(responseBody);
                        String ipfsHash = jsonObject.getString("IpfsHash");
                        String uri = "https://ivory-bitter-tiglon-303.mypinata.cloud/ipfs/" + ipfsHash;
                        byte[] bytes = uri.getBytes(StandardCharsets.UTF_8);

                        for (byte b : bytes) {
                            hexadecimalString.append(String.format("%02x", b));
                        }

                        future.complete(hexadecimalString.toString());
                    } catch (JSONException e) {
                        future.completeExceptionally(e);
                    }
                } else {
                    future.completeExceptionally(new IOException("Upload failed: " + response.code() + " - " + response.message()));
                }
            }
        });

        return future;
    }

    private class FetchAccountInfoTask extends AsyncTask<String, Void, String> {

        @Override
        protected String doInBackground(String... params) {
            String accountAddress = params[0];
            Log.d(TAG, "Add: " + accountAddress);

            try {
                Log.d(TAG, "Building AccountInfoRequestParams...");
                AccountInfoRequestParams requestParams = AccountInfoRequestParams.builder()
                        .account(Address.of(accountAddress))
                        .ledgerSpecifier(LedgerSpecifier.CURRENT)
                        .build();

                Log.d(TAG, "Sending request to XRPL...");
                AccountInfoResult accountInfo = xrplClient.accountInfo(requestParams);

                if (accountInfo == null || accountInfo.accountData() == null) {
                    Log.d(TAG, "No data returned for account: " + accountAddress);
                    return "No account information available for: " + accountAddress;
                }

                Log.d(TAG, "Account info retrieved successfully!");
                FeeResult feeResult = xrplClient.fee();
                XrpCurrencyAmount openLedgerFee = feeResult.drops().openLedgerFee();

                LedgerIndex validatedLedger = xrplClient.ledger(
                                LedgerRequestParams.builder()
                                        .ledgerSpecifier(LedgerSpecifier.VALIDATED)
                                        .build()
                        )
                        .ledgerIndex()
                        .orElseThrow(() -> new RuntimeException("LedgerIndex not available."));

                UnsignedInteger lastLedgerSequence = validatedLedger.plus(UnsignedInteger.valueOf(4)).unsignedIntegerValue();
                Log.d(TAG, "lastLedgerSequence!" + lastLedgerSequence);

                return "Account: " + accountInfo.accountData().account() + "\n" +
                        "Balance: " + accountInfo.accountData().balance() + "\n" +
                        "Sequence: " + accountInfo.accountData().sequence();
            } catch (JsonRpcClientErrorException e) {
                Log.e(TAG, "JsonRpcClientErrorException: " + e.getMessage(), e);
                return "Error fetching account info: " + e.getMessage();
            } catch (Exception e) {
                Log.e(TAG, "Unexpected error: " + e.getMessage(), e);
                return "Unexpected error occurred.";
            }
        }

        @Override
        protected void onPostExecute(String result) {
            // Update UI with account info
            //accountInfoText.setText(result);
            Log.d(TAG, "Result: " + result);
        }
    }

    private String bytesToHex(byte[] bytes) {
        StringBuilder hexString = new StringBuilder();
        for (byte b : bytes) {
            String hex = Integer.toHexString(0xFF & b);
            if (hex.length() == 1) {
                hexString.append('0');
            }
            hexString.append(hex);
        }
        return hexString.toString().toUpperCase();
    }

    public void makeApiCall(String didString, String privateKeyHex) {
        new Thread(() -> {
            try {
                // Replace with your API endpoint
                String apiUrl = "https://api.redimi.net:3002/run";

                // Create OkHttpClient instance
                OkHttpClient client = new OkHttpClient();

                // Create the JSON payload
                JSONObject json = new JSONObject();
                json.put("scriptName", "resolver");
                json.put("did", didString);
                json.put("privateKeyHex", privateKeyHex);

                // Convert JSON object to a RequestBody
                MediaType JSON = MediaType.parse("application/json; charset=utf-8");
                RequestBody body = RequestBody.create(json.toString(), JSON);

                // Build the POST request
                Request request = new Request.Builder()
                        .url(apiUrl)
                        .post(body)
                        .build();

                // Execute the request
                Response response = client.newCall(request).execute();

                // Handle the response
                String responseMessage;
                boolean isValid = false;
                if (response.isSuccessful()) {
                    String responseBody = response.body() != null ? response.body().string() : "No response body";
                    JSONObject jsonResponse = new JSONObject(responseBody);
                    isValid = jsonResponse.optBoolean("isValid", false);
                    responseMessage = isValid
                            ? "✅ Verification Successful: The DID is valid."
                            : "❌ Verification Failed: The DID is invalid.";
                } else {
                    responseMessage = "Error: " + response.message();
                }

                boolean finalIsValid = isValid;
                String finalResponseMessage = responseMessage;
                runOnUiThread(() -> {
                    TextView responseTextView = findViewById(R.id.signatureTextView);
                    responseTextView.setText(finalResponseMessage);
                    responseTextView.setTextColor(finalIsValid ? getColor(R.color.teal_200) : getColor(R.color.red));
                });

            } catch (Exception e) {
                runOnUiThread(() -> {
                    TextView responseTextView = findViewById(R.id.signatureTextView);
                    responseTextView.setText("Exception: " + e.getMessage());
                });
            }
        }).start();
    }

    public void CreateApiCall(String Secret, String base, String resultAddress) {

        ProgressBar progressBar = findViewById(R.id.progressBar);
        TextView CreateresponseTextView = findViewById(R.id.CreateTextView);

        // Show the ProgressBar and clear the TextView initially
        runOnUiThread(() -> {
            progressBar.setVisibility(View.VISIBLE);
            CreateresponseTextView.setText(""); // Clear previous result
        });
        new Thread(() -> {
            try {
                // Replace with your API endpoint
                String apiUrl = "https://api.redimi.net:3002/run";

                // Create OkHttpClient instance
                OkHttpClient client = new OkHttpClient();

                // Create the JSON payload
                JSONObject json = new JSONObject();
                json.put("scriptName", "Create_DID");
                json.put("Secret", Secret);
                json.put("URI", base);
                //Log.d("API JSON", String.valueOf(json));

                // Convert JSON object to a RequestBody
                MediaType JSON = MediaType.parse("application/json; charset=utf-8");
                RequestBody body = RequestBody.create(json.toString(), JSON);
                //System.out.println("JSON Body: " + body);

                // Build the POST request
                Request request = new Request.Builder()
                        .url(apiUrl)
                        .post(body)
                        .build();

                // Execute the request
                Response response = client.newCall(request).execute();
                System.out.println("Response Code: " + response.code());

                // Handle the response
                String responseMessage;
                boolean isValid = false;
                if (response.isSuccessful()) {
                    String responseBody = response.body() != null ? response.body().string() : "No response body";
                    JSONObject jsonResponse = new JSONObject(responseBody);
                    isValid = jsonResponse.optBoolean("isValid", false);
                    responseMessage = isValid
                            ? "✅ Identity Created"
                            : "❌ Error: Identity not Created";
                } else {
                    responseMessage = "Error: " + response.message();
                }

                boolean finalIsValid = isValid;
                String finalResponseMessage = responseMessage;
                runOnUiThread(() -> {
                    progressBar.setVisibility(View.GONE);
                    //TextView CreateresponseTextView = findViewById(R.id.CreateTextView);
                    CreateresponseTextView.setText(finalResponseMessage);
                    CreateresponseTextView.setTextColor(finalIsValid ? getColor(R.color.teal_200) : getColor(R.color.red));
                    TextView DIDTextView = findViewById(R.id.CreateDIDView);
                    DIDTextView.setText("did:xrpl:" + resultAddress);
                });

            } catch (Exception e) {
                runOnUiThread(() -> {
                    //TextView CreateresponseTextView = findViewById(R.id.CreateTextView);
                    progressBar.setVisibility(View.GONE); // Hide the ProgressBar
                    CreateresponseTextView.setText("Exception: " + e.getMessage());
                    TextView DIDTextView = findViewById(R.id.CreateDIDView);
                    DIDTextView.setText("Exception: " + e.getMessage());
                });
            }
        }).start();
    }
}
