// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

import { IPermit2 } from '../interfaces/IPermit2.sol';
import { IERC20 } from '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import { SafeERC20 } from '@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol';
import { ISignatureTransfer } from '../interfaces/ISignatureTransfer.sol';

contract MockSignatureTransfer {
  using SafeERC20 for IERC20;

  IPermit2 private permit2;

  constructor(address permitContract) {
    permit2 = IPermit2(permitContract);
  }

  function deposit(
    uint256 amount,
    ISignatureTransfer.PermitTransferFrom calldata permit,
    bytes calldata signature
  ) external {
    permit2.permitTransferFrom(
      permit,
      ISignatureTransfer.SignatureTransferDetails({ to: address(this), requestedAmount: amount }),
      msg.sender,
      signature
    );
  }

  function depositBatch(
    uint256 amount,
    ISignatureTransfer.PermitBatchTransferFrom calldata permit,
    bytes calldata signature
  ) external {
    uint256 len = permit.permitted.length;
    ISignatureTransfer.SignatureTransferDetails[] memory details = new ISignatureTransfer.SignatureTransferDetails[](
      len
    );
    for (uint256 i = 0; i < len; i++) {
      details[i].to = address(this);
      details[i].requestedAmount = amount;
    }
    permit2.permitTransferFrom(permit, details, msg.sender, signature);
  }

  string private constant WITNESS_TYPE_STRING =
    'Witness witness)TokenPermissions(address token,uint256 amount)Witness(address user)';
  bytes32 private WITNESS_TYPEHASH = keccak256('Witness(address user)');

  struct Witness {
    address user;
  }

  function depositWitness(
    uint256 amount,
    address owner,
    address user,
    ISignatureTransfer.PermitTransferFrom calldata permit,
    bytes calldata signature
  ) external {
    permit2.permitWitnessTransferFrom(
      permit,
      ISignatureTransfer.SignatureTransferDetails({ to: address(this), requestedAmount: amount }),
      owner,
      keccak256(abi.encode(WITNESS_TYPEHASH, Witness(user))),
      WITNESS_TYPE_STRING,
      signature
    );
  }

  function depositWitnessBatch(
    uint256 amount,
    address owner,
    address user,
    ISignatureTransfer.PermitBatchTransferFrom calldata permit,
    bytes calldata signature
  ) external {
    uint256 len = permit.permitted.length;
    ISignatureTransfer.SignatureTransferDetails[] memory details = new ISignatureTransfer.SignatureTransferDetails[](
      len
    );
    for (uint256 i = 0; i < len; i++) {
      details[i].to = address(this);
      details[i].requestedAmount = amount;
    }
    permit2.permitWitnessTransferFrom(
      permit,
      details,
      owner,
      keccak256(abi.encode(WITNESS_TYPEHASH, Witness(user))),
      WITNESS_TYPE_STRING,
      signature
    );
  }
}
