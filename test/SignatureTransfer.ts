import { expect } from 'chai';
import { ethers } from 'hardhat';
import { Network } from 'ethers';
import { BigNumber } from 'ethers';
import { PermitTransferFrom, PermitBatchTransferFrom, Witness, SignatureTransfer } from '@uniswap/permit2-sdk';

describe('SignatureTransfer', () => {
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

    const MockContract = await ethers.getContractFactory('MockSignatureTransfer');
    mockContract = await MockContract.deploy(permit2Contract.address);
    await mockContract.deployed();

    [owner, account1, account2, account3] = await ethers.getSigners();

    network = await ethers.provider.getNetwork();

    await token1.mint(account1.address, bn1e18);
    await token1.connect(account1).approve(permit2Contract.address, MAX_UINT256);

    await token2.mint(account1.address, bn1e18);
    await token2.connect(account1).approve(permit2Contract.address, MAX_UINT256);
  });

  describe('deposit (permitTransferFrom)', function () {
    it('Should deposit', async () => {
      const permit: PermitTransferFrom = {
        permitted: {
          token: token1.address,
          amount: bn1e18,
        },
        spender: mockContract.address,
        nonce: nonce,
        deadline: MAX_UINT256,
      };
      const beforeAccountBalance = await token1.balanceOf(account1.address);
      const beforeContractBalance = await token1.balanceOf(mockContract.address);

      const { domain, types, values } = SignatureTransfer.getPermitData(
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
      const permit: PermitTransferFrom = {
        permitted: {
          token: token1.address,
          amount: bn1e18,
        },
        spender: mockContract.address,
        nonce: nonce,
        deadline: MAX_UINT256,
      };
      const beforeAccountBalance = await token1.balanceOf(account1.address);
      const beforeContractBalance = await token1.balanceOf(mockContract.address);

      const { domain, types, values } = SignatureTransfer.getPermitData(
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

      await expect(mockContract.connect(account1).deposit(bn1e17, permit, signature)).to.be.revertedWith(
        'InvalidNonce'
      );
    });

    it('Should not deposit. InvalidSigner', async () => {
      const permit: PermitTransferFrom = {
        permitted: {
          token: token1.address,
          amount: bn1e18,
        },
        spender: mockContract.address,
        nonce: nonce,
        deadline: MAX_UINT256,
      };

      const { domain, types, values } = SignatureTransfer.getPermitData(
        permit,
        permit2Contract.address,
        network.chainId
      );
      let signature = await account1._signTypedData(domain, types, values);

      await expect(mockContract.connect(account2).deposit(bn1e17, permit, signature)).to.be.revertedWith(
        'InvalidSigner'
      );
    });

    it('Should not deposit. InvalidAmount', async () => {
      const permit: PermitTransferFrom = {
        permitted: {
          token: token1.address,
          amount: bn1e17,
        },
        spender: mockContract.address,
        nonce: nonce,
        deadline: MAX_UINT256,
      };

      const { domain, types, values } = SignatureTransfer.getPermitData(
        permit,
        permit2Contract.address,
        network.chainId
      );
      let signature = await account1._signTypedData(domain, types, values);

      await expect(mockContract.connect(account2).deposit(bn1e18, permit, signature)).to.be.revertedWith(
        'InvalidAmount'
      );
    });

    it('Should not deposit. SignatureExpired', async () => {
      const deadline = BigNumber.from(((await ethers.provider.getBlock('latest')).timestamp - 10000).toString());

      const permit: PermitTransferFrom = {
        permitted: {
          token: token1.address,
          amount: bn1e17,
        },
        spender: account2.address,
        nonce: nonce,
        deadline: deadline,
      };

      const { domain, types, values } = SignatureTransfer.getPermitData(
        permit,
        permit2Contract.address,
        network.chainId
      );
      let signature = await account1._signTypedData(domain, types, values);

      await expect(mockContract.connect(account2).deposit(bn1e18, permit, signature)).to.be.revertedWith(
        'SignatureExpired'
      );
    });
  });

  describe('depositBatch (permitTransferFrom batch)', function () {
    it('Should deposit', async () => {
      const permit: PermitBatchTransferFrom = {
        permitted: [
          {
            token: token1.address,
            amount: bn1e18,
          },
          {
            token: token2.address,
            amount: bn1e18,
          },
        ],
        spender: mockContract.address,
        nonce: nonce,
        deadline: MAX_UINT256,
      };

      const beforeAccountToken1Balance = await token1.balanceOf(account1.address);
      const beforeContractToken1Balance = await token1.balanceOf(mockContract.address);
      const beforeAccountToken2Balance = await token2.balanceOf(account1.address);
      const beforeContractToken2Balance = await token2.balanceOf(mockContract.address);

      const { domain, types, values } = SignatureTransfer.getPermitData(
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
      const permit: PermitBatchTransferFrom = {
        permitted: [
          {
            token: token1.address,
            amount: bn1e18,
          },
          {
            token: token2.address,
            amount: bn1e18,
          },
        ],
        spender: mockContract.address,
        nonce: nonce,
        deadline: MAX_UINT256,
      };

      const { domain, types, values } = SignatureTransfer.getPermitData(
        permit,
        permit2Contract.address,
        network.chainId
      );
      let signature = await account1._signTypedData(domain, types, values);

      const result = await mockContract.connect(account1).depositBatch(bn1e17, permit, signature);
      expect(result).to.be.ok;

      await expect(mockContract.connect(account1).depositBatch(bn1e17, permit, signature)).to.be.revertedWith(
        'InvalidNonce'
      );
    });

    it('Should not deposit. InvalidSigner', async () => {
      const permit: PermitBatchTransferFrom = {
        permitted: [
          {
            token: token1.address,
            amount: bn1e18,
          },
          {
            token: token2.address,
            amount: bn1e18,
          },
        ],
        spender: mockContract.address,
        nonce: nonce,
        deadline: MAX_UINT256,
      };

      const { domain, types, values } = SignatureTransfer.getPermitData(
        permit,
        permit2Contract.address,
        network.chainId
      );
      let signature = await account1._signTypedData(domain, types, values);

      await expect(mockContract.connect(account2).depositBatch(bn1e17, permit, signature)).to.be.revertedWith(
        'InvalidSigner'
      );
    });

    it('Should not deposit. InvalidAmount', async () => {
      const permit: PermitBatchTransferFrom = {
        permitted: [
          {
            token: token1.address,
            amount: bn1e17,
          },
          {
            token: token2.address,
            amount: bn1e17,
          },
        ],
        spender: mockContract.address,
        nonce: nonce,
        deadline: MAX_UINT256,
      };

      const { domain, types, values } = SignatureTransfer.getPermitData(
        permit,
        permit2Contract.address,
        network.chainId
      );
      let signature = await account1._signTypedData(domain, types, values);

      await expect(mockContract.connect(account1).depositBatch(bn1e18, permit, signature)).to.be.revertedWith(
        'InvalidAmount'
      );
    });

    it('Should not deposit. SignatureExpired', async () => {
      const deadline = BigNumber.from(((await ethers.provider.getBlock('latest')).timestamp - 10000).toString());

      const permit: PermitBatchTransferFrom = {
        permitted: [
          {
            token: token1.address,
            amount: bn1e18,
          },
          {
            token: token2.address,
            amount: bn1e18,
          },
        ],
        spender: mockContract.address,
        nonce: nonce,
        deadline: deadline,
      };

      const { domain, types, values } = SignatureTransfer.getPermitData(
        permit,
        permit2Contract.address,
        network.chainId
      );
      let signature = await account1._signTypedData(domain, types, values);

      await expect(mockContract.connect(account1).depositBatch(bn1e17, permit, signature)).to.be.revertedWith(
        'SignatureExpired'
      );
    });
  });

  describe('depositWitness (permitWitnessTransferFrom)', function () {
    it('Should deposit', async () => {
      const permit: PermitTransferFrom = {
        permitted: {
          token: token1.address,
          amount: bn1e18,
        },
        spender: mockContract.address,
        nonce: nonce,
        deadline: MAX_UINT256,
      };
      const witness: Witness = {
        witnessTypeName: 'Witness',
        witnessType: { Witness: [{ name: 'user', type: 'address' }] },
        witness: { user: account2.address },
      };

      const beforeAccountBalance = await token1.balanceOf(account1.address);
      const beforeContractBalance = await token1.balanceOf(mockContract.address);

      const { domain, types, values } = SignatureTransfer.getPermitData(
        permit,
        permit2Contract.address,
        network.chainId,
        witness
      );
      let signature = await account1._signTypedData(domain, types, values);

      const result = await mockContract
        .connect(account2)
        .depositWitness(bn1e17, account1.address, account2.address, permit, signature);
      expect(result).to.be.ok;

      const afterAccountBalance = await token1.balanceOf(account1.address);
      const afterContractBalance = await token1.balanceOf(mockContract.address);

      expect(afterAccountBalance).to.equal(beforeAccountBalance.sub(bn1e17));
      expect(afterContractBalance).to.equal(beforeContractBalance.add(bn1e17));
    });

    it('Should deposit. The operation is not from the owner and not from a witness', async () => {
      const permit: PermitTransferFrom = {
        permitted: {
          token: token1.address,
          amount: bn1e18,
        },
        spender: mockContract.address,
        nonce: nonce,
        deadline: MAX_UINT256,
      };
      const witness: Witness = {
        witnessTypeName: 'Witness',
        witnessType: { Witness: [{ name: 'user', type: 'address' }] },
        witness: { user: account2.address },
      };

      const beforeAccountBalance = await token1.balanceOf(account1.address);
      const beforeContractBalance = await token1.balanceOf(mockContract.address);

      const { domain, types, values } = SignatureTransfer.getPermitData(
        permit,
        permit2Contract.address,
        network.chainId,
        witness
      );
      let signature = await account1._signTypedData(domain, types, values);

      const result = await mockContract
        .connect(account3)
        .depositWitness(bn1e17, account1.address, account2.address, permit, signature);
      expect(result).to.be.ok;

      const afterAccountBalance = await token1.balanceOf(account1.address);
      const afterContractBalance = await token1.balanceOf(mockContract.address);

      expect(afterAccountBalance).to.equal(beforeAccountBalance.sub(bn1e17));
      expect(afterContractBalance).to.equal(beforeContractBalance.add(bn1e17));
    });

    it('Should not deposit. InvalidNonce', async () => {
      const permit: PermitTransferFrom = {
        permitted: {
          token: token1.address,
          amount: bn1e18,
        },
        spender: mockContract.address,
        nonce: nonce,
        deadline: MAX_UINT256,
      };
      const witness: Witness = {
        witnessTypeName: 'Witness',
        witnessType: { Witness: [{ name: 'user', type: 'address' }] },
        witness: { user: account2.address },
      };

      const { domain, types, values } = SignatureTransfer.getPermitData(
        permit,
        permit2Contract.address,
        network.chainId,
        witness
      );
      let signature = await account1._signTypedData(domain, types, values);

      const result = await mockContract
        .connect(account2)
        .depositWitness(bn1e17, account1.address, account2.address, permit, signature);
      expect(result).to.be.ok;

      await expect(
        mockContract.connect(account2).depositWitness(bn1e17, account1.address, account2.address, permit, signature)
      ).to.be.revertedWith('InvalidNonce');
    });

    it('Should not deposit. InvalidAmount', async () => {
      const permit: PermitTransferFrom = {
        permitted: {
          token: token1.address,
          amount: bn1e17,
        },
        spender: mockContract.address,
        nonce: nonce,
        deadline: MAX_UINT256,
      };
      const witness: Witness = {
        witnessTypeName: 'Witness',
        witnessType: { Witness: [{ name: 'user', type: 'address' }] },
        witness: { user: account2.address },
      };

      const { domain, types, values } = SignatureTransfer.getPermitData(
        permit,
        permit2Contract.address,
        network.chainId,
        witness
      );
      let signature = await account1._signTypedData(domain, types, values);

      await expect(
        mockContract.connect(account2).depositWitness(bn1e18, account1.address, account2.address, permit, signature)
      ).to.be.revertedWith('InvalidAmount');
    });

    it('Should not deposit. SignatureExpired', async () => {
      const deadline = BigNumber.from(((await ethers.provider.getBlock('latest')).timestamp - 10000).toString());

      const permit: PermitTransferFrom = {
        permitted: {
          token: token1.address,
          amount: bn1e18,
        },
        spender: mockContract.address,
        nonce: nonce,
        deadline: deadline,
      };
      const witness: Witness = {
        witnessTypeName: 'Witness',
        witnessType: { Witness: [{ name: 'user', type: 'address' }] },
        witness: { user: account2.address },
      };

      const { domain, types, values } = SignatureTransfer.getPermitData(
        permit,
        permit2Contract.address,
        network.chainId,
        witness
      );
      let signature = await account1._signTypedData(domain, types, values);

      await expect(
        mockContract.connect(account2).depositWitness(bn1e17, account1.address, account2.address, permit, signature)
      ).to.be.revertedWith('SignatureExpired');
    });
  });

  describe('depositWitnessBatch (permitWitnessTransferFrom batch)', function () {
    it('Should deposit', async () => {
      const permit: PermitBatchTransferFrom = {
        permitted: [
          {
            token: token1.address,
            amount: bn1e18,
          },
          {
            token: token2.address,
            amount: bn1e18,
          },
        ],
        spender: mockContract.address,
        nonce: nonce,
        deadline: MAX_UINT256,
      };

      const witness: Witness = {
        witnessTypeName: 'Witness',
        witnessType: { Witness: [{ name: 'user', type: 'address' }] },
        witness: { user: account2.address },
      };

      const beforeAccountToken1Balance = await token1.balanceOf(account1.address);
      const beforeContractToken1Balance = await token1.balanceOf(mockContract.address);
      const beforeAccountToken2Balance = await token2.balanceOf(account1.address);
      const beforeContractToken2Balance = await token2.balanceOf(mockContract.address);

      const { domain, types, values } = SignatureTransfer.getPermitData(
        permit,
        permit2Contract.address,
        network.chainId,
        witness
      );
      let signature = await account1._signTypedData(domain, types, values);

      const result = await mockContract
        .connect(account1)
        .depositWitnessBatch(bn1e17, account1.address, account2.address, permit, signature);
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

    it('Should deposit. The operation is not from the owner and not from a witness', async () => {
      const permit: PermitBatchTransferFrom = {
        permitted: [
          {
            token: token1.address,
            amount: bn1e18,
          },
          {
            token: token2.address,
            amount: bn1e18,
          },
        ],
        spender: mockContract.address,
        nonce: nonce,
        deadline: MAX_UINT256,
      };

      const witness: Witness = {
        witnessTypeName: 'Witness',
        witnessType: { Witness: [{ name: 'user', type: 'address' }] },
        witness: { user: account2.address },
      };

      const beforeAccountToken1Balance = await token1.balanceOf(account1.address);
      const beforeContractToken1Balance = await token1.balanceOf(mockContract.address);
      const beforeAccountToken2Balance = await token2.balanceOf(account1.address);
      const beforeContractToken2Balance = await token2.balanceOf(mockContract.address);

      const { domain, types, values } = SignatureTransfer.getPermitData(
        permit,
        permit2Contract.address,
        network.chainId,
        witness
      );
      let signature = await account1._signTypedData(domain, types, values);

      const result = await mockContract
        .connect(account3)
        .depositWitnessBatch(bn1e17, account1.address, account2.address, permit, signature);
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
      const permit: PermitBatchTransferFrom = {
        permitted: [
          {
            token: token1.address,
            amount: bn1e18,
          },
          {
            token: token2.address,
            amount: bn1e18,
          },
        ],
        spender: mockContract.address,
        nonce: nonce,
        deadline: MAX_UINT256,
      };

      const witness: Witness = {
        witnessTypeName: 'Witness',
        witnessType: { Witness: [{ name: 'user', type: 'address' }] },
        witness: { user: account2.address },
      };

      const { domain, types, values } = SignatureTransfer.getPermitData(
        permit,
        permit2Contract.address,
        network.chainId,
        witness
      );
      let signature = await account1._signTypedData(domain, types, values);

      const result = await mockContract
        .connect(account2)
        .depositWitnessBatch(bn1e17, account1.address, account2.address, permit, signature);
      expect(result).to.be.ok;

      await expect(
        mockContract
          .connect(account2)
          .depositWitnessBatch(bn1e17, account1.address, account2.address, permit, signature)
      ).to.be.revertedWith('InvalidNonce');
    });

    it('Should not deposit. InvalidAmount', async () => {
      const permit: PermitBatchTransferFrom = {
        permitted: [
          {
            token: token1.address,
            amount: bn1e17,
          },
          {
            token: token2.address,
            amount: bn1e17,
          },
        ],
        spender: mockContract.address,
        nonce: nonce,
        deadline: MAX_UINT256,
      };

      const witness: Witness = {
        witnessTypeName: 'Witness',
        witnessType: { Witness: [{ name: 'user', type: 'address' }] },
        witness: { user: account2.address },
      };

      const { domain, types, values } = SignatureTransfer.getPermitData(
        permit,
        permit2Contract.address,
        network.chainId,
        witness
      );
      let signature = await account1._signTypedData(domain, types, values);

      await expect(
        mockContract
          .connect(account2)
          .depositWitnessBatch(bn1e18, account1.address, account2.address, permit, signature)
      ).to.be.revertedWith('InvalidAmount');
    });

    it('Should not deposit. SignatureExpired', async () => {
      const deadline = BigNumber.from(((await ethers.provider.getBlock('latest')).timestamp - 10000).toString());

      const permit: PermitBatchTransferFrom = {
        permitted: [
          {
            token: token1.address,
            amount: bn1e17,
          },
          {
            token: token2.address,
            amount: bn1e17,
          },
        ],
        spender: mockContract.address,
        nonce: nonce,
        deadline: deadline,
      };

      const witness: Witness = {
        witnessTypeName: 'Witness',
        witnessType: { Witness: [{ name: 'user', type: 'address' }] },
        witness: { user: account2.address },
      };

      const { domain, types, values } = SignatureTransfer.getPermitData(
        permit,
        permit2Contract.address,
        network.chainId,
        witness
      );
      let signature = await account1._signTypedData(domain, types, values);

      await expect(
        mockContract
          .connect(account2)
          .depositWitnessBatch(bn1e18, account1.address, account2.address, permit, signature)
      ).to.be.revertedWith('SignatureExpired');
    });
  });

  describe('invalidateUnorderedNonces', function () {
    it('Expect InvalidNonce', async () => {
      const permit: PermitTransferFrom = {
        permitted: {
          token: token1.address,
          amount: bn1e18,
        },
        spender: mockContract.address,
        nonce: nonce,
        deadline: MAX_UINT256,
      };

      const { domain, types, values } = SignatureTransfer.getPermitData(
        permit,
        permit2Contract.address,
        network.chainId
      );
      let signature = await account1._signTypedData(domain, types, values);

      await permit2Contract.connect(account1).invalidateUnorderedNonces(BigNumber.from(0), BigNumber.from(1));

      await expect(mockContract.connect(account1).deposit(bn1e17, permit, signature)).to.be.revertedWith(
        'InvalidNonce'
      );
    });
  });
});
