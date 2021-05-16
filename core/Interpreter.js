import {
  arrow,
  assignment,
  close,
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
  const reserved = [open, close, arrow, assignment, terminator, prefix];

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
      commands[identifier] = commandParser('', '', command);
    }
  }

  function getParamNames(func) {
    const fnStr = func.toString();
    const result = fnStr
      .slice(fnStr.indexOf('(') + 1, fnStr.indexOf(')'))
      .match(/([^\s,]+)/g);

    if (result) {
      return result.map((paramName) => paramName.replace(/[\[\]]/g, ''));
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

  function executeCommand(command, commandArguments) {
    try {
      return command(commandArguments);
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

  function call(tokenGroup) {
    const [identifier, callArgs] = tokenGroup;
    const command = getCommand(identifier);
    const groupedArguments = parameterParser(callArgs);

    handler.addToContext('target', 'command');
    handler.addToContext('identifier', identifier);

    if (command) {
      return executeCommand(command, groupedArguments);
    }

    throw 'NOT_FOUND_ERROR';
  }

  function assignCall(tokenGroup) {
    const commandDefinition = tokenGroup;

    handler.addToContext('target', 'lambda expression');

    const command = generateCommand(commandDefinition);

    return executeCommand(command, []);
  }

  function pipeline(tokens) {
    const [type, tokenGroup] = tokensTypeParser(parenthesisParser(tokens));

    switch (type) {
      case 'ASSIGNMENT':
        return assign(tokenGroup);
      case 'CALL':
        return call(tokenGroup) || tokens[0];
      case 'ASSIGNMENT_CALL':
        return assignCall(tokenGroup);
      default:
        break;
    }
  }

  function parseLine(line) {
    const tokens = stringParser(line, prefix);

    handler.addToContext('line', line);

    if (tokens) {
      try {
        return pipeline(tokens);
      } catch (identifier) {
        return handler.handle(identifier);
      }
    }
  }

  function parse(text) {
    const output = [];

    for (const line of text.split(terminator)) {
      output.push(parseLine(line.trim()));

      handler.clearContext();
    }

    return output.join('\n');
  }

  return parse;
}

export default Interpreter;
