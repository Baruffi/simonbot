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
    const params = tokens.slice(1);

    let counter = 0;

    for (let [index, param] of params.entries()) {
      if (param.startsWith(open) && param !== open) {
        param = param.slice(1);
        params.splice(index, 1, open, param);
        counter++;
      } else {
        while (param.endsWith(close) && param !== close && counter > 0) {
          param = param.slice(0, -1);
          params.splice(index, 1, param, close);
          counter--;
        }
      }
    }

    return params;
  }

  function setPrefix(newPrefix) {
    if (
      newPrefix !== assign &&
      newPrefix !== arrow &&
      newPrefix !== open &&
      newPrefix !== close
    ) {
      prefix = newPrefix;
    } else {
      throw { identifier: 'NOT_VALID_ERROR', context: { target: newPrefix, identifier: 'new prefix' } };
    }
  }

  function setCommand(identifier, command) {
    commands[identifier] = command;
  }

  function getCommand(identifier) {
    return commands[identifier];
  }

  function parseGrouping(values, join) {
    while (values.includes(open)) {
      const lastOpen = values.lastIndexOf(open);
      const respectiveClose = values.slice(lastOpen).indexOf(close) + lastOpen;

      if (respectiveClose < lastOpen) {
        return false;
      }

      const innerGroup = join
        ? values.slice(lastOpen + 1, respectiveClose).join(' ')
        : values.slice(lastOpen + 1, respectiveClose);

      values.splice(lastOpen, respectiveClose + 1 - lastOpen, innerGroup);
    }

    return true;
  }

  function generateCommand(commandInstructions, defaultBehavior = (output) => output) {
    const sep = commandInstructions.indexOf(arrow);
    const variables = commandInstructions.slice(0, sep === -1 ? 0 : sep);
    const executionInstructions = commandInstructions.slice(sep + 1);

    const successVars = parseGrouping(variables, false);
    const successInst = parseGrouping(executionInstructions, false);

    // console.log(`variables: ${variables}`);
    // console.log(`executionInstructions: ${executionInstructions}`);

    function command(commandArgs) {
      const successArgs = parseGrouping(commandArgs, true);

      // console.log(`commandArgs: ${commandArgs}`);

      function executeVariable(variable) {
        const value = commandArgs[variables.indexOf(variable)];

        if (value && value.startsWith(prefix) && value !== prefix) {
          const splitValue = value.split(' ');
          const identifier = getIdentifier(splitValue[0]);
          const subinstructions = splitValue.slice(1);

          return executeSubcommand(identifier, subinstructions);
        } else {
          return value;
        }
      }

      function executeInstruction(instruction) {
        return executeVariable(instruction) || instruction;
      }

      function executeSubcommand(identifier, subinstructions) {
        const subcommand = commands[identifier];

        if (subcommand) {
          const subargs = execute(subinstructions);

          return subcommand(subargs);
        } else {
          throw { identifier: 'NOT_FOUND_ERROR', context: { target: 'Subcommand', identifier } };
        }
      }

      function execute(instructions, useDefault = false) {
        const output = [];

        if (instructions) {
          for (const [index, instruction] of instructions.entries()) {
            if (typeof instruction === 'string') {
              if (instruction.startsWith(prefix) && instruction !== prefix) {
                const identifier = getIdentifier(instruction);
                const subinstructions = instructions.slice(index + 1);

                output.push(executeSubcommand(identifier, subinstructions));
                break;
              } else {
                output.push(executeInstruction(instruction));
              }
            } else {
              output.push(execute(instruction).join(' '));
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
        // TODO: improve this throw
        throw { identifier: 'ARGUMENT_ERROR', context: { target: variables.length } };
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

    if (content.startsWith(prefix)) {
      const tokens = content.split(' ');
      const params = getParams(tokens);
      const identifier = getIdentifier(tokens[0]);

      if (identifier === '') {
        if (params[0] === assign) {
          const oldPrefix = prefix;
          const newPrefix = params[1];

          setPrefix(newPrefix);

          return `Prefix '${oldPrefix}' updated to '${newPrefix}'.`;
        }

        return;
      }

      if (params[0] === assign) {
        const command = generateCommand(params.slice(1));

        setCommand(identifier, command);

        return `Command '${identifier}' successfully set.`;
      } else {
        const command = getCommand(identifier);

        if (command) {
          return `${command(params)}`;
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
