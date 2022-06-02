import { assignment } from '../constants/reserved.js';

function TokensTypeParser(getIdentifier) {
  function parse(tokens) {
    const identifier = getIdentifier(tokens[0]);
    const assignmentToken = tokens[1];

    if (identifier) {
      if (assignmentToken === assignment) {
        return ['ASSIGNMENT', [identifier, tokens.slice(2)]];
      }

      return ['CALL', [identifier, tokens.slice(1)]];
    }

    return ['ASSIGNMENT_CALL', tokens];
  }

  return parse;
}

export default TokensTypeParser;
