import { openDb, storage, interpreter, bot } from './setup.js';

openDb().then(async (db) => {
  await db.run(
    'CREATE TABLE IF NOT EXISTS COMMANDS (IDENTIFIER PRIMARY KEY, DEFINITION TEXT)'
  );
  await db.close();
});

storage.retrieve().then((retrievedCommands) => {
  for (const retrievedCommand of retrievedCommands) {
    interpreter(retrievedCommand.DEFINITION);
  }
});

bot.on('ready', () => {
  console.log('Ready!');
});

bot.on('messageCreate', (msg) => {
  if (!msg.author.bot) {
    const content = msg.content;
    const response = interpreter(content);

    if (response) {
      bot.createMessage(msg.channel.id, {
        embed: {
          description: response.slice(-2048),
        },
      });
    }
  }
});

bot.connect();
