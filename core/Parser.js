const open = '(';
const close = ')';
const arrow = '->';
const assign = '=';

// TODO: make a stack trace of all actions in a global context object to improve error throwing
function Parser(prefix = '!', commands = {}) {
  for (const identifier in commands) {
    const command = commands[identifier];
    const paramNames = getParamNames(command);

    if (paramNames) {
      commands[identifier] = generateCommand([...paramNames, '->', ...paramNames], command);
    } else {
      commands[identifier] = generateCommand('', command);
    }
  }

  function recursiveJoin(nestedStringArray) {
    if (typeof nestedStringArray === 'string') {
      return nestedStringArray;
    }

    let resultingString = '';

    for (const item of nestedStringArray) {
      resultingString += `${recursiveJoin(item)} `;
    }

    return resultingString.trim();
  }

  function getParamNames(func) {
    const fnStr = func.toString();
    const result = fnStr.slice(fnStr.indexOf('(') + 1, fnStr.indexOf(')')).match(/([^\s,]+)/g);

    if (result) {
      return result.map(paramName => paramName.replace(/[\[\]]/g, ''));
    }
  }

  function getIdentifier(token) {
    return token.slice(prefix.length);
  }

  function getParams(tokens) {
    const params = tokens;

    let counter = 0;

    for (let [index, param] of params.entries()) {
      if (param.startsWith(open) && param !== open) {
        param = param.slice(open.length);
        params.splice(index, open.length, open, param);
        counter++;
      } else {
        while (param.endsWith(close) && param !== close && counter > 0) {
          param = param.slice(0, -close.length);
          params.splice(index, close.length, param, close);
          counter--;
        }
      }
    }

    return params;
  }

  function isReserved(keyword) {
    return keyword === assign || keyword === arrow || keyword === open || keyword === close;
  }

  function setPrefix(newPrefix) {
    prefix = newPrefix;
  }

  function setCommand(identifier, command) {
    commands[identifier] = command;
  }

  function getCommand(identifier) {
    return commands[identifier];
  }

  function parseGrouping(values) {
    while (values.includes(open)) {
      const lastOpen = values.lastIndexOf(open);
      const respectiveClose = values.slice(lastOpen).indexOf(close) + lastOpen;

      if (respectiveClose < lastOpen) {
        return false;
      }

      const innerGroup = values.slice(lastOpen + 1, respectiveClose);

      values.splice(lastOpen, respectiveClose + 1 - lastOpen, innerGroup);
    }

    return true;
  }

  function generateCommand(commandInstructions, defaultBehavior = (output) => output) {
    const sep = commandInstructions.indexOf(arrow);
    const variables = commandInstructions.slice(0, sep === -1 ? 0 : sep);
    const executionInstructions = commandInstructions.slice(sep + 1);

    const successVars = parseGrouping(variables);
    const successInst = parseGrouping(executionInstructions);

    // console.log(`variables: ${variables}`);
    // console.log(`executionInstructions: ${executionInstructions}`);

    function command(commandArgs) {
      const successArgs = parseGrouping(commandArgs);

      let useVariables = true; // TODO: Encapsulate this logic better

      // console.log(`commandArgs: ${commandArgs}`);

      function executeVariable(variable) {
        const variableIndex = variables.indexOf(variable);
        const variableValue = commandArgs[variableIndex];

        try {
          if (variableValue) {
            useVariables = false;
            let result = '';
            if (typeof variableValue === 'string') {
              result = execute([variableValue]).join(' ');
            } else {
              result = execute(variableValue).join(' ');
            }
            useVariables = true;
            return result;
          }
        } catch (error) {
          throw { identifier: 'NESTED_ERROR', context: { target: 'Variable', identifier: typeof variableValue === 'string' ? variableValue : variableValue.join(' '), step: variableIndex, error } };
        }
      }

      function executeInstruction(instruction) {
        if (useVariables) {
          return executeVariable(instruction) || instruction;
        }

        return instruction;
      }

      function executeSubcommand(identifier, subinstructions, step = 0) {
        const subcommand = commands[identifier];

        if (subcommand) {
          const subargs = execute(subinstructions);

          try {
            return subcommand(subargs);
          } catch (error) {
            throw { identifier: 'NESTED_ERROR', context: { target: 'Subcommand', identifier, step, error } };
          }
        } else {
          throw { identifier: 'NOT_FOUND_ERROR', context: { target: 'Subcommand', identifier } };
        }
      }

      function execute(instructions, useDefault = false) {
        const output = [];

        // console.log(`instructions: ${instructions}`);

        if (instructions) {
          for (const [index, instruction] of instructions.entries()) {
            if (typeof instruction === 'string') {
              if (instruction.startsWith(prefix) && instruction !== prefix) {
                const identifier = getIdentifier(instruction);
                const subinstructions = instructions.slice(index + 1);

                output.push(executeSubcommand(identifier, subinstructions, index));
                break;
              } else {
                output.push(executeInstruction(instruction));
              }
            } else {
              try {
                output.push(execute(instruction).join(' '));
              } catch (error) {
                throw { identifier: 'NESTED_ERROR', context: { target: 'Instruction group', identifier: recursiveJoin(instruction), step: index, error } };
              }
            }
          }
        }

        // console.log(`output: ${output}`);

        if (useDefault) {
          return defaultBehavior(output);
        } else {
          return output;
        }
      }

      if (!successArgs) {
        throw { identifier: 'PARENTHESIS_ERROR', context: { target: 'arguments' } };
      }

      if (commandArgs.includes('')) {
        throw { identifier: 'ARGUMENT_ERROR' };
      }

      if (variables.length !== commandArgs.length) {
        throw { identifier: 'ARGUMENT_ERROR', context: { target: 'arguments', expected: variables.length, received: commandArgs.length } };
      }

      return execute(executionInstructions, true).join(' ').trim();
    }

    if (!(successVars && successInst)) {
      throw { identifier: 'PARENTHESIS_ERROR', context: { target: 'declaration' } };
    }

    return command;
  }

  function parse(msg) {
    const content = msg.trim();

    if (content.startsWith(prefix + open) && content.endsWith(close)) {
      const tokens = content.slice(prefix.length + open.length).slice(0, -close.length).split(' ');
      const params = getParams(tokens);

      const command = generateCommand(params);

      return `${command([])}`;
    }

    if (content.startsWith(prefix)) {
      const tokens = content.split(' ');
      const params = getParams(tokens.slice(1));
      const identifier = getIdentifier(tokens[0]);

      if (identifier === '') {
        if (params[0] === assign) {
          const oldPrefix = prefix;
          const newPrefix = params[1];

          if (isReserved(newPrefix)) {
            throw { identifier: 'NOT_VALID_ERROR', context: { identifier: newPrefix, target: 'new prefix' } };
          }

          setPrefix(newPrefix);

          throw { identifier: 'PREFIX_CHANGED', context: { target: oldPrefix, identifier: newPrefix } };
        }

        return;
      }

      if (params[0] === assign) {
        if (isReserved(identifier)) {
          throw { identifier: 'NOT_VALID_ERROR', context: { identifier, target: 'command identifier' } };
        }

        const command = generateCommand(params.slice(1));

        setCommand(identifier, command);

        throw { identifier: 'COMMAND_ADDED', context: { identifier, content } };
      } else {
        const command = getCommand(identifier);

        if (command) {
          try {
            return `${command(params)}`;
          } catch (error) {
            throw { identifier: 'NESTED_ERROR', context: { target: 'Command', identifier, content, error } };
          }
        } else {
          throw { identifier: 'NOT_FOUND_ERROR', context: { target: 'Command', identifier } };
        }
      }
    }
  }

  return {
    parse,
  };
}

module.exports = Parser;
