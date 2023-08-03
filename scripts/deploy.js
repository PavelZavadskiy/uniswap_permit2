const {
  ContractCreateFlow,
  TransferTransaction,
  Hbar,
  setMaxTransactionFee,
  PrivateKey,
  FileCreateTransaction,
} = require('@hashgraph/sdk');

const { DEFAULT_ACCOUNT_ID, DEFAULT_PRIVATE_KEY } = process.env;

const myDefaultAccountId = DEFAULT_ACCOUNT_ID;
const myDefaultPrivateKey = DEFAULT_PRIVATE_KEY;

const deploy = async client => {
  let esealCompiled = require('../artifacts/contracts/Permit2.sol/Permit2.json');
  const bytecode = esealCompiled.bytecode;

  const contractTx = new ContractCreateFlow()
    .setGas(3000000)
    .setBytecode(bytecode)
    .setAutoRenewAccountId(myDefaultAccountId);
  // .setAdminKey(PrivateKey.fromString(myDefaultPrivateKey))
  // .sign(PrivateKey.fromString(myDefaultPrivateKey));
  // .setInitialBalance(new Hbar(10));

  //Submit the transaction to the Hedera test network
  const contractResponse = await contractTx.execute(client);

  //Get the receipt of the file create transaction
  const contractReceipt = await contractResponse.getReceipt(client);

  //Get the smart contract ID
  const newContractId = contractReceipt.contractId;

  //Log the smart contract ID
  console.log('The smart contract ID is ' + newContractId);

  const transaction = new TransferTransaction()
    .addHbarTransfer(myDefaultAccountId, new Hbar(-10))
    .addHbarTransfer(newContractId.toString(), new Hbar(10));

  //Submit the transaction to a Hedera network
  const txResponse = await transaction.execute(client);

  //Request the receipt of the transaction
  const receipt = await txResponse.getReceipt(client);

  //Get the transaction consensus status
  const transactionStatus = receipt.status;

  console.log('The transaction consensus status is ' + transactionStatus.toString());
};

module.exports = { deploy };
