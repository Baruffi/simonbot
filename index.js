const { openDb, storage, parser, handler, bot } = require('./setup');

openDb().then(async (db) => {
  // await db.run(
  //   "DROP TABLE IF EXISTS COMMANDS"
  // );
  await db.run(
    'CREATE TABLE IF NOT EXISTS COMMANDS (IDENTIFIER PRIMARY KEY, DEFINITION TEXT)'
  );
  await db.close();
});

storage.retrieve().then((retrievedCommands) => {
  for (const retrievedCommand of retrievedCommands) {
    try {
      parser.parse(retrievedCommand.DEFINITION);
    } catch (error) {
      console.log(error);
    }
  }
});

bot.on('ready', () => {
  console.log('Ready!');
});

bot.on('messageCreate', (msg) => {
  if (!msg.author.bot) {
    const content = msg.content;
    let response;

    try {
      response = parser.parse(content);
    } catch (action) {
      console.log(action);
      response = handler.handle(action.identifier, action.context);

      // TODO: improve interaction between action handler and storage
      if (action.identifier === 'COMMAND_ADDED') {
        storage.store(action.context.identifier, content);
      }
    }

    if (response) {
      bot.createMessage(msg.channel.id, response);
    }
  }
});

bot.connect();
