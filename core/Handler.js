function Handler(actions) {
  function handle(identifier, data) {
    return actions[identifier](data);
  }
  return { handle };
}

module.exports = Handler;
