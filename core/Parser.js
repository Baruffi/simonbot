const open = '(';
const close = ')';
const arrow = '->';

function Parser({ prefix, commands }) {
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
              const identifier = instruction.slice(prefix.length);
              const subinstructions = instructions.slice(index + 1);

              try {
                output.push(executeSubcommand(identifier, subinstructions));
              } catch (error) {
                throw new Error(
                  `On subcommand '${identifier}':\n${error.message}`.replace(
                    /\n/g,
                    '\n\t',
                  ),
                );
              }

              break;
            } else {
              output.push(executeInstruction(instruction));
            }
          } else {
            output.push(...execute(instruction));
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
      const tokens = content.slice(prefix.length).split(' ');
      const identifier = tokens[0];
      const params = tokens.slice(1);

      if (identifier === '') {
        if (params[0] === '=') {
          const oldPrefix = prefix;
          prefix = params[1];
          return `Prefix '${oldPrefix}' updated to '${prefix}'.`;
        }
      }

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

      if (params[0] === '=') {
        try {
          const command = generateCommand(params.slice(1));

          commands[identifier] = command;

          return `Command '${identifier}' successfully set.`;
        } catch (error) {
          return error.message;
        }
      } else {
        const command = commands[identifier];

        if (command) {
          try {
            return `${command(params)}`;
          } catch (error) {
            return error.message;
          }
        } else {
          return `Command not found '${identifier}'.`;
        }
      }
    }
  }

  return {
    parse,
  };
}

module.exports = Parser;
