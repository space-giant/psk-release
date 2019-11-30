const states = {
  ACTIVE: "ACTIVE",
  INACTIVE: "INACTIVE"
};

$$.asset.describe("Account", {
  public: {
    alias: "string:key",
    wallets: "object",
    financings: "object",
    state: "string"
  },

  init: function(alias) {
    if (this.alias) return false;

    this.alias = alias;
    this.state = states.ACTIVE;
    this.wallets = [];
    this.financings = [];

    return true;
  },

  isTokenPresent: function(token) {
    let wallets = Object.keys(this.wallets);
    return wallets.length && wallets.some(x => x === token);
  },

  addWallet: function(token, address) {
    if (this.isTokenPresent(token)) return false;

    this.wallets[token] = address;
    return true;
  },

  isValid: function() {
    return !!this.state;
  },

  isActive: function() {
    return this.state === states.ACTIVE;
  },

  close: function() {
    if (!this.isActive()) return false;

    this.state = states.INACTIVE;

    return true;
  }
});
