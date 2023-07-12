// SPDX-License-Identifier: MIT
import { IPermit2 } from '../interfaces/IPermit2.sol';
import { IERC20 } from '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import { SafeERC20 } from '@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol';
import { IAllowanceTransfer } from '../interfaces/IAllowanceTransfer.sol';

contract MockAllowanceTransfer {
  using SafeERC20 for IERC20;

  IPermit2 private permit2;

  constructor(address permitContract) {
    permit2 = IPermit2(permitContract);
  }

  function deposit(uint160 amount, IAllowanceTransfer.PermitSingle calldata permit, bytes calldata signature) external {
    permit2.permit(msg.sender, permit, signature);
    permit2.transferFrom(msg.sender, address(this), amount, permit.details.token);
  }

  function depositAllowed(uint160 amount, address token) external {
    permit2.transferFrom(msg.sender, address(this), amount, token);
  }

  function depositBatch(
    uint160 amount,
    IAllowanceTransfer.PermitBatch calldata permit,
    bytes calldata signature
  ) external {
    uint256 len = permit.details.length;
    IAllowanceTransfer.AllowanceTransferDetails[] memory details = new IAllowanceTransfer.AllowanceTransferDetails[](
      len
    );
    for (uint256 i = 0; i < len; i++) {
      address token = permit.details[i].token;

      details[i] = IAllowanceTransfer.AllowanceTransferDetails({
        from: msg.sender,
        to: address(this),
        amount: amount,
        token: token
      });
    }
    permit2.permit(msg.sender, permit, signature);
    permit2.transferFrom(details);
  }

  function depositAllowedBatch(uint160 amount, address[] calldata tokens) external {
    uint256 len = tokens.length;
    IAllowanceTransfer.AllowanceTransferDetails[] memory details = new IAllowanceTransfer.AllowanceTransferDetails[](
      len
    );
    for (uint256 i = 0; i < len; i++) {
      address token = tokens[i];
      details[i] = IAllowanceTransfer.AllowanceTransferDetails({
        from: msg.sender,
        to: address(this),
        amount: amount,
        token: token
      });
    }
    permit2.transferFrom(details);
  }
}
