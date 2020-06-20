function Parser({ prefix, commands }) {
  function generateCommand(commandInstructions) {
    const command = (commandArgs) => {
      const arrow = commandInstructions.indexOf('->');
      const variables = commandInstructions.slice(0, arrow === -1 ? 0 : arrow);
      const executionInstructions = commandInstructions.slice(arrow + 1);

      while (commandArgs.includes('(')) {
        const lastOpen = commandArgs.lastIndexOf('(');
        const respectiveClose = commandArgs
          .map((arg, index) => [arg, index])
          .filter((arg) => arg[0] === ')' && arg[1] > lastOpen)[0][1];
        const innerGroup = commandArgs
          .slice(lastOpen + 1, respectiveClose)
          .join(' ');

        commandArgs.splice(
          lastOpen,
          respectiveClose + 1 - lastOpen,
          innerGroup,
        );
      }

      function execute(instructions) {
        const output = [];

        for (const instruction of instructions) {
          if (instruction === '(') {
            output.push(
              ...execute(
                instructions.splice(
                  instructions.indexOf(instruction),
                  instructions.lastIndexOf(')') -
                    instructions.indexOf(instruction),
                ),
              ),
            );
            continue;
          }

          const arg = commandArgs[variables.indexOf(instruction)];

          if (arg === '') {
            return ['Empty arguments are not allowed!'];
          }

          if (arg) {
            output.push(arg);
            continue;
          }

          if (instruction.startsWith(prefix)) {
            const identifier = instruction.slice(prefix.length);

            if (identifier) {
              const subcommand = commands[identifier];

              if (subcommand) {
                const subinstructions = instructions.slice(
                  instructions.indexOf(instruction) + 1,
                );
                const subargs = execute(subinstructions);

                output.push(subcommand(subargs));
                break;
              } else {
                return [`Subcommand not found '${identifier}'.`];
              }
            }
          }

          output.push(instruction);
        }

        return output;
      }

      if (variables.length > commandArgs.length) {
        return [
          `Insufficient arguments! This command requires the following arguments: '${variables.join(
            ' ',
          )}'`,
        ];
      }

      return execute(executionInstructions).join(' ').trim();
    };

    return command;
  }

  function parse(msg) {
    const content = msg.trim();

    if (content.startsWith(prefix)) {
      const tokens = content.slice(prefix.length).split(' ');
      const identifier = tokens[0];
      const params = tokens.slice(1);

      for (let [index, param] of params.entries()) {
        if (param.startsWith('(') && param !== '(') {
          param = param.slice(1);
          params.splice(index, 1, '(', param);
        } else {
          while (param.endsWith(')') && param !== ')') {
            param = param.slice(0, -1);
            params.splice(index, 1, param, ')');
          }
        }
      }

      if (identifier === '') {
        return;
      }

      if (params[0] === '=') {
        const command = generateCommand(params.slice(1));

        commands[identifier] = command;

        return `Command '${identifier}' successfully set!`;
      } else {
        const command = commands[identifier];

        if (command) {
          return `${command(params)}`;
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
