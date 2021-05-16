function Storage(savefunc, loadfunc) {
  async function store(identifier, definition) {
    await savefunc(identifier, definition);
  }

  async function retrieve() {
    return await loadfunc();
  }

  return {
    store,
    retrieve,
  };
}

export default Storage;
