const Eris = require('eris');
const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const Handler = require('./core/Handler');
const Parser = require('./core/Parser');
const Storage = require('./core/Storage');
const Cache = require('./core/Cache');
const { token } = require('./auth.json');

async function openDb() {
  return open({
    filename: '/tmp/database.db',
    driver: sqlite3.Database,
  });
}

async function getDefinitions() {
  const db = await openDb();
  const result = await db.all('SELECT IDENTIFIER, DEFINITION FROM COMMANDS');
  await db.close();

  return result;
}

async function saveDefinition(identifier, definition) {
  const db = await openDb();
  await db.run(
    'INSERT OR REPLACE INTO COMMANDS (IDENTIFIER, DEFINITION) VALUES (?, ?)',
    identifier,
    definition
  );
  await db.close();
}

let cooldown = 0;

function decCooldown() {
  if (cooldown > 0) {
    cooldown -= 1;
    setTimeout(decCooldown, 1000);
  }
}

const commandList = {
  help: '(default) !help = Help command with basic instructions on how to use the bot\n',
  list: '(default) !list = List all registered commands\n',
};

const commands = {
  jsopr: ([opr, val1, val2]) => [`${eval(`${val1} ${opr} ${val2}`)}`],
  jsif: ([cond, val1, val2]) => (cond === 'true' ? [`${val1}`] : [`${val2}`]),
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
  help: () => [
    `Hi! I'm SimonBot, but you can call me Simon :sunglasses:
You can program your own commands for me by setting them with an \`=\` sign! Like: \`!command = text\`.
You can also add arguments to your commands by writing them like: \`!command = argument1 argument2 ... -> text\` and even reference them in your text!
You can even call other commands inside the command by using the prefix: \`!command1 = !command2\`.
And finally, you can group everything with *parenthesis*! Then just call it as you normally would! Try it :D`,
  ],
  list: () => cache.get(),
};

const actions = {
  COMMAND_ADDED: (context) => {
    storage.store(context.identifier, context.content);
    cache.cache(context.identifier, `${context.content}\n`);

    return `Command '${context.identifier}' successfully set.`;
  },
  NOT_VALID_ERROR: (context) =>
    `'${context.identifier}' is not a valid ${context.target}.`,
  NOT_FOUND_ERROR: (context) =>
    `${context.target} not found '${context.identifier}'.`,
  PARENTHESIS_ERROR: (context) =>
    `Unmatched parenthesis found in ${context.target}.`,
  ARGUMENT_ERROR: (context) => {
    if (context) {
      return `Received the wrong number of arguments. Expected: ${context.expected}. Received: ${context.received}.`;
    } else {
      return 'Empty arguments are not allowed.';
    }
  },
  COOLDOWN_ERROR: (context) =>
    `This command is on cooldown for ${context.target} seconds.`,
  PREFIX_CHANGED: (context) =>
    `Prefix '${context.target}' updated to '${context.identifier}'.`,
  NESTED_ERROR: (context) =>
    `${context.target} '${context.identifier}' ${
      context.step ? `called at step ${context.step}` : 'returned'
    }:\n${
      typeof actions[context.error.identifier] === 'function'
        ? actions[context.error.identifier](context.error.context)
        : context.error
    }`,
};
const cache = Cache(commandList);

const storage = Storage(saveDefinition, getDefinitions);

const parser = Parser('!', commands);

const handler = Handler(actions, 'Unknown error.');

const bot = Eris(token);

module.exports = {
  openDb,
  storage,
  parser,
  handler,
  bot,
  cache,
};
