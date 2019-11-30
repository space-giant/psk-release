const states = {
  ACTIVE: "ACTIVE",
  INACTIVE: "INACTIVE"
};

$$.asset.describe("Wallet", {
  public: {
    alias: "string:key",
    owner: "string",
    amount: "number",
    token: "string",
    state: "string"
  },

  init: function(alias, token, owner) {
    if (this.owner) return false;

    this.alias = alias;
    this.token = token;
    this.owner = owner;
    this.amount = 0;
    this.state = states.ACTIVE;

    return true;
  },

  transfer: function(tokens) {
    if (!this.isActive()) return false;
    if (tokens > this.amount || tokens <= 0) return false;

    this.amount -= tokens;
    return true;
  },

  receive: function(tokens) {
    if (!this.isActive()) return false;

    if (tokens <= 0) return false;
    this.amount += tokens;

    return true;
  },

  isValid: function() {
    return !!this.state;
  },

  isActive: function() {
    return this.state === states.ACTIVE;
  },

  close: function() {
    if (this.amount > 0) return false;
    if (!this.isActive()) return false;

    this.state = states.INACTIVE;

    return true;
  },

  getBalance: function() {
    return this.amount;
  },

  getToken: function() {
    return this.token;
  }
});
