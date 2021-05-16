import { open, close } from '../constants/reserved.js';

function ParenthesisParser() {
  function detachParenthesis(tokens) {
    let counter = 0;

    for (let [index, param] of tokens.entries()) {
      if (param.startsWith(open) && param !== open) {
        param = param.slice(open.length);
        tokens.splice(index, open.length, open, param);
        counter++;
      } else {
        while (param.endsWith(close) && param !== close && counter > 0) {
          param = param.slice(0, -close.length);
          tokens.splice(index, close.length, param, close);
          counter--;
        }
      }
    }

    return tokens;
  }

  function parse(tokens) {
    return detachParenthesis(tokens);
  }

  return parse;
}

export default ParenthesisParser;
