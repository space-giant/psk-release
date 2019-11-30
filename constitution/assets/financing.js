const financingStatuses = {
  EDIT: 1,
  EVALUATION: 2,
  APPROVED: 3,
  REJECTED: 4,
  STARTED: 5,
  CANCELED: 6,
  DELETED: 7,
  REFUND: 8,
  SUCCESS: 9
};

$$.asset.describe("Financing", {
  public: {
    alias: "string:key",
    owner: "string",
    beneficiary: "string",
    token: "string",
    name: "string",
    motivation: "string",
    type: "number",
    softcap: "number",
    hardcap: "number",
    daysDuration: "number",
    daysDelivery: "number",
    periodCount: "number",
    status: "number",
    ownerWallet: "string",
    ownerSharesWallet: "string"
  },

  init: function(alias, owner, beneficiary, info) {
    if (this.alias) return false;

    this.alias = alias;
    this.owner = owner;
    this.beneficiary = beneficiary;

    this.name = info.name;
    this.motivation = info.motivation;
    this.type = info.type;
    this.softcap = info.softcap;
    this.hardcap = info.hardcap;
    this.daysDuration = info.daysDuration;
    this.daysDelivery = info.daysDelivery;
    this.periodCount = info.periodCount;
    this.status = financingStatuses.EDIT;

    return true;
  },

  updateInfo: function(info) {
    if (!this.alias) return false;

    this.name = info.name;
    this.motivation = info.motivation;
    this.type = info.type;
    this.softcap = info.softcap;
    this.hardcap = info.hardcap;
    this.daysDuration = info.daysDuration;
    this.daysDelivery = info.daysDelivery;
    this.periodCount = info.periodCount;
    this.status = financingStatuses.EDIT;

    return true;
  },

  isValid: function() {
    return !!this.owner;
  },

  getOwner: function() {
    return this.owner;
  },

  getStatus: function() {
    return this.status;
  },

  setToken: function(token) {
    this.token = token;
  },

  setOwnerWallets: function(ownerWallet, ownerSharesWallet) {
    this.ownerWallet = ownerWallet;
    this.ownerSharesWallet = ownerSharesWallet;
  },

  canApprove: function() {
    return this.status === financingStatuses.EVALUATION;
  },

  approve: function() {
    if (!this.canApprove()) return false;

    this.status = financingStatuses.APPROVED;
    return true;
  },

  canReject: function() {
    return this.status === financingStatuses.EVALUATION;
  },

  reject: function() {
    if (!this.canReject()) return false;

    this.status = financingStatuses.REJECTED;
    return true;
  },

  canApply: function() {
    return this.status === financingStatuses.EDIT;
  },

  apply: function() {
    if (!this.canApply()) return false;

    this.status = financingStatuses.EVALUATION;
    return true;
  },

  canStart: function() {
    return this.status === financingStatuses.APPROVED;
  },

  start: function() {
    if (!this.canStart()) return false;

    this.status = financingStatuses.STARTED;
    return true;
  },

  canStop: function() {
    return this.status === financingStatuses.STARTED;
  },

  stop: function() {
    if (!this.canStop()) return false;

    this.status = financingStatuses.CANCELED;
    return true;
  },

  canDelete: function() {
    return (
      this.status === financingStatuses.EDIT ||
      this.status === financingStatuses.REJECTED ||
      this.status === financingStatuses.APPROVED
    );
  },

  delete: function() {
    if (!this.canDelete()) return false;

    this.status = financingStatuses.DELETED;
    return true;
  },

  canFinalize: function() {
    return this.status === financingStatuses.STARTED;
  },

  finalize: function() {
    if (!this.canFinalize()) return false;

    this.status = financingStatuses.FINALIZED;
    return true;
  }
});
