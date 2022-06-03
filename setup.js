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
  defines: `(default) ${defaultPrefix}defines = command -> Print the definition for a specific command`,
  targets: `(default) ${defaultPrefix}targets = targetidx list -> target a single value from a list and return it!`,
  says: `(default) ${defaultPrefix}says = text -> say something!`,
  reacts: `(default) ${defaultPrefix}reacts = reaction messageId -> simon reacts to a message with your choice of emote!`,
  asks: `(default) ${defaultPrefix}asks = question -> ask a question to be answered on the respective channel later!`,
  answers: `(default) ${defaultPrefix}answers = question -> answer the last question asked on the respective channel!`,
  gets: `(default) ${defaultPrefix}gets = n_of_messages, n_of_skips, filter -> get the ids of a number of messages sent up to and including the command message!`,
  cleans: `(default) ${defaultPrefix}cleans = messageIds -> remove messages from a channel by their ids!`,
  identifies: `(default) ${defaultPrefix}identifies = identifier messageId -> get chosen information from the author of a message!`,
};

const questions = {};

const commands = {
  helps: () => `Hi! I'm SimonBot!
You can program your own commands by setting them with an \`=\` sign! As in: \`${defaultPrefix}command = text\`.
Commands can be named anything as long as it does not include spaces or one of the reserved symbols in my configuration.
You can also add arguments to your commands by writing them as such: \`${defaultPrefix}command = argument1 argument2 ... -> text\` and then every time they are mentioned in the command body they will be replaced by the argument value passed.
You can even call other commands inside your new command: \`${defaultPrefix}command1 = ${defaultPrefix}command2\`.
And, finally, you can group everything with \`(parenthesis)\` to handle multiple words as a single value.
By combining these features with some of the default commands you can customize my functionality to your liking!
And if you want to see all the current commands just call \`${defaultPrefix}lists\` :sunglasses:`,
  lists: () =>
    cache.toMap(([key, value]) => `**${key}**: ${value}`).join('\n\n'),
  defines: (metadata, command) => {
    const definition = cache.get(command);
    return definition ?? 'Could not define: command not found.';
  },
  targets: (metadata, argIdx, ...list) => {
    const targetIdx = parseInt(argIdx);
    return list[targetIdx];
  },
  says: (...text) => text.slice(1).join(' '),
  reacts: async (metadata, reaction, messageId) => {
    const { channelId } = metadata;
    const message = await bot.getChannel(channelId).getMessage(messageId);
    await bot.addMessageReaction(channelId, message.id, reaction);
    return 'Reaction added!';
  },
  asks: (metadata, ...text) => {
    const { channelId, authorMention } = metadata;
    if (!questions[channelId]) {
      questions[channelId] = [];
    }
    questions[channelId].push({
      authorMention,
      question: text.join(' '),
    });
    return 'Question successfully registered!';
  },
  answers: (metadata, ...text) => {
    const { channelId, authorMention } = metadata;
    if (questions[channelId] && questions[channelId].length > 0) {
      const lastQuestion = questions[channelId].pop();
      return `${lastQuestion.authorMention} asks: '${lastQuestion.question}'
${authorMention} replies: '${text.join(' ')}'`;
    }
    return 'No questions in this channel!';
  },
  gets: async (metadata, argGet, argSkip, ...argFilter) => {
    handler.addToContext('target', 'argument');
    handler.addToContext('identifier', [argGet, argSkip]);
    const { channelId, authorId, messageId } = metadata;
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
        const filters = argFilter
          .join('')
          .split(',')
          .map((filter) =>
            filter.split(':').map((filter_part) => filter_part.trim())
          )
          .reduce(
            (obj, item) => ({
              ...obj,
              [item[0]]: item[1],
            }),
            {}
          );

        gotMessageIds.push(
          ...gotMessages
            .filter(
              (message) =>
                (!filters['content'] ||
                  message.content.match(filters['content'])) &&
                (!filters['authors'] ||
                  (filters['authors'] === 'self'
                    ? message.author.id === authorId ||
                      message.author.id === bot.user.id
                    : filters['authors'].includes(message.author.id)))
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
      const { channelId } = metadata;
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
  identifies: async (metadata, identifier, messageId) => {
    const { channelId } = metadata;
    const message = await bot.getChannel(channelId).getMessage(messageId);
    return message.author[identifier];
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
