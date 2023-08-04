import { expect } from 'chai';
import { ethers } from 'hardhat';
import { Network } from 'ethers';
import { BigNumber } from 'ethers';
import { PermitSingle, AllowanceTransfer, MaxAllowanceExpiration, PermitBatch } from '@uniswap/permit2-sdk';

describe('AllowanceTransfer', () => {
  let owner: any;
  let account1: any;
  let account2: any;
  let account3: any;

  let permit2Contract: any;
  let token1: any;
  let token2: any;
  let mockContract: any;

  let network: Network;

  const MAX_UINT256 = ethers.constants.MaxUint256;

  const bn1e18 = BigNumber.from((10 ** 18).toString());
  const bn1e17 = BigNumber.from((10 ** 17).toString());

  const nonce = BigNumber.from(0);

  beforeEach(async function () {
    const Permit2 = await ethers.getContractFactory('Permit2');
    permit2Contract = await Permit2.deploy();
    await permit2Contract.deployed();

    const MockToken = await ethers.getContractFactory('MockERC20');
    token1 = await MockToken.deploy();
    // token1 = await MockToken.deploy('MockToken', 'MT1', 18);
    await token1.deployed();

    const MockTokenAnother = await ethers.getContractFactory('MockERC20');
    token2 = await MockToken.deploy();
    // token2 = await MockTokenAnother.deploy('MockToken', 'MT2', 18);
    await token2.deployed();

    const MockContract = await ethers.getContractFactory('MockAllowanceTransfer');
    mockContract = await MockContract.deploy(permit2Contract.address);
    await mockContract.deployed();

    [owner, account1, account2, account3] = await ethers.getSigners();

    network = await ethers.provider.getNetwork();

    await token1.mint(account1.address, bn1e18);
    await token1.connect(account1).approve(permit2Contract.address, MAX_UINT256);

    await token2.mint(account1.address, bn1e18);
    await token2.connect(account1).approve(permit2Contract.address, MAX_UINT256);
  });

  describe('deposit (permit+transferFrom)', function () {
    it('Should deposit', async () => {
      const permit: PermitSingle = {
        details: {
          token: token1.address,
          amount: bn1e18,
          expiration: MaxAllowanceExpiration,
          nonce: nonce,
        },
        spender: mockContract.address,
        sigDeadline: MAX_UINT256,
      };

      const beforeAccountBalance = await token1.balanceOf(account1.address);
      const beforeContractBalance = await token1.balanceOf(mockContract.address);

      const { domain, types, values } = AllowanceTransfer.getPermitData(
        permit,
        permit2Contract.address,
        network.chainId
      );
      let signature = await account1._signTypedData(domain, types, values);

      const result = await mockContract.connect(account1).deposit(bn1e17, permit, signature);
      expect(result).to.be.ok;

      const afterAccountBalance = await token1.balanceOf(account1.address);
      const afterContractBalance = await token1.balanceOf(mockContract.address);

      expect(afterAccountBalance).to.equal(beforeAccountBalance.sub(bn1e17));
      expect(afterContractBalance).to.equal(beforeContractBalance.add(bn1e17));
    });

    it('Should not deposit. InvalidNonce', async () => {
      const permit: PermitSingle = {
        details: {
          token: token1.address,
          amount: bn1e18,
          expiration: MaxAllowanceExpiration,
          nonce: nonce,
        },
        spender: mockContract.address,
        sigDeadline: MAX_UINT256,
      };

      const { domain, types, values } = AllowanceTransfer.getPermitData(
        permit,
        permit2Contract.address,
        network.chainId
      );
      let signature = await account1._signTypedData(domain, types, values);

      await mockContract.connect(account1).deposit(bn1e17, permit, signature);
      await expect(mockContract.connect(account1).deposit(bn1e17, permit, signature)).to.be.revertedWith(
        'InvalidNonce'
      );
    });

    it('Should not deposit. InvalidSigner', async () => {
      const permit: PermitSingle = {
        details: {
          token: token1.address,
          amount: bn1e18,
          expiration: MaxAllowanceExpiration,
          nonce: nonce,
        },
        spender: mockContract.address,
        sigDeadline: MAX_UINT256,
      };

      const { domain, types, values } = AllowanceTransfer.getPermitData(
        permit,
        permit2Contract.address,
        network.chainId
      );
      let signature = await account1._signTypedData(domain, types, values);

      await expect(mockContract.connect(account2).deposit(bn1e17, permit, signature)).to.be.revertedWith(
        'InvalidSigner'
      );
    });

    it('Should not deposit. InsufficientAllowance', async () => {
      const permit: PermitSingle = {
        details: {
          token: token1.address,
          amount: bn1e17,
          expiration: MaxAllowanceExpiration,
          nonce: nonce,
        },
        spender: mockContract.address,
        sigDeadline: MAX_UINT256,
      };

      const { domain, types, values } = AllowanceTransfer.getPermitData(
        permit,
        permit2Contract.address,
        network.chainId
      );
      let signature = await account1._signTypedData(domain, types, values);

      await expect(mockContract.connect(account1).deposit(bn1e18, permit, signature)).to.be.revertedWith(
        'InsufficientAllowance'
      );
    });

    it('Should not deposit. SignatureExpired', async () => {
      const sigDeadline = BigNumber.from(((await ethers.provider.getBlock('latest')).timestamp - 10000).toString());
      const permit: PermitSingle = {
        details: {
          token: token1.address,
          amount: bn1e18,
          expiration: MaxAllowanceExpiration,
          nonce: nonce,
        },
        spender: mockContract.address,
        sigDeadline: sigDeadline,
      };

      const { domain, types, values } = AllowanceTransfer.getPermitData(
        permit,
        permit2Contract.address,
        network.chainId
      );
      let signature = await account1._signTypedData(domain, types, values);

      await expect(mockContract.connect(account1).deposit(bn1e17, permit, signature)).to.be.revertedWith(
        'SignatureExpired'
      );
    });
  });

  describe('depositAllowed (approve+transferFrom)', function () {
    it('Should deposit', async () => {
      let result = await permit2Contract
        .connect(account1)
        .approve(token1.address, mockContract.address, bn1e18, MaxAllowanceExpiration);
      expect(result).to.be.ok;

      const beforeAccountBalance = await token1.balanceOf(account1.address);
      const beforeContractBalance = await token1.balanceOf(mockContract.address);

      result = await mockContract.connect(account1).depositAllowed(bn1e17, token1.address);
      expect(result).to.be.ok;

      const afterAccountBalance = await token1.balanceOf(account1.address);
      const afterContractBalance = await token1.balanceOf(mockContract.address);

      expect(afterAccountBalance).to.equal(beforeAccountBalance.sub(bn1e17));
      expect(afterContractBalance).to.equal(beforeContractBalance.add(bn1e17));
    });

    it('Should not deposit. AllowanceExpired', async () => {
      await expect(mockContract.connect(account1).depositAllowed(bn1e17, token1.address)).to.be.revertedWith(
        'AllowanceExpired'
      );
    });

    it('Should not deposit. InsufficientAllowance', async () => {
      let result = await permit2Contract
        .connect(account1)
        .approve(token1.address, mockContract.address, bn1e17, MaxAllowanceExpiration);
      expect(result).to.be.ok;

      await expect(mockContract.connect(account1).depositAllowed(bn1e18, token1.address)).to.be.revertedWith(
        'InsufficientAllowance'
      );
    });
  });

  describe('deposit+depositAllowed', function () {
    it('Should deposit', async () => {
      const permit: PermitSingle = {
        details: {
          token: token1.address,
          amount: bn1e18,
          expiration: MaxAllowanceExpiration,
          nonce: nonce,
        },
        spender: mockContract.address,
        sigDeadline: MAX_UINT256,
      };

      const beforeAccountBalance = await token1.balanceOf(account1.address);
      const beforeContractBalance = await token1.balanceOf(mockContract.address);

      const { domain, types, values } = AllowanceTransfer.getPermitData(
        permit,
        permit2Contract.address,
        network.chainId
      );
      let signature = await account1._signTypedData(domain, types, values);

      let result = await mockContract.connect(account1).deposit(bn1e17, permit, signature);
      expect(result).to.be.ok;

      result = await mockContract.connect(account1).depositAllowed(bn1e17, token1.address);
      expect(result).to.be.ok;

      const afterAccountBalance = await token1.balanceOf(account1.address);
      const afterContractBalance = await token1.balanceOf(mockContract.address);

      expect(afterAccountBalance).to.equal(beforeAccountBalance.sub(bn1e17).sub(bn1e17));
      expect(afterContractBalance).to.equal(beforeContractBalance.add(bn1e17).add(bn1e17));
    });

    it('Should not deposit. SignatureExpired + AllowanceExpired', async () => {
      const sigDeadline = BigNumber.from(((await ethers.provider.getBlock('latest')).timestamp - 10000).toString());
      const permit: PermitSingle = {
        details: {
          token: token1.address,
          amount: bn1e18,
          expiration: MaxAllowanceExpiration,
          nonce: nonce,
        },
        spender: mockContract.address,
        sigDeadline: sigDeadline,
      };

      const { domain, types, values } = AllowanceTransfer.getPermitData(
        permit,
        permit2Contract.address,
        network.chainId
      );
      let signature = await account1._signTypedData(domain, types, values);

      await expect(mockContract.connect(account1).deposit(bn1e17, permit, signature)).to.be.revertedWith(
        'SignatureExpired'
      );

      await expect(mockContract.connect(account1).depositAllowed(bn1e17, token1.address)).to.be.revertedWith(
        'AllowanceExpired'
      );
    });
  });

  describe('depositBatch (permit+transferFrom)', function () {
    it('Should deposit', async () => {
      const permit: PermitBatch = {
        details: [
          {
            token: token1.address,
            amount: bn1e18,
            expiration: MaxAllowanceExpiration,
            nonce: nonce,
          },
          {
            token: token2.address,
            amount: bn1e18,
            expiration: MaxAllowanceExpiration,
            nonce: nonce,
          },
        ],
        spender: mockContract.address,
        sigDeadline: MAX_UINT256,
      };

      const beforeAccountToken1Balance = await token1.balanceOf(account1.address);
      const beforeContractToken1Balance = await token1.balanceOf(mockContract.address);
      const beforeAccountToken2Balance = await token2.balanceOf(account1.address);
      const beforeContractToken2Balance = await token2.balanceOf(mockContract.address);

      const { domain, types, values } = AllowanceTransfer.getPermitData(
        permit,
        permit2Contract.address,
        network.chainId
      );
      let signature = await account1._signTypedData(domain, types, values);

      const result = await mockContract.connect(account1).depositBatch(bn1e17, permit, signature);
      expect(result).to.be.ok;

      const afterAccountToken1Balance = await token1.balanceOf(account1.address);
      const afterContractToken1Balance = await token1.balanceOf(mockContract.address);
      const afterAccountToken2Balance = await token2.balanceOf(account1.address);
      const afterContractToken2Balance = await token2.balanceOf(mockContract.address);

      expect(afterAccountToken1Balance).to.equal(beforeAccountToken1Balance.sub(bn1e17));
      expect(afterContractToken1Balance).to.equal(beforeContractToken1Balance.add(bn1e17));
      expect(afterAccountToken2Balance).to.equal(beforeAccountToken2Balance.sub(bn1e17));
      expect(afterContractToken2Balance).to.equal(beforeContractToken2Balance.add(bn1e17));
    });

    it('Should not deposit. InvalidNonce', async () => {
      const permit: PermitBatch = {
        details: [
          {
            token: token1.address,
            amount: bn1e18,
            expiration: MaxAllowanceExpiration,
            nonce: nonce,
          },
          {
            token: token2.address,
            amount: bn1e18,
            expiration: MaxAllowanceExpiration,
            nonce: nonce,
          },
        ],
        spender: mockContract.address,
        sigDeadline: MAX_UINT256,
      };

      const { domain, types, values } = AllowanceTransfer.getPermitData(
        permit,
        permit2Contract.address,
        network.chainId
      );
      let signature = await account1._signTypedData(domain, types, values);

      await mockContract.connect(account1).depositBatch(bn1e17, permit, signature);
      await expect(mockContract.connect(account1).depositBatch(bn1e17, permit, signature)).to.be.revertedWith(
        'InvalidNonce'
      );
    });

    it('Should not deposit. InvalidSigner', async () => {
      const permit: PermitBatch = {
        details: [
          {
            token: token1.address,
            amount: bn1e18,
            expiration: MaxAllowanceExpiration,
            nonce: nonce,
          },
          {
            token: token2.address,
            amount: bn1e18,
            expiration: MaxAllowanceExpiration,
            nonce: nonce,
          },
        ],
        spender: mockContract.address,
        sigDeadline: MAX_UINT256,
      };

      const { domain, types, values } = AllowanceTransfer.getPermitData(
        permit,
        permit2Contract.address,
        network.chainId
      );
      let signature = await account1._signTypedData(domain, types, values);

      await expect(mockContract.connect(account2).depositBatch(bn1e17, permit, signature)).to.be.revertedWith(
        'InvalidSigner'
      );
    });

    it('Should not deposit. InsufficientAllowance', async () => {
      const permit: PermitBatch = {
        details: [
          {
            token: token1.address,
            amount: bn1e17,
            expiration: MaxAllowanceExpiration,
            nonce: nonce,
          },
          {
            token: token2.address,
            amount: bn1e17,
            expiration: MaxAllowanceExpiration,
            nonce: nonce,
          },
        ],
        spender: mockContract.address,
        sigDeadline: MAX_UINT256,
      };

      const { domain, types, values } = AllowanceTransfer.getPermitData(
        permit,
        permit2Contract.address,
        network.chainId
      );
      let signature = await account1._signTypedData(domain, types, values);

      await expect(mockContract.connect(account1).depositBatch(bn1e18, permit, signature)).to.be.revertedWith(
        'InsufficientAllowance'
      );
    });

    it('Should not deposit. SignatureExpired', async () => {
      const sigDeadline = BigNumber.from(((await ethers.provider.getBlock('latest')).timestamp - 10000).toString());

      const permit: PermitBatch = {
        details: [
          {
            token: token1.address,
            amount: bn1e18,
            expiration: MaxAllowanceExpiration,
            nonce: nonce,
          },
          {
            token: token2.address,
            amount: bn1e18,
            expiration: MaxAllowanceExpiration,
            nonce: nonce,
          },
        ],
        spender: mockContract.address,
        sigDeadline: sigDeadline,
      };

      const { domain, types, values } = AllowanceTransfer.getPermitData(
        permit,
        permit2Contract.address,
        network.chainId
      );
      let signature = await account1._signTypedData(domain, types, values);

      await expect(mockContract.connect(account2).depositBatch(bn1e17, permit, signature)).to.be.revertedWith(
        'SignatureExpired'
      );
    });
  });

  describe('depositAllowedBatch (approve+transferFrom)', function () {
    it('Should deposit', async () => {
      let result = await permit2Contract
        .connect(account1)
        .approve(token1.address, mockContract.address, bn1e18, MaxAllowanceExpiration);
      expect(result).to.be.ok;

      result = await permit2Contract
        .connect(account1)
        .approve(token2.address, mockContract.address, bn1e18, MaxAllowanceExpiration);
      expect(result).to.be.ok;

      const beforeAccountToken1Balance = await token1.balanceOf(account1.address);
      const beforeContractToken1Balance = await token1.balanceOf(mockContract.address);
      const beforeAccountToken2Balance = await token2.balanceOf(account1.address);
      const beforeContractToken2Balance = await token2.balanceOf(mockContract.address);

      result = await mockContract.connect(account1).depositAllowedBatch(bn1e17, [token1.address, token2.address]);
      expect(result).to.be.ok;

      const afterAccountToken1Balance = await token1.balanceOf(account1.address);
      const afterContractToken1Balance = await token1.balanceOf(mockContract.address);
      const afterAccountToken2Balance = await token2.balanceOf(account1.address);
      const afterContractToken2Balance = await token2.balanceOf(mockContract.address);

      expect(afterAccountToken1Balance).to.equal(beforeAccountToken1Balance.sub(bn1e17));
      expect(afterContractToken1Balance).to.equal(beforeContractToken1Balance.add(bn1e17));
      expect(afterAccountToken2Balance).to.equal(beforeAccountToken2Balance.sub(bn1e17));
      expect(afterContractToken2Balance).to.equal(beforeContractToken2Balance.add(bn1e17));
    });

    it('Should not deposit. AllowanceExpired', async () => {
      await expect(
        mockContract.connect(account1).depositAllowedBatch(bn1e17, [token1.address, token2.address])
      ).to.be.revertedWith('AllowanceExpired');
    });

    it('Should not deposit. InsufficientAllowance', async () => {
      let result = await permit2Contract
        .connect(account1)
        .approve(token1.address, mockContract.address, bn1e17, MaxAllowanceExpiration);
      expect(result).to.be.ok;

      result = await permit2Contract
        .connect(account1)
        .approve(token2.address, mockContract.address, bn1e17, MaxAllowanceExpiration);
      expect(result).to.be.ok;

      await expect(
        mockContract.connect(account1).depositAllowedBatch(bn1e18, [token1.address, token2.address])
      ).to.be.revertedWith('InsufficientAllowance');
    });
  });

  describe('depositBatch+depositAllowedBatch', function () {
    it('Should deposit', async () => {
      const permit: PermitBatch = {
        details: [
          {
            token: token1.address,
            amount: bn1e18,
            expiration: MaxAllowanceExpiration,
            nonce: nonce,
          },
          {
            token: token2.address,
            amount: bn1e18,
            expiration: MaxAllowanceExpiration,
            nonce: nonce,
          },
        ],
        spender: mockContract.address,
        sigDeadline: MAX_UINT256,
      };

      const beforeAccountToken1Balance = await token1.balanceOf(account1.address);
      const beforeContractToken1Balance = await token1.balanceOf(mockContract.address);
      const beforeAccountToken2Balance = await token2.balanceOf(account1.address);
      const beforeContractToken2Balance = await token2.balanceOf(mockContract.address);

      const { domain, types, values } = AllowanceTransfer.getPermitData(
        permit,
        permit2Contract.address,
        network.chainId
      );
      let signature = await account1._signTypedData(domain, types, values);

      let result = await mockContract.connect(account1).depositBatch(bn1e17, permit, signature);
      expect(result).to.be.ok;

      result = await mockContract.connect(account1).depositAllowedBatch(bn1e17, [token1.address, token2.address]);
      expect(result).to.be.ok;

      const afterAccountToken1Balance = await token1.balanceOf(account1.address);
      const afterContractToken1Balance = await token1.balanceOf(mockContract.address);
      const afterAccountToken2Balance = await token2.balanceOf(account1.address);
      const afterContractToken2Balance = await token2.balanceOf(mockContract.address);

      expect(afterAccountToken1Balance).to.equal(beforeAccountToken1Balance.sub(bn1e17).sub(bn1e17));
      expect(afterContractToken1Balance).to.equal(beforeContractToken1Balance.add(bn1e17).add(bn1e17));
      expect(afterAccountToken2Balance).to.equal(beforeAccountToken2Balance.sub(bn1e17).sub(bn1e17));
      expect(afterContractToken2Balance).to.equal(beforeContractToken2Balance.add(bn1e17).add(bn1e17));
    });
  });

  interface TokenSpenderPair {
    token: string;
    spender: string;
  }

  describe('lockdown', function () {
    it('Should lockdown permit', async () => {
      let result = await permit2Contract
        .connect(account1)
        .approve(token1.address, mockContract.address, bn1e18, MaxAllowanceExpiration);
      expect(result).to.be.ok;

      result = await permit2Contract
        .connect(account1)
        .approve(token2.address, mockContract.address, bn1e18, MaxAllowanceExpiration);
      expect(result).to.be.ok;

      const approvals: TokenSpenderPair[] = [
        {
          token: token1.address,
          spender: mockContract.address,
        },
        {
          token: token2.address,
          spender: mockContract.address,
        },
      ];

      result = await permit2Contract.connect(account1).lockdown(approvals);
      expect(result).to.be.ok;

      await expect(
        mockContract.connect(account1).depositAllowedBatch(bn1e17, [token1.address, token2.address])
      ).to.be.revertedWith('InsufficientAllowance');
    });
  });
});
