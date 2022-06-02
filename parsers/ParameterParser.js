import { close, open } from '../constants/reserved.js';

function ParameterParser() {
  function parseGrouping(tokens) {
    while (tokens.includes(open)) {
      const lastOpen = tokens.lastIndexOf(open);
      const respectiveClose = tokens.slice(lastOpen).indexOf(close) + lastOpen;

      if (respectiveClose < lastOpen) {
        throw `Imbalanced parenthesis brackets! ${respectiveClose} < ${lastOpen}, "${tokens.join('|')}"`;
      }

      const innerGroup = tokens.slice(lastOpen + 1, respectiveClose);

      tokens.splice(lastOpen, respectiveClose + 1 - lastOpen, innerGroup);
    }

    return tokens;
  }

  function parseParameter(tokens) {
    const groupedParameters = parseGrouping(tokens);

    return groupedParameters;
  }

  function parse(tokens) {
    return parseParameter(tokens);
  }

  return parse;
}

export default ParameterParser;
