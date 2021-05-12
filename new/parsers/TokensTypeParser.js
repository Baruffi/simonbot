import { assign } from '../constants/reserved.js';

function TokensTypeParser() {
  function parse(tokens, prefix) {
    function getIdentifier(token) {
      return token.slice(prefix.length);
    }

    const identifier = getIdentifier(tokens[0]);
    const assignmentToken = tokens[1];

    if (identifier) {
      if (assignmentToken === assign) {
        return ['ASSIGNMENT', [identifier, tokens.slice(2)]];
      }

      return ['CALL', [identifier, tokens.slice(1)]];
    }

    return ['ASSIGNMENT_CALL', tokens];
  }

  return parse;
}

export default TokensTypeParser;
