function Parser({ callsign, commands }) {
  function generateCommand(commandInstructions) {
    const command = (commandArgs) => {
      function execute(instructions, args) {
        const output = [];

        for (const instruction of instructions) {
          if (instruction.startsWith(callsign)) {
            let identifier = instruction.slice(callsign.length);

            if (identifier) {
              if (identifier.startsWith(callsign) && identifier !== callsign) {
                identifier = execute([identifier], args);
              }

              if (identifier === callsign) {
                output.push(args.join(' '));
                continue;
              }

              if (/^\d+/.test(identifier)) {
                const number = parseInt(identifier);
                const arg = args[number];

                if (arg) {
                  output.push(arg);
                }

                continue;
              }

              const subcommand = commands[identifier];

              if (subcommand) {
                output.push(subcommand(args));
                continue;
              } else {
                return `Subcommand not found '${identifier}'.`;
              }
            }
          }

          output.push(instruction);
        }

        return output.join(' ').trim();
      }

      return execute(commandInstructions, commandArgs);
    };

    return command;
  }

  function parse(msg) {
    const content = msg.trim();

    if (content.startsWith(callsign)) {
      const tokens = content.slice(callsign.length).split(' ');
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
