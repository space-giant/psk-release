const txUtils = require("./tx-utils");

function callTxException(migrationName, err) {
  txUtils.callTxException(`"${migrationName}" migration failed!`, err);
}

$$.transaction.describe("MigrationManagement", {
  run: function(name, run, onResult) {
    let migrationRun = $$.blockchain.lookup("Migration", name);
    if (migrationRun) {
      console.log(`"${name}" migration already executed!`);
      return $$.exception(`already_executed: ${JSON.stringify(migrationRun.getResult())}`);
    }

    migrationRun = this.transaction.createAsset("Migration", "init", name);

    try {
      run
        .call(this, this.transaction)
        .then(result => {
          try {
            migrationRun.store(result);
            this.transaction.add(migrationRun);
            this.commit();

            onResult({
              info: migrationRun.getInfo(),
              result
            });
          } catch (err) {
            callTxException(name, err);
          }
        })
        .catch(err => {
          callTxException(name, err);
        });
    } catch (err) {
      callTxException(name, err);
    }
  }
});
