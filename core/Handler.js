function Handler(actions, unknown = null) {
  let context = {};

  function addToContext(field, data) {
    if (context[field]) {
      context = { previous: { ...context } };
    }

    context[field] = data;
  }

  function clearContext() {
    context = {};
  }

  function handle(identifier) {
    console.log(identifier);
    console.log(context);

    const action = actions[identifier];

    if (typeof action === 'function') {
      const result = action(context);

      return result;
    }

    return unknown;
  }

  return { addToContext, clearContext, handle };
}

export default Handler;
