require('dotenv').config();

const { Client, AccountBalanceQuery, TransferTransaction, Hbar } = require('@hashgraph/sdk');
const { deploy } = require('./deploy');

const { DEFAULT_ACCOUNT_ID, DEFAULT_PRIVATE_KEY } = process.env;

const myDefaultAccountId = DEFAULT_ACCOUNT_ID;
const myDefaultPrivateKey = DEFAULT_PRIVATE_KEY;

const client = Client.forTestnet();
client.setOperator(myDefaultAccountId, myDefaultPrivateKey);

(async () => {
  // Check main balance
  const query = new AccountBalanceQuery({ accountId: myDefaultAccountId });
  // Sign with the client operator account private key and submit to a Hedera network
  const accountBalance = await query.execute(client);
  if (accountBalance) {
    console.log(`The account balance for account ${myDefaultAccountId} is ${accountBalance.hbars} HBar\n`);
  }

  console.log('--------- deploy Permit2 ---------');
  await deploy(client);

  process.exit(0);
})();
