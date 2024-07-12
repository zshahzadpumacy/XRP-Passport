const xrpl = require("xrpl");

async function getAccountInfo(accountAddress) {
  // Replace "wss://s.altnet.rippletest.net:51233" with a real XRP Ledger node URL if needed
  const client = new xrpl.Client("wss://s.devnet.rippletest.net:51233/");
  await client.connect();

  try {
    const response = await client.request({
      command: "account_objects",
      account: accountAddress,
      // Set ledger_index to "validated" to retrieve info from the latest validated ledger
      ledger_index: "validated",
    });
    console.log("Account Information:");
    console.log(response.result);
  } catch (error) {
    console.error("Error:", error);
  } finally {
    client.disconnect();
  }
}

// Replace "r..." with your actual XRP account address
const myAccountAddress = "rHfXZxhm1We4auAUge6ANrbWsEXiXaGfyp";
getAccountInfo(myAccountAddress);
