$$.asset.describe("Token", {
  public: {
    alias: "string:key",
    name: "string",
    symbol: "string",
    emitter: "string",
    supply: "number"
  },

  init: function(alias, name, symbol, emitter) {
    if (this.emitter) return false;

    this.alias = alias;
    this.name = name;
    this.symbol = symbol;
    this.emitter = emitter;

    return true;
  },

  emit: function(supply) {
    if (this.supply) return false;

    this.supply = supply;

    return true;
  },

  getTotalSupply: function() {
    return this.supply;
  }
});
