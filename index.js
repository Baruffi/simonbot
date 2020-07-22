const Eris = require('eris');
const Handler = require('./core/Handler');
const Parser = require('./core/Parser');
const { token } = require('./auth.json');

const parser = Parser('!', {
  error: () => {
    throw new Error('ERROR');
  },
});

const handler = Handler({ error: (error) => error.message });

const bot = Eris(token);

bot.on('ready', () => {
  console.log('Ready!');
});

bot.on('messageCreate', (msg) => {
  if (!msg.author.bot) {
    let response;

    try {
      response = parser.parse(msg.content);
    } catch (error) {
      response = handler.handle('error', error);
    }

    if (response) {
      bot.createMessage(msg.channel.id, response);
    }
  }
});

bot.connect();
