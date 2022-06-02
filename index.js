import { bot, interpreter, openDb, storage } from './setup.js';

openDb().then(async (db) => {
  await db.run(
    'CREATE TABLE IF NOT EXISTS COMMANDS (IDENTIFIER PRIMARY KEY, DEFINITION TEXT)'
  );
  await db.close();
});

storage.retrieve().then(async (retrievedCommands) => {
  for (const retrievedCommand of retrievedCommands) {
    await interpreter(retrievedCommand.DEFINITION);
  }
});

bot.on('ready', () => {
  console.log('Ready!');
});

bot.on('messageCreate', async (msg) => {
  if (!msg.author.bot) {
    let content = msg.content;

    const response = await interpreter(content, [
      msg.channel.id,
      msg.author.id,
      msg.id,
    ]);

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
