function Parser({ prefix, commands }) {
  function generateCommand(commandInstructions) {
    const command = (commandArgs) => {
      const index = commandInstructions.indexOf('->');
      const variables = commandInstructions.slice(0, index === -1 ? 0 : index);
      const executionInstructions = commandInstructions.slice(index + 1);

      function execute(instructions) {
        const output = [];

        for (const instruction of instructions) {
          const arg = commandArgs[variables.indexOf(instruction)];

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
                const subargs = execute(subinstructions).split(' ');

                output.push(subcommand(subargs));
                break;
              } else {
                return `Subcommand not found '${identifier}'.`;
              }
            }
          }

          output.push(instruction);
        }

        return output.join(' ').trim();
      }

      if (variables.length > commandArgs.length) {
        return `Insufficient arguments! This command requires the following arguments: '${variables.join(
          ' ',
        )}'`;
      }

      return execute(executionInstructions);
    };

    return command;
  }

  function parse(msg) {
    const content = msg.trim();

    if (content.startsWith(prefix)) {
      const tokens = content.slice(prefix.length).split(' ');
      const identifier = tokens[0];
      const params = tokens.slice(1);

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
