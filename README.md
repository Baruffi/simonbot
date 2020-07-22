# SimonBot

A bot that can be programmed through discord itself!

- [SimonBot](#simonbot)
  - [How to use](#how-to-use)
  - [Examples](#examples)
  - [Formalisation](#formalisation)
  - [Customization](#customization)
  - [Notes](#notes)
  - [TODO](#todo)

## How to use

**SimonBot**'s command syntax is quite simple and intuitive.

`[prefix][name] = [arguments]* -> [expression]` to set a command's name, argument and equivalent expression (arguments are optional).

`[prefix][name] [expression]` to call the named command.

And an expression is either or multiple of: general text; the command's arguments; a call to another command.

Just remember that `[prefix]`, `[name]` and `[argument]` cannot include any spaces, `[name]` and `[argument]` cannot start with `[prefix]`, and commands are greedy by default.

## Examples

```md
!say = text -> text

!say a
a

!say_hi = !say hi

!say_hi
hi
```

## Formalisation

Backus Naur Form (BNF) is a formal way to define a programming language. Here it was used to formally define the bot's commands in terms of regex. You can see it is heavily inspired by lambda calculus.

```bnf
<command> := <prefix><identifier> |
             <prefix><identifier> <expression>
<expression> := <identifier> |
                <abstraction> |
                <application> |
                <grouping> |
                <command>

<prefix> := [^\s]+
<identifier> := (?!<prefix>)[^\s]+
<abstraction> := = <identifier> -> <expression>
<application> := <expression> <expression>
<grouping> := ( <expression> )
```

## Customization

By changing the contents of index.js, you can make your own use of the parser and error handler. Change the prefix, create your own default commands, modify the error messages and even build your very own pipeline! This project can also easily be adapted to work with different frameworks, as it was designed to not be dependent on any external resources.

## Notes

This project was built with the functional programming paradigm. Thats why all the included 'classes' are actually functions.

## TODO

- Completely isolate error handling from the parser
- Add default commands
