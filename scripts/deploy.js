const {
  FileCreateTransaction,
  ContractCreateTransaction,
  ContractFunctionParameters,
  ContractCreateFlow,
} = require('@hashgraph/sdk');

const deploy = async client => {
  let esealCompiled = require('../artifacts/contracts/Permit2.sol/Permit2.json');
  const bytecode = esealCompiled.bytecode;

  const contractTx = new ContractCreateFlow().setGas(100000).setBytecode(bytecode);

  //Submit the transaction to the Hedera test network
  const contractResponse = await contractTx.execute(client);

  //Get the receipt of the file create transaction
  const contractReceipt = await contractResponse.getReceipt(client);

  //Get the smart contract ID
  const newContractId = contractReceipt.contractId;

  //Log the smart contract ID
  console.log('The smart contract ID is ' + newContractId);
};

module.exports = { deploy };
