import { open, close } from '../constants/reserved.js';

function StringParser() {
  function parse(string, prefix) {
    let content = string.trim();

    if (content.startsWith(prefix)) {
      if (content.startsWith(prefix + open) && content.endsWith(close)) {
        content = content
          .slice(prefix.length + open.length)
          .slice(0, -close.length);
      }

      const tokens = content.split(' ');

      return tokens;
    }
  }

  return parse;
}

export default StringParser;
