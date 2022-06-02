import Eris from 'eris';
import { open } from 'sqlite';
import pkg from 'sqlite3';
import auth from './auth.json' assert { type: 'json' };
import { prefix } from './constants/reserved.js';
import Cache from './core/Cache.js';
import Handler from './core/Handler.js';
import Interpreter from './core/Interpreter.js';
import Storage from './core/Storage.js';

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
  helps: `(default) ${prefix}helps = Help command with basic instructions on how to use the bot`,
  lists: `(default) ${prefix}lists = List all registered commands`,
  says: `(default) ${prefix}says = say something!`,
  gets: `(default) ${prefix}gets = get the ids of a number of messages sent up to and including the command message!`,
  cleans: `(default) ${prefix}cleans = remove messages from a channel by their ids!`,
};

const commands = {
  helps: () => `Hi! I'm SimonBot, but you can call me Simon :sunglasses:
You can program your own commands for me by setting them with an \`=\` sign! Like: \`${prefix}command = text\`.
You can also add arguments to your commands by writing them like: \`${prefix}command = argument1 argument2 ... -> text\` and even reference them in your text!
You can even call other commands inside the command by using the prefix: \`${prefix}command1 = ${prefix}command2\`.
And finally, you can group everything with *parenthesis*! Then just call it as you normally would! Try it :D`,
  lists: () => cache.toString(),
  says: (...args) => args.slice(1).join(' '),
  gets: async (metadata, arg_get, arg_skip) => {
    handler.addToContext('target', 'argument');
    handler.addToContext('identifier', [arg_get, arg_skip]);
    const [channelId, _, messageId] = metadata;
    const channel = bot.getChannel(channelId);
    const n_messages_to_get = parseInt(arg_get);
    const n_messages_to_skip = parseInt(arg_skip);
    if (
      channel &&
      messageId &&
      n_messages_to_get > 0 &&
      n_messages_to_skip >= 0
    ) {
      const got_message_ids = [];
      if (n_messages_to_get + n_messages_to_skip > 1) {
        const got_messages = await channel.getMessages({
          before: messageId,
          limit: n_messages_to_get + n_messages_to_skip - 1,
        });
        got_message_ids.push(...got_messages.map((message) => message.id));
      }
      got_message_ids.push(messageId);
      if (n_messages_to_skip > 0) {
        return got_message_ids.slice(0, -n_messages_to_skip).join(' ');
      }
      return got_message_ids.join(' ');
    }
    throw 'NOT_VALID_ERROR';
  },
  cleans: async (metadata, ...messages_to_delete) => {
    try {
      handler.addToContext('target', 'argument');
      handler.addToContext('identifier', messages_to_delete);
      const [channelId] = metadata;
      const channel = bot.getChannel(channelId);
      if (channel && messages_to_delete.length > 0) {
        await channel.deleteMessages(messages_to_delete);
        return `Cleaned ${messages_to_delete.length} messages!`;
      }
    } catch (error) {
      handler.addToContext('error', error);
      throw 'PARSING_ERROR';
    }
    throw 'NOT_VALID_ERROR';
  },
};

const actions = {
  COMMAND_ADDED: (context) => {
    if (!context.identifier || !context.line) {
      throw 'ATTEMPTED TO ADD INVALID COMMAND (NULL IDENTIFIER OR DEFINITION)';
    }
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

export const interpreter = Interpreter(handler, prefix, commands);

export const bot = Eris(auth.token);
