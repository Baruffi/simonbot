function CommandParser(call) {
  function parse(variables, executionInstructions, prefix) {
    function command(callArgs) {
      function getIdentifier(token) {
        return token.slice(prefix.length);
      }

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

      function parseInstructions(instructions) {
        const replacedInstructions = [];

        while (instructions.length) {
          instructions = parseVariables(instructions);

          const parsedInstruction = parseInstruction(
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

      function parseInstruction(instruction, nextInstructions) {
        if (typeof instruction !== 'string') {
          const replacedInstruction = parseInstructions(instruction);

          if (nextInstructions.length) {
            return [replacedInstruction, ...nextInstructions];
          }

          return replacedInstruction;
        }

        if (instruction.startsWith(prefix) && instruction !== prefix) {
          return parseSubcommand(instruction, nextInstructions);
        }

        return instruction;
      }

      function parseSubcommand(instruction, nextInstructions) {
        let result = null;
        let nextCounter = 0;

        while (result === null && nextCounter <= nextInstructions.length) {
          const nextInstructionsPart = nextInstructions.slice(0, nextCounter++);

          result = call([getIdentifier(instruction), nextInstructionsPart]);
        }

        if (result === null) {
          return instruction;
        }

        if (nextInstructions.length) {
          return [result, ...nextInstructions.slice(nextCounter - 1)];
        }

        return result;
      }

      function execute(instructions) {
        if (callArgs.length < variables.length) {
          return null;
        }

        return parseInstructions(instructions);
      }

      return execute(executionInstructions);
    }

    return command;
  }

  return parse;
}

export default CommandParser;
