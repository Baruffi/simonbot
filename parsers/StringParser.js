import { open, close, hash } from '../constants/reserved.js';

function StringParser() {
  function parse(string, prefix) {
    let content = string.trim();

    if (content.startsWith(prefix)) {
      if (content.startsWith(prefix + open) && content.endsWith(close)) {
        content = content
          .slice(prefix.length + open.length)
          .slice(0, -close.length);
      }

      const prefixPattern = new RegExp(prefix, 'g');
      const hashPattern = new RegExp(hash, 'g');

      const tokens = content.replace(prefixPattern, hash).split(' ');
      return tokens.map((token) => token.replace(hashPattern, prefix));
    }
  }

  return parse;
}

export default StringParser;
