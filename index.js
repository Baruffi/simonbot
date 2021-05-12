import Eris from 'eris';
import Parser from './new/Parser.js';
import auth from './auth.json';

const parser = Parser('!');
const bot = Eris(auth.token);

bot.on('ready', () => {
  console.log('Ready!');
});

bot.on('messageCreate', (msg) => {
  if (!msg.author.bot) {
    const content = msg.content;
    let response;

    try {
      response = parser(content);
    } catch (error) {
      console.log(error);
    }

    if (response) {
      bot.createMessage(msg.channel.id, response);
    }
  }
});

bot.connect();
