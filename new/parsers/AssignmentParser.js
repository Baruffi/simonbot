import { open, close, arrow } from '../constants/reserved.js';

function AssignmentParser() {
  function parseGrouping(tokens) {
    while (tokens.includes(open)) {
      const lastOpen = tokens.lastIndexOf(open);
      const respectiveClose = tokens.slice(lastOpen).indexOf(close) + lastOpen;

      const innerGroup = tokens.slice(lastOpen + 1, respectiveClose);

      tokens.splice(lastOpen, respectiveClose + 1 - lastOpen, innerGroup);
    }

    return tokens;
  }

  function parseAssignment(commandDefinition) {
    const sep = commandDefinition.indexOf(arrow);
    const variables = parseGrouping(
      commandDefinition.slice(0, sep === -1 ? 0 : sep)
    );
    const executionInstructions = parseGrouping(
      commandDefinition.slice(sep + 1)
    );

    return [variables, executionInstructions];
  }

  function parse(tokens) {
    return parseAssignment(tokens);
  }

  return parse;
}

export default AssignmentParser;
