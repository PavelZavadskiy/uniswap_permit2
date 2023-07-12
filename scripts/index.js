const { Client, AccountBalanceQuery } = require('@hashgraph/sdk');
const { deploy } = require('./deploy');

const myDefaultAccountId = '0.0.15339451';
const myDefaultPrivateKey =
  '3030020100300706052b8104000a04220420fbdded02a431af832b9faa3aa7afaa2d348e7912a2ccce4eb6837b4cd3431af7';

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
