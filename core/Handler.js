// TODO: Improve handler adding more functionality
function Handler(actions, unknown = null) {
  function handle(identifier, context) {
    const action = actions[identifier];

    if (typeof action === 'function') {
      return action(context);
    }

    return unknown;
  }

  return { handle };
}

module.exports = Handler;
