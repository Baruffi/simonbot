function CommandParser(call) {
  function parse(variables, executionInstructions, prefix) {
    function command(callArgs) {
      function getIdentifier(token) {
        return token.slice(prefix.length);
      }

      function getArgument(argumentIdx) {
        // console.log('callArgs:');
        // console.log(callArgs);
        // console.log('argumentIdx:');
        // console.log(argumentIdx);

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

        // console.log('variables:');
        // console.log(variables);

        const variableIdx = variables.indexOf(instruction);

        if (variableIdx !== -1) {
          return getArgument(variableIdx);
        }

        return instruction;
      }

      function parseInstructions(instructions) {
        const replacedInstructions = [];

        while (instructions.length) {
          // console.log('instructions:');
          // console.log(instructions);

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
        // console.log('instruction:');
        // console.log(instruction);
        // console.log('nextInstructions:');
        // console.log(nextInstructions);

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

          // console.log('identifier:');
          // console.log(getIdentifier(instruction));
          // console.log('call arguments:');
          // console.log(nextInstructionsPart);

          result = call([getIdentifier(instruction), nextInstructionsPart]);
        }

        if (result === null) {
          // console.log('result was null, returning instruction:');
          // console.log(instruction);

          return instruction;
        }

        if (nextInstructions.length) {
          // console.log('the next instructions:');
          // console.log(nextInstructions);
          // console.log('result with next instructions:');
          // console.log([result, ...nextInstructions.slice(nextCounter - 1)]);

          return [result, ...nextInstructions.slice(nextCounter - 1)];
        }

        // console.log('result:');
        // console.log(result);

        return result;
      }

      function execute(instructions) {
        if (callArgs.length < variables.length) {
          return null;
        }

        // console.log('before parsing variables:');
        // console.log(instructions);

        instructions = parseVariables(instructions);

        // console.log('after parsing variables:');
        // console.log(instructions);

        return parseInstructions(instructions);
      }

      return execute(executionInstructions);
    }

    return command;
  }

  return parse;
}

export default CommandParser;
