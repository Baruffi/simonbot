function Handler(actions, invalidAction = (identifier, action) => `Action for identifier ${identifier} has invalid type: ${typeof action}`) {
  function handle({ identifier, context }) {
    const action = actions[identifier];

    if (typeof action === 'function') {
      return action(context);
    } else {
      return invalidAction(identifier, action);
    }
  }
  return { handle };
}

module.exports = Handler;
