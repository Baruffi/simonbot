function CommandParser(getIdentifier, call) {
  function parse(variables, executionInstructions, defaultConsumer) {
    async function command(callArgs, metadata) {
      function getArgument(argumentIdx) {
        return callArgs[argumentIdx];
      }

      function parseVariables(instructions) {
        const replacedInstructions = [];

        for (const instruction of instructions) {
          replacedInstructions.push(parseVariable(instruction));
        }

        return replacedInstructions;
      }

      function parseVariable(instruction) {
        if (typeof instruction !== 'string') {
          return parseVariables(instruction);
        }

        const variableIdx = variables.indexOf(instruction);

        if (variableIdx !== -1) {
          return getArgument(variableIdx);
        }

        return instruction;
      }

      async function parseInstructions(instructions) {
        const replacedInstructions = [];

        while (instructions.length) {
          if (variables.length) {
            instructions = parseVariables(instructions);
          }

          const parsedInstruction = await parseInstruction(
            instructions[0],
            instructions.length > 1 ? instructions.slice(1) : []
          );

          if (typeof parsedInstruction === 'string') {
            replacedInstructions.push(parsedInstruction);
            instructions.shift();
          } else {
            instructions = parsedInstruction;
          }
        }

        return replacedInstructions.join(' ');
      }

      async function parseInstruction(instruction, nextInstructions) {
        if (typeof instruction !== 'string') {
          const replacedInstruction = await parseInstructions(instruction);

          if (nextInstructions.length) {
            return [replacedInstruction, ...nextInstructions];
          }

          return replacedInstruction;
        }

        const identifier = getIdentifier(instruction);

        if (identifier) {
          const result = await parseSubcommand(identifier, nextInstructions);

          if (result) {
            return result;
          }
        }

        return instruction;
      }

      async function parseSubcommand(identifier, nextInstructions) {
        let result = null;
        let nextCounter = 0;

        while (result === null && nextCounter <= nextInstructions.length) {
          const nextInstructionsPart = nextInstructions.slice(0, nextCounter++);

          result = await call([identifier, nextInstructionsPart], metadata);
        }

        if (result && nextInstructions.length) {
          return [result, ...nextInstructions.slice(nextCounter - 1)];
        }

        return result;
      }

      async function execute(instructions) {
        if (callArgs.length < variables.length) {
          return null;
        }

        const parsedInstructions = await parseInstructions(instructions);

        if (typeof defaultConsumer === 'function') {
          return await Promise.resolve(
            defaultConsumer(metadata, ...parsedInstructions.split(' '))
          );
        }

        return parsedInstructions;
      }

      return await execute(executionInstructions);
    }

    return command;
  }

  return parse;
}

export default CommandParser;
