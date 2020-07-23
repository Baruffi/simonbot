const Eris = require('eris');
const Handler = require('./core/Handler');
const Parser = require('./core/Parser');
const { token } = require('./auth.json');

const commands = {
  error: () => {
    throw 'UNKNOWN_ERROR';
  }
}

const actions = {
  NOT_VALID_ERROR: (context) => `'${context.target}' is not a valid ${context.identifier}.`,
  NOT_FOUND_ERROR: (context) => `${context.target} not found '${context.identifier}'.`,
  PARENTHESIS_ERROR: (context) => `Unmatched parenthesis found in ${context.target}.`,
  ARGUMENT_ERROR: (context) => {
    if (context) {
      return `Incorrect arguments. This command requires exactly ${
        context.target
        } argument${context.target > 1 ? 's' : ''}.`
    } else {
      return 'Empty arguments are not allowed.'
    }
  },
};

const parser = Parser('!', commands);

const handler = Handler(actions, 'Unknown error.');

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
      // console.log(error);
      response = handler.handle(error.identifier, error.context);
    }

    if (response) {
      bot.createMessage(msg.channel.id, response);
    }
  }
});

bot.connect();
