# Conventions

## General Principles

- Don't Repeat Yourself (the "dry" principle) 
- avoid magic numbers/strings in favor of centrally defined constants
- use typescript (& avoid use of "any")
- define types relevant to the game logic in the /common workspace
- favor brevity for code (the easiest code to read is the shortest) 
- style rules are defined through eslint and should be adhered to

## Workspace Conventions

- code without dependencies that is relevant to the game logic belongs in /common
- typically, both the client and server will need access to game logic to either display valid moves, or to enforce the game's rules.
- follow best practices for the language and the framework.

## Documentation Expectations

- always update the documentation when changes make impact the accuracy of existing documentation.
