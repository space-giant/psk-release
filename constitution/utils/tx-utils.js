function callTxException(message, error) {
  const details = error ? `${error ? error.message : ""}: ${JSON.stringify(error)}` : "";
  return $$.exception(`${message}; ${details}`);
}

module.exports = {
  callTxException
};
