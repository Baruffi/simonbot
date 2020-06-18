function Client(...parsers) {
  function parse(msg) {
    for (const parser of parsers) {
      const parsed = parser.parse(msg);

      if (parsed) {
        return `${parsed}`;
      }
    }
  }

  return {
    parse,
  };
}

module.exports = Client;
