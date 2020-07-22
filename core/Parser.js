const open = '(';
const close = ')';
const arrow = '->';
const assign = '=';

// TODO: make a stack trace of all actions in a global context object to improve error throwing
function Parser(prefix = '!', commands = {}) {
  function getIdentifier(token) {
    return token.slice(prefix.length);
  }

  function getParams(tokens) {
    const params = tokens.slice(1);

    for (let [index, param] of params.entries()) {
      if (param.startsWith(open) && param !== open) {
        param = param.slice(1);
        params.splice(index, 1, open, param);
      } else {
        while (param.endsWith(close) && param !== close) {
          param = param.slice(0, -1);
          params.splice(index, 1, param, close);
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
      throw new Error(`'${newPrefix}' is not a valid new prefix.`);
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

  function generateCommand(commandInstructions) {
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
        return commandArgs[variables.indexOf(variable)];
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
          throw new Error(`Subcommand not found '${identifier}'.`);
        }
      }

      function execute(instructions) {
        const output = [];

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

        return output;
      }

      if (!successArgs) {
        throw new Error('Unmatched parenthesis found in command arguments.');
      }

      if (commandArgs.includes('')) {
        throw new Error('Empty arguments are not allowed.');
      }

      if (variables.length !== commandArgs.length) {
        // TODO: improve this error message.
        throw new Error(
          `Incorrect arguments. This command requires exactly ${
            variables.length
          } argument${variables.length > 1 ? 's' : ''}.`,
        );
      }

      return execute(executionInstructions).join(' ').trim();
    }

    if (!(successVars && successInst)) {
      throw new Error('Unmatched parenthesis found in command declaration.');
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
          throw new Error(`Command not found '${identifier}'.`);
        }
      }
    }
  }

  return {
    parse,
  };
}

module.exports = Parser;
