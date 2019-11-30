$$.asset.describe("Migration", {
  public: {
    alias: "string:key",
    name: "string",
    executionDate: "string",
    result: "object"
  },

  isExecuted: function(name) {
    return this.name === name;
  },

  init: function(name) {
    this.alias = name;
    this.name = name;
  },

  store: function(result) {
    this.executionDate = new Date().toISOString();
    this.result = result;

    console.log(`Storing migration "${this.name}" at ${this.executionDate}`);

    return true;
  },

  getInfo: function() {
    return {
      name: this.name,
      executionDate: this.executionDate
    };
  },

  getResult: function() {
    return this.result;
  }
});
