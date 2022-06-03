function Cache(cached = {}) {
  function cache(id, data) {
    cached[id] = data;
  }

  function get(id) {
    if (id) {
      return cached[id];
    }
  }

  function toMap(mappingFunc) {
    return Object.entries(cached).map(mappingFunc);
  }

  return {
    cache,
    get,
    toMap,
  };
}

export default Cache;
