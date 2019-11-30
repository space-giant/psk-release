const { callTxException } = require("../utils/tx-utils");

$$.transaction.describe("WalletManagement", {
  create: function(owner, token, onResult) {
    let account = $$.blockchain.lookup("Account", owner);
    if (!account) {
      account = this.transaction.createAsset("Account", "init", owner);
    }

    if (account.isTokenPresent(token)) {
      return callTxException(`Owner ${owner} already has an wallet for token ${token}!`);
    }

    let walletAlias = $$.uidGenerator.safe_uuid();

    if (!account.addWallet(token, walletAlias)) {
      return callTxException(`Owner ${owner} already has an wallet for token ${token}!`);
    }

    let wallet = $$.blockchain.lookup("Wallet", walletAlias);
    if (wallet) {
      return callTxException(
        `Owner ${owner} cannot create wallet for token ${token} because generated wallet address (${walletAlias}) is already in use!`
      );
    }

    wallet = this.transaction.createAsset("Wallet", "init", walletAlias, token, owner);

    try {
      this.transaction.add(account);
      this.transaction.add(wallet);
      this.transaction.commit();

      onResult(walletAlias);
    } catch (err) {
      return callTxException(`Wallet creation failed for owner ${owner} and token ${token}! ${err ? err.message : ""}`);
    }
  },

  close: function(walletAlias, onResult) {
    let wallet = $$.blockchain.lookup("Wallet", walletAlias);

    if (!wallet || !wallet.isValid()) return callTxException(`Invalid wallet ${walletAlias}!`);
    if (!wallet.isActive()) return callTxException("Wallet is not active!");

    let balance = wallet.getBalance();
    if (balance > 0) return callTxException(`Wallet balance is non zero (${balance})!`);

    if (!wallet.close()) return callTxException("Wallet closing procedure failed!");

    try {
      this.transaction.add(wallet);
      this.transaction.commit();

      onResult(null, walletAlias);
    } catch (err) {
      return callTxException(`Wallet closing procedure failed! ${err ? err.message : ""}`);
    }
  },

  transfer: function(sourceWalletAlias, targetWalletAlias, token, amount, onResult) {
    let sourceWallet = $$.blockchain.lookup("Wallet", sourceWalletAlias);
    if (!sourceWallet) {
      callTxException(`Invalid source wallet address ${sourceWalletAlias}!`);
    }

    if (sourceWallet.getToken() !== token || !sourceWallet.transfer(amount)) {
      return callTxException("Source transfer failed!");
    }

    let targetWallet = $$.blockchain.lookup("Wallet", targetWalletAlias);
    if (!targetWallet) {
      callTxException(`Invalid target wallet address ${targetWalletAlias}!`);
    }

    if (targetWallet.getToken() !== token || !targetWallet.receive(amount)) {
      return callTxException("Target transfer failed!");
    }

    try {
      this.transaction.add(sourceWallet);
      this.transaction.add(targetWallet);
      this.transaction.commit();

      // temp fix; must use real TX id - not yet implemented
      let uid = $$.uidGenerator.safe_uuid();

      onResult(uid);
    } catch (err) {
      return callTxException(`Transfer failed! ${err ? err.message : ""}`);
    }
  },

  balanceOf: function(walletAlias, onResult) {
    let wallet = $$.blockchain.lookup("Wallet", walletAlias);

    if (!wallet || !wallet.isValid()) return callTxException(`Invalid wallet ${walletAlias}!`);
    if (!wallet.isActive()) return callTxException("Wallet is not active.");

    try {
      this.transaction.commit();

      onResult(wallet.balance());
    } catch (err) {
      return callTxException(`balanceOf failed! ${err ? err.message : ""}`);
    }
  }
});
