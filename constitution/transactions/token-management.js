const { callTxException } = require("../utils/tx-utils");

$$.transaction.describe("TokenManagement", {
  emit: function(name, symbol, supply, owner, onResult) {
    let account = $$.blockchain.lookup("Account", owner);
    if (!account) {
      account = this.transaction.createAsset("Account", "init", owner);
    }

    let token = $$.uidGenerator.safe_uuid();
    let newToken = $$.blockchain.lookup("Token", token);
    if (newToken) return callTxException(`Token ${token} already exists!`);

    newToken = this.transaction.createAsset("Token", "init", token, name, symbol, owner);

    if (!newToken.emit(supply)) return callTxException("Token cannot be emitted!");

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

    wallet.receive(supply);

    try {
      this.transaction.add(newToken);
      this.transaction.add(account);
      this.transaction.add(wallet);
      this.transaction.commit();

      onResult({
        token,
        wallet: walletAlias
      });
    } catch (err) {
      return callTxException(`Token issue commit failed!`, err);
    }
  }
});
