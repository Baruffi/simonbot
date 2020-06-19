const Client = require('./core/Client');
const Eris = require('eris');
const Parser = require('./core/Parser');
const { token } = require('./auth.json');

const parser = Parser({ prefix: '!', commands: {} });

const client = Client(parser);

const bot = new Eris(token);

bot.on('ready', () => {
  console.log('Ready!');
});

bot.on('messageCreate', (msg) => {
  if (!msg.author.bot) {
    const response = client.parse(msg.content);

    if (response) {
      bot.createMessage(msg.channel.id, response);
    }
  }
});

bot.connect();
