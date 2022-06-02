import { arrow } from '../constants/reserved.js';

function AssignmentParser() {
  function parseAssignment(commandDefinition) {
    const sep = commandDefinition.indexOf(arrow);
    const variables = commandDefinition.slice(0, sep === -1 ? 0 : sep);
    const executionInstructions = commandDefinition.slice(sep + 1);

    return [variables, executionInstructions];
  }

  function parse(tokens) {
    return parseAssignment(tokens);
  }

  return parse;
}

export default AssignmentParser;
