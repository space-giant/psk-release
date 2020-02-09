const { callTxException } = require("../utils/tx-utils");

$$.transaction.describe("FinancingManagement", {
  create: function(beneficiary, financingInfo, onResult) {
    let owner = $$.uidGenerator.safe_uuid();

    let financingAlias = $$.uidGenerator.safe_uuid();
    let financing = $$.blockchain.lookup("Financing", financingAlias);
    if (financing) {
      return callTxException(
        `Financing ${financingAlias} cannot be created for beneficiar ${beneficiary} because financing exists already!`
      );
    }

    financing = this.transaction.createAsset("Financing", "init", financingAlias, owner, beneficiary, financingInfo);

    try {
      this.transaction.add(financing);
      this.transaction.commit();

      onResult({
        financing: financingAlias,
        owner
      });
    } catch (err) {
      return callTxException(`Financing creation failed for beneficiary ${beneficiary}!`, err);
    }
  },

  updateInfo: function(financingAlias, financingInfo, onResult) {
    let financing = $$.blockchain.lookup("Financing", financingAlias);
    if (!financing) {
      return callTxException(`Financing ${financingAlias} cannot be updated because it doesn't exist!`);
    }

    financing.updateInfo(financingInfo);

    try {
      this.transaction.add(financing);
      this.transaction.commit();

      onResult({
        financing: financingAlias,
        financingInfo: financingInfo
      });
    } catch (err) {
      return callTxException(`Financing update info failed!`, err);
    }
  },

  approve: function(financingAlias, onResult) {
    let financing = $$.blockchain.lookup("Financing", financingAlias);
    if (!financing) {
      return callTxException(`Financing ${financingAlias} cannot be approved because it doesn't exist!`);
    }

    if (!financing.approve()) {
      return callTxException(
        `Financing ${financingAlias} cannot be approved because it has the following status: ${financing.getStatus()}!`
      );
    }

    try {
      this.transaction.add(financing);
      this.transaction.commit();

      onResult();
    } catch (err) {
      return callTxException(`Financing ${financingAlias} failed to be approved!`, err);
    }
  },

  reject: function(financingAlias, onResult) {
    let financing = $$.blockchain.lookup("Financing", financingAlias);
    if (!financing) {
      return callTxException(`Financing ${financingAlias} cannot be rejected because it doesn't exist!`);
    }

    if (!financing.reject()) {
      return callTxException(
        `Financing ${financingAlias} cannot be rejectd because it has the following status: ${financing.getStatus()}!`
      );
    }

    try {
      this.transaction.add(financing);
      this.transaction.commit();

      onResult();
    } catch (err) {
      return callTxException(`Financing ${financingAlias} failed to be rejected!`, err);
    }
  },

  apply: function(financingAlias, onResult) {
    let financing = $$.blockchain.lookup("Financing", financingAlias);
    if (!financing) {
      return callTxException(`Financing ${financingAlias} cannot be in state apply because it doesn't exist!`);
    }

    if (!financing.apply()) {
      return callTxException(
        `Financing ${financingAlias} cannot be applied because it has the following status: ${financing.getStatus()}!`
      );
    }

    try {
      this.transaction.add(financing);
      this.transaction.commit();

      onResult();
    } catch (err) {
      return callTxException(`Financing ${financingAlias} failed to be applied!`, err);
    }
  },

  start: function(financingAlias, tokenInfo, mainToken, onResult) {
    let financing = $$.blockchain.lookup("Financing", financingAlias);
    if (!financing) {
      return callTxException(`Financing ${financingAlias} cannot be started because it doesn't exist!`);
    }

    if (!financing.isValid()) {
      return callTxException(`Financing ${financingAlias} is not valid!`);
    }

    if (!financing.canStart()) {
      return callTxException(
        `Financing ${financingAlias} cannot be started because it has the following status: ${financing.getStatus()}!`
      );
    }

    let owner = financing.getOwner();

    let account = $$.blockchain.lookup("Account", owner);
    if (!account) {
      account = this.transaction.createAsset("Account", "init", owner);
    }

    let sharesToken = $$.uidGenerator.safe_uuid();
    let newToken = $$.blockchain.lookup("Token", sharesToken);
    if (newToken) return callTxException(`Token ${newToken} already exists!`);

    newToken = this.transaction.createAsset("Token", "init", sharesToken, tokenInfo.name, tokenInfo.symbol, owner);

    if (!newToken.emit(tokenInfo.supply)) return callTxException("Share token cannot be emitted!");

    let sharesWalletAlias = $$.uidGenerator.safe_uuid();
    if (!account.addWallet(sharesToken, sharesWalletAlias)) {
      return callTxException(`Owner ${owner} already has an wallet for share token ${sharesToken}!`);
    }

    let sharesWallet = $$.blockchain.lookup("Wallet", sharesWalletAlias);
    if (sharesWallet) {
      return callTxException(
        `Owner ${owner} cannot create wallet for token ${sharesToken} because generated wallet address (${sharesWalletAlias}) is already in use!`
      );
    }

    sharesWallet = this.transaction.createAsset("Wallet", "init", sharesWalletAlias, sharesToken, owner);

    let mainWalletAlias = $$.uidGenerator.safe_uuid();
    if (!account.addWallet(mainToken, mainWalletAlias)) {
      return callTxException(`Owner ${owner} already has an wallet for main token ${mainToken}!`);
    }

    let mainWallet = $$.blockchain.lookup("Wallet", mainWalletAlias);
    if (mainWallet) {
      return callTxException(
        `Owner ${owner} cannot create wallet for main token ${mainToken} because generated wallet address (${mainWalletAlias}) is already in use!`
      );
    }

    mainWallet = this.transaction.createAsset("Wallet", "init", mainWalletAlias, mainToken, owner);

    sharesWallet.receive(tokenInfo.supply);

    financing.setToken(sharesToken);
    financing.setOwnerWallets(mainWalletAlias, sharesWalletAlias);
    financing.start();

    try {
      this.transaction.add(financing);
      this.transaction.add(account);
      this.transaction.add(newToken);
      this.transaction.add(sharesWallet);
      this.transaction.add(mainWallet);
      this.transaction.commit();

      onResult({
        financing: financingAlias,
        token: sharesToken,
        sharesWallet: sharesWalletAlias,
        mainWallet: mainWalletAlias
      });
    } catch (err) {
      return callTxException(`Financing ${financingAlias} failed to be started!`, err);
    }
  },

  stop: function(financingAlias, onResult) {
    let financing = $$.blockchain.lookup("Financing", financingAlias);
    if (!financing) {
      return callTxException(`Financing ${financingAlias} cannot be stoped because it doesn't exist!`);
    }

    if (!financing.stop()) {
      return callTxException(
        `Financing ${financingAlias} cannot be stoped because it has the following status: ${financing.getStatus()}!`
      );
    }

    try {
      this.transaction.add(financing);
      this.transaction.commit();

      onResult();
    } catch (err) {
      return callTxException(`Financing ${financingAlias} failed to be stoped!`, err);
    }
  },

  delete: function(financingAlias, onResult) {
    let financing = $$.blockchain.lookup("Financing", financingAlias);
    if (!financing) {
      return callTxException(`Financing ${financingAlias} cannot be deleted because it doesn't exist!`);
    }

    if (!financing.delete()) {
      return callTxException(
        `Financing ${financingAlias} cannot be deleted because it has the following status: ${financing.getStatus()}!`
      );
    }

    try {
      this.transaction.add(financing);
      this.transaction.commit();

      onResult();
    } catch (err) {
      return callTxException(`Financing ${financingAlias} failed to be deleted!`, err);
    }
  },

  finalize: function(financingAlias, onResult) {
    let financing = $$.blockchain.lookup("Financing", financingAlias);
    if (!financing) {
      return callTxException(`Financing ${financingAlias} cannot be finalized because it doesn't exist!`);
    }

    let ownerSharesWallet = $$.blockchain.lookup("Wallet", financing.ownerSharesWallet);
    if (!ownerSharesWallet) {
      return callTxException(`Financing ${financingAlias} has an invalid wallet ${financing.ownerSharesWallet}!`);
    }

    if (!ownerSharesWallet.isValid()) return callTxException("Invalid wallet");
    if (!ownerSharesWallet.isActive()) return callTxException("Wallet is not active.");
    if (ownerSharesWallet.getBalance() !== 0) {
      return callTxException(
        `Expected shares wallet to have balance = 0, but instead found ${ownerSharesWallet.getBalance()}`
      );
    }

    if (!financing.finalize()) {
      return callTxException(
        `Financing ${financingAlias} cannot be finalized because it has the following status: ${financing.getStatus()}!`
      );
    }

    try {
      this.transaction.add(financing);
      this.transaction.commit();

      onResult();
    } catch (err) {
      return callTxException(`Financing ${financingAlias} failed to be finalized!`, err);
    }
  }
});
