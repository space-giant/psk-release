require("./psknode/bundles/pskruntime");
require("./psknode/bundles/psknode");

const confDir = "./blockchain_local_storage";
let blockchain = require("blockchain");

let worldStateCache = blockchain.createWorldStateCache("fs", confDir);
let historyStorage = blockchain.createHistoryStorage("fs", confDir);
let consensusAlgorithm = blockchain.createConsensusAlgorithm("direct");
let signatureProvider = blockchain.createSignatureProvider("permissive");

blockchain.createBlockchain(worldStateCache, historyStorage, consensusAlgorithm, signatureProvider, false, false);

function start() {
  $$.blockchain.start(() => {
    require("./constitution");
  });
}

function startTransaction({ name, phase, params = [] }) {
  return new Promise((resolve, reject) => {
    onResult = (...result) => {
      resolve.apply(this, result);
    };
    const runParameters = ["ArtchainAgent", name, phase, ...params, onResult];

    try {
      $$.blockchain.startTransactionAs.apply($$.blockchain, runParameters);
    } catch (error) {
      reject(error);
    }
  });
}

module.exports = {
  start,
  startTransaction
};