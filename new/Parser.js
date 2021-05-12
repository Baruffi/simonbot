import StringParser from './parsers/StringParser.js';
import ParenthesisParser from './parsers/ParenthesisParser.js';
import TokensTypeParser from './parsers/TokensTypeParser.js';
import AssignmentParser from './parsers/AssignmentParser.js';
import CommandParser from './parsers/CommandParser.js';
import {
  open,
  close,
  arrow,
  assign,
  terminator,
} from './constants/reserved.js';

const reserved = [open, close, arrow, assign, terminator];

function Parser(prefix, commands = {}) {
  const stringParser = StringParser();
  const parenthesisParser = ParenthesisParser();
  const tokensTypeParser = TokensTypeParser();
  const assignmentParser = AssignmentParser();
  const commandParser = CommandParser(call);

  function getCommand(identifier) {
    return commands[identifier];
  }

  function setCommand(identifier, command) {
    commands[identifier] = command;
  }

  function assign(tokenGroup) {
    const [identifier, commandDefinition] = tokenGroup;

    if (identifier && !reserved.includes(identifier)) {
      const [variables, executionInstructions] =
        assignmentParser(commandDefinition);

      if (variables && executionInstructions) {
        const command = commandParser(variables, executionInstructions, prefix);

        if (command) {
          setCommand(identifier, command);
          throw 'Command assigned successfully!';
        }
      }
    }

    throw 'Invalid identifier!';
  }

  function call(tokenGroup) {
    const [identifier, callArgs] = tokenGroup;

    const command = getCommand(identifier);

    if (command) {
      return command(callArgs);
    }

    throw 'Command not found!';
  }

  function assign_call(tokenGroup) {
    const commandDefinition = tokenGroup;
    const [variables, executionInstructions] =
      assignmentParser(commandDefinition);

    if (variables && executionInstructions) {
      const command = commandParser(variables, executionInstructions, prefix);

      return command();
    }

    throw 'Incomplete instructions!';
  }

  function pipeline(tokens) {
    const [type, tokenGroup] = tokensTypeParser(
      parenthesisParser(tokens),
      prefix
    );

    switch (type) {
      case 'ASSIGNMENT':
        return assign(tokenGroup);
      case 'CALL':
        return call(tokenGroup) || tokens[0];
      case 'ASSIGNMENT_CALL':
        return assign_call(tokenGroup);
      default:
        break;
    }
  }

  function parseLine(line) {
    const tokens = stringParser(line, prefix);

    if (tokens) {
      try {
        return pipeline(tokens);
      } catch (error) {
        return error;
      }
    }
  }

  function parse(text) {
    const output = [];

    for (const line of text.split(terminator)) {
      output.push(parseLine(line));
    }

    return output.join('\n');
  }

  return parse;
}

export default Parser;
