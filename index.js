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

    const response = await interpreter(content, {
      channelId: msg.channel.id,
      authorId: msg.author.id,
      authorMention: msg.author.mention,
      messageId: msg.id,
    });

    if (response) {
      let sliceStart = 0;
      while (sliceStart < response.length) {
        const slice = response.slice(sliceStart, sliceStart + 2048);
        bot.createMessage(msg.channel.id, {
          embed: {
            description: slice,
          },
        });
        sliceStart += 2048;
      }
    } // TODO: implement some sort of file handler that can be interacted with by default commands to allow the bot to send images and alike
  }
});

bot.connect();
