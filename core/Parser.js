function Parser({ callsign, commands }) {
  function set(identifier, command) {
    commands[identifier] = command;
  }
  return {
    parse: function (msg) {
      const content = msg.trim();

      if (content.startsWith(callsign)) {
        const tokens = content.slice(callsign.length).split(' ');
        const identifier = tokens[0];
        const params = tokens.slice(1);

        if (identifier === '') {
          return;
        }

        if (params[0] === '=') {
          set(identifier, function (args) {
            let response;
            try {
              response = eval(params.slice(1).join(' ')).toString();
            } catch {
              response = params.slice(1).join(' ');
            }
            return response;
          });
          return 'Command successfully added!';
        } else {
          const command = commands[identifier];

          if (command) {
            const response = command(params);
            if (typeof response === 'string') {
              return response;
            }
          } else {
            return `Command not found '${identifier}'.`;
          }
        }
      }
    },
  };
}

module.exports = Parser;
