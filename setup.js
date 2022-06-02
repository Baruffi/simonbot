import Eris from 'eris';
import { open } from 'sqlite';
import pkg from 'sqlite3';
import auth from './auth.json' assert { type: 'json' };
import { defaultPrefix } from './constants/prefixes.js';
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
  helps: `(default) ${defaultPrefix}helps = Help command with basic instructions on how to use the bot`,
  lists: `(default) ${defaultPrefix}lists = List all registered commands`,
  says: `(default) ${defaultPrefix}says = say something!`,
  gets: `(default) ${defaultPrefix}gets = get the ids of a number of messages sent up to and including the command message!`,
  cleans: `(default) ${defaultPrefix}cleans = remove messages from a channel by their ids!`,
};

const commands = {
  helps: () => `Hi! I'm SimonBot, but you can call me Simon :sunglasses:
You can program your own commands for me by setting them with an \`=\` sign! Like: \`${defaultPrefix}command = text\`.
You can also add arguments to your commands by writing them like: \`${defaultPrefix}command = argument1 argument2 ... -> text\` and even reference them in your text!
You can even call other commands inside the command by using the defaultPrefix: \`${defaultPrefix}command1 = ${defaultPrefix}command2\`.
And finally, you can group everything with *parenthesis*! Then just call it as you normally would! Try it :D`,
  lists: () => cache.toString(),
  says: (...args) => args.slice(1).join(' '),
  gets: async (
    metadata,
    argGet,
    argSkip,
    argFilterAuthor,
    argFilterContent
  ) => {
    handler.addToContext('target', 'argument');
    handler.addToContext('identifier', [argGet, argSkip]);
    const [channelId, authorId, messageId] = metadata;
    const channel = bot.getChannel(channelId);
    const nMessagesToGet = parseInt(argGet);
    const nMessagesToSkip = parseInt(argSkip);
    if (channel && messageId && nMessagesToGet > 0 && nMessagesToSkip >= 0) {
      const gotMessageIds = [];
      if (nMessagesToGet + nMessagesToSkip > 1) {
        const gotMessages = await channel.getMessages({
          before: messageId,
          limit: nMessagesToGet + nMessagesToSkip - 1,
        });
        gotMessageIds.push(
          ...gotMessages
            .filter(
              (message) =>
                message.author.id === bot.user.id ||
                ((argFilterContent === '0' ||
                  message.content.includes(argFilterContent)) &&
                  (argFilterAuthor === '0' ||
                    (argFilterAuthor === 'self'
                      ? message.author.id === authorId
                      : message.author.id === argFilterAuthor)))
            )
            .map((message) => message.id)
        );
      }
      gotMessageIds.push(messageId);
      if (nMessagesToSkip > 0) {
        return gotMessageIds.slice(0, -nMessagesToSkip).join(' ');
      }
      return gotMessageIds.join(' ');
    }
    throw 'NOT_VALID_ERROR';
  },
  cleans: async (metadata, ...messagesToDelete) => {
    try {
      handler.addToContext('target', 'argument');
      handler.addToContext('identifier', messagesToDelete);
      const [channelId] = metadata;
      const channel = bot.getChannel(channelId);
      if (channel && messagesToDelete.length > 0) {
        await channel.deleteMessages(messagesToDelete);
        return `Cleaned ${messagesToDelete.length} messages!`;
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

export const interpreter = Interpreter(handler, defaultPrefix, commands);

export const bot = Eris(auth.token);
