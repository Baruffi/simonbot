import {
  arrow,
  assignment,
  close,
  hash,
  open,
  terminator,
} from '../constants/reserved.js';
import AssignmentParser from '../parsers/AssignmentParser.js';
import CommandParser from '../parsers/CommandParser.js';
import ParameterParser from '../parsers/ParameterParser.js';
import ParenthesisParser from '../parsers/ParenthesisParser.js';
import StringParser from '../parsers/StringParser.js';
import TokensTypeParser from '../parsers/TokensTypeParser.js';

function Interpreter(handler, prefix, commands = {}) {
  const reserved = [hash, open, close, arrow, assignment, terminator, prefix];

  const stringParser = StringParser();
  const parenthesisParser = ParenthesisParser();
  const tokensTypeParser = TokensTypeParser(getIdentifier);
  const parameterParser = ParameterParser();
  const assignmentParser = AssignmentParser();
  const commandParser = CommandParser(getIdentifier, call);

  for (const identifier in commands) {
    const command = commands[identifier];
    const paramNames = getParamNames(command);

    if (paramNames) {
      commands[identifier] = commandParser(paramNames, paramNames, command);
    } else {
      commands[identifier] = commandParser([], [], command);
    }
  }

  function getParamNames(func) {
    const fnStr = func.toString();
    const result = fnStr
      .slice(fnStr.indexOf('(') + 1, fnStr.indexOf(')'))
      .match(/([^\s,]+)/g);

    if (result) {
      return result
        .map((paramName) => paramName.replace(/[\[\]]/g, ''))
        .filter((paramName) => paramName !== 'metadata');
    }
  }

  function getIdentifier(token) {
    if (token.startsWith(prefix) && token.length > prefix.length) {
      const identifier = token.slice(prefix.length);

      for (const keyword of reserved) {
        if (identifier.includes(keyword)) {
          handler.addToContext('target', 'command identifier');
          handler.addToContext('identifier', identifier);

          throw 'NOT_VALID_ERROR';
        }
      }

      return identifier;
    }
  }

  function getCommand(identifier) {
    return commands[identifier];
  }

  function setCommand(identifier, command) {
    commands[identifier] = command;
  }

  function generateCommand(commandDefinition) {
    try {
      const [variables, executionInstructions] =
        assignmentParser(commandDefinition);
      const varParams = parameterParser(variables);
      const execParams = parameterParser(executionInstructions);
      const command = commandParser(varParams, execParams);

      return command;
    } catch (error) {
      handler.addToContext('error', error);

      throw 'PARSING_ERROR';
    }
  }

  async function executeCommand(command, commandArguments, metadata) {
    try {
      return await command(commandArguments, metadata);
    } catch (error) {
      if (error !== 'NESTED_ERROR') {
        handler.addToContext('error', error);
      }

      throw 'NESTED_ERROR';
    }
  }

  function assign(tokenGroup) {
    const [identifier, commandDefinition] = tokenGroup;

    handler.addToContext('target', 'assignment');
    handler.addToContext('identifier', identifier);

    if (identifier) {
      const command = generateCommand(commandDefinition);

      setCommand(identifier, command);

      throw 'COMMAND_ADDED';
    }
  }

  async function call(tokenGroup, metadata) {
    const [identifier, callArgs] = tokenGroup;
    const command = getCommand(identifier);
    const groupedArguments = parameterParser(callArgs);

    handler.addToContext('target', 'command');
    handler.addToContext('identifier', identifier);

    if (command) {
      return await executeCommand(command, groupedArguments, metadata);
    }

    throw 'NOT_FOUND_ERROR';
  }

  async function assignCall(tokenGroup, metadata) {
    const commandDefinition = tokenGroup;

    handler.addToContext('target', 'lambda expression');

    const command = generateCommand(commandDefinition);

    return await executeCommand(command, [], metadata);
  }

  async function pipeline(tokens, metadata) {
    const [type, tokenGroup] = tokensTypeParser(parenthesisParser(tokens));

    switch (type) {
      case 'ASSIGNMENT':
        return assign(tokenGroup);
      case 'CALL':
        return (await call(tokenGroup, metadata)) || tokens[0]; // TODO: make a more useful message for when the command returns empty
      case 'ASSIGNMENT_CALL':
        return await assignCall(tokenGroup, metadata);
      default:
        break;
    }
  }

  async function parseLine(line, metadata) {
    const tokens = stringParser(line, prefix);

    handler.addToContext('line', line);

    if (tokens) {
      try {
        return await pipeline(tokens, metadata);
      } catch (identifier) {
        return handler.handle(identifier);
      }
    }
  }

  async function parse(text, metadata) {
    const output = [];

    for (const line of text.split(terminator)) {
      output.push(await parseLine(line.trim(), metadata));

      handler.clearContext();
    }

    return output.join('\n');
  }

  return parse;
}

export default Interpreter;
