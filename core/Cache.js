function Cache(cached = {}) {
  function cache(id, data) {
    cached[id] = data;
  }

  function get(id) {
    if (id) {
      return cached[id];
    }
  }

  function toString() {
    return Object.values(cached).join('\n');
  }

  return {
    cache,
    get,
    toString,
  };
}

export default Cache;
