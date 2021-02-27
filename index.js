const Eris = require('eris');
const Handler = require('./core/Handler');
const Parser = require('./core/Parser');
const { token } = require('./auth.json');

let cooldown = 0;

function decCooldown() {
  if (cooldown > 0) {
    cooldown -= 1;
    setTimeout(decCooldown, 1000);
  }
}

const commands = {
  jsopr: ([opr, val1, val2]) => [`${eval(`${val1} ${opr} ${val2}`)}`],
  jsif: ([cond, val1, val2]) => cond === 'true' ? [`${val1}`] : [`${val2}`],
  jsrand: () => [`${Math.random()}`],
  cooldown: ([seconds]) => {
    if (cooldown) {
      throw { identifier: 'COOLDOWN_ERROR', context: { target: cooldown } };
    } else {
      cooldown = seconds;
      setTimeout(decCooldown, 1000);
      return [''];
    }
  },
  help: () =>
    [`Hi! I'm SimonBot, but you can call me Simon :sunglasses:
You can program your own commands for me by setting them with an \`=\` sign! Like: \`!command = text\`.
You can also add arguments to your commands by writing them like: \`!command = argument1 argument2 ... -> text\` and even reference them in your text!
You can even call other commands inside the command by using the prefix: \`!command1 = !command2\`.
And finally, you can group everything with *parenthesis*! Then just call it as you normally would! Try it :D`],
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
  COOLDOWN_ERROR: (context) => `This command is on cooldown for ${context.target} seconds.`,
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
      console.log(error);
      response = handler.handle(error.identifier, error.context);
    }

    if (response) {
      bot.createMessage(msg.channel.id, response);
    }
  }
});

bot.connect();
