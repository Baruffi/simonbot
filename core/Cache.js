function Cache(cached = {}) {
  function cache(id, data) {
    cached[id] = data;
  }

  function get(id) {
    if (id) {
      return cached[id];
    }

    return Object.values(cached);
  }

  return {
    cache,
    get,
  };
}

module.exports = Cache;
