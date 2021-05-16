import Eris from 'eris';
import { open } from 'sqlite';
import pkg from 'sqlite3';
import auth from './auth.json';
import Cache from './core/Cache.js';
import Handler from './core/Handler.js';
import Storage from './core/Storage.js';
import Interpreter from './core/Interpreter.js';

const { Database } = pkg;

export async function openDb() {
  return open({
    filename: './tmp/database.db', // Change this path to save the database file somewhere else
    driver: Database,
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

const commandList = {
  help: '(default) !help = Help command with basic instructions on how to use the bot',
  list: '(default) !list = List all registered commands',
  say: '(default) !say = say something!',
};

const commands = {
  help: () => `Hi! I'm SimonBot, but you can call me Simon :sunglasses:
You can program your own commands for me by setting them with an \`=\` sign! Like: \`!command = text\`.
You can also add arguments to your commands by writing them like: \`!command = argument1 argument2 ... -> text\` and even reference them in your text!
You can even call other commands inside the command by using the prefix: \`!command1 = !command2\`.
And finally, you can group everything with *parenthesis*! Then just call it as you normally would! Try it :D`,
  list: () => cache.toString(),
  say: (arg) => arg,
};

const actions = {
  COMMAND_ADDED: (context) => {
    storage.store(context.identifier, context.line);
    cache.cache(context.identifier, context.line);

    return `Command '${context.identifier}' successfully set.`;
  },
  NOT_VALID_ERROR: (context) =>
    `'${context.identifier}' in '${context.line}' is not a valid ${context.target}.`,
  NOT_FOUND_ERROR: (context) =>
    `${context.target} not found '${context.identifier}'.`,
  PARSING_ERROR: (context) =>
    `Error parsing ${context.target} at '${context.line}': ${context.error}`,
  NESTED_ERROR: (context) => {
    const output = [];

    if (typeof context.error === 'string') {
      output.push(actions[context.error](context));
    } else {
      output.push(context.error);
    }

    while (context.previous) {
      context = context.previous;

      output.unshift(`${context.target} '${context.identifier}' returned:`);
    }

    return output.join('\n');
  },
};
export const cache = Cache(commandList);

export const storage = Storage(saveDefinition, getDefinitions);

export const handler = Handler(actions, 'Unknown error.');

export const interpreter = Interpreter(handler, '!', commands);

export const bot = Eris(auth.token);
