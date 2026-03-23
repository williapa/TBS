
# Testing

## Current Test Setup

The current test setup is that there are not nearly enough tests. The UI workspace has its own test installation of jest and its own sparing unit tests. This was started as a toy project and tests were added for some core game mechanics like the hexagonal grid, and some base react functions, but aside from that, there are not many unit tests. In the future, there may be an additional e2e test workspace that contains integration tests for the server functions and UI tests with a tool like playwright, but the primary focus right now is to implement more core features of a turn-based game.

## How To Run Tests
the /ui project defines a test command through react scripts, the command is "test". this is the primary area in which tests can currently be executed, though as mentioned before, there are not many.

## Future tests
If adding unit tests for code in /common or /server workspaces, it is recommended to add an installation of jest as a dev dependency of the root project, and to define the tests in the same directory as the file under test with the added extension, like *.test.ts oor *.test.tsx. It would then be necessary to define a test command at the root level of the project, ideally to run all tests from all workspaces, but at least the tests in /common and /server, as a "test" script in the package.json.

For e2e tests, it would be advisable to add any relevant dev-dependencies for such tests, like playwright.js, to the root package.json. Those test definitions/code, however, should go into a new workspace and directory, such as "e2e". For now, this is probably out of scope.