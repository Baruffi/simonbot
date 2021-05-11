const { openDb, storage, parser, handler, bot, cache } = require('./setup');

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
    } catch (action) {
      console.log(action);
    }

    cache.cache(
      retrievedCommand.IDENTIFIER,
      `${retrievedCommand.DEFINITION}\n`
    );
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
    }

    if (response) {
      bot.createMessage(msg.channel.id, response);
    }
  }
});

bot.connect();
