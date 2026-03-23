# Architecture

## System Components

### UI

The UI is built using React. the UI partially leverages cloudscape components (formerly AWS UI) for forms, listing games, player profile page, and the initial game listing. The main game screen is vanilla react / css to build the hexagonal layout and currently uses emoji as placeholders for the unit types. React-router-dom v6+ is also leveraged for client side routing. For real-time game interactions from player-to-player (and potentially for spectators, as well) the UI uses websocket.io-client, but still has REST API routes to fall back to and uses native fetch commands for all REST interactions.

### Server

The server is implemented with node.js and express for the REST routes like creating games and listing open games. There are also map resources that allow users to define their own custom maps for games, so there are listMaps and createMap endpoints. To display profiles that list a player's current game sessions, there is a getUser route (which also encapsulates a "getGamesByUser" route). 

For separating users, the server offers a placeholder mechanism for authentication by allowing new users to be created, by defining an email and pin. The email is not used (does not send anything to that address, or even need to be verified), it just works as a stand-in to avoid dupicated names. The pin is used so that it is clear this is not meant to be a secure, password system. The pin is stored locally when signed in and then used as a placeholder check on the server to verify the correct user is sending game events. The game server never returns a user pin in a REST response.

As mentioned before, the game server leverages websocket.io to create "rooms" for each game session. A game session is a game instance of a particular map, for 2 specified users. A game session is active once a game has a creator (whoever creates the game instance) and a challenger (a person who finds an open game from the lobby and joins, which starts the game by defining a start timestamp). Once the game is started, players post their moves via the websocket and once validated, the moves are pushed out to the game room with the appropriate data to update the game view. 

All data is stored in dynamodb. 

### Database

The database for the game is dynamodb. This was chosen because as the game expands and defines new rules, it is much easier to adhere to the existing defined routes, and simply add new columns as needed. There were 3 indexes required to enable UI flows. there should not need to be additional indexes to continue to expand the game logic, and so this avoids the need to redefine columns and make migrations to a sql database. Dynamo DB is also pretty fast. 

The primary index is designed for retrieving games by id. The game records define the current game state.

The "OpenGamesIndex" is used to list games which do not yet have a challenger, and thus can be displayed on the lobby for players looking to join a new game and play.

The "InvertedIndex" is used to list recent game "events" (player moves) for a game. 

The "MapsIndex" is used to list all custom maps that have been created by players. Currently, this is the only source for maps. Eventually, the client, or the common code, might define default maps, but in the current state, games can only be created for custom maps that are defined by database records.

The root readme file details how to use a local instance of dynamodb for local development. There are scripts defined in the root package.json for common maintenance commands, like creating the table, deleting the table, and removing old games and game events from the database.

### Common

Common code is used to define game logic that is likely to be used by both the client and the server, either for rendering the game, display valid move options, or for validating player's moves before updating the game record and broadcasting the result to players. Because all layers of the code use typescript, it is necessary for the common code to be "built" first before the client and server, which consume the common workspace, are built. It is important to try to add any types or utility functions relevant to the game logic to the common code rather than in the client or server directly. 

### Additional Infrastructure

At this time, the game is being developed locally, and so the client, server, and database all run on the developer machine. Obviously, dynamodb will need to be deployed to AWS as this is the only compatible cloud host. It is likely that the UI could be hosted using s3, cloudfront and route 53 which is a standard option for browser clients. Similarly, the node.js server could be deployed using ec2 and possibly API gateway. In a production setting, it might be appropriate to use cloudwatch for loggic and metrics, although that is not in scope for the current time. Additionally, if there are more affordable "free-tier" options for a node.js server available form competitors, this might be a preferable option. 

<!--
Describe each major component and its responsibility:
- UI
- Server
- Common
- DynamoDB local / DynamoDB
- any infrastructure services in use or planned
-->

## Data And Control Flow

This section will describe how a user would interact with the app.

1) create user
In order to play, the game requires a "signed in" user, so that the user's pin can be used to loosely protect against cheating. A user enters an email (functioning purely as a username reference) and a pin (which is saved in local storage to be posted with game moves in the future). The user checks "new user", and the createUser route will ensure the email has not been registered as a user yet, and if so create a new record. If the email already exists, this would respond with a failure. If a user has already created their user, then they can simply enter their existing pin and "sign in" which will validate they have used the correct pin, and if so save the combination to local storage.

2) create map
In the current state, there are no default maps. A user has the ability to create a map with their preferred dimensions, terrain, buildings, and combat units. The only rule that exists or maps is that, the map must contain combat units for both teams ("orange" for game creators, and "purple" for game challengers). Purple (the challenger) always gets to go first. So long as this requirement is met, any type of map can be designed and created, by name. When the map is created, the server defines a "win condition" for the map. the default win condition is to defeat all enemy units which can move & attack. If a map contains a "capital" building for each player team, then an additional win condition exists - to destroy the enemy capital building. 

3) Join a game
To join a game, a player can either create a new game (for which they will be a creator), or join an existing game that someone else has created, but has not yet found a challenger for. To create a new game, a user must select a map, and give the game a "name", then click create. Once this has been done, the game will be listed as part of their user profile. They can view the game to monitor whether a challenger has accepted their game. The second option is to join a game that someone else has created. All open games (games without challengers) are listed as part of a lobby screen, so a user can click on the game record and then click the "join" button to join. Then they are redirected to an active game view.

4) play a game
The initial game data is fetched via rest, but afterwards all game data updates take place via websocket. Anyone viewing an active game (including individuals not logged in) will join the a "room" for the game and receive updates of valid moves and the current game data. On the server, moves are validated and then a corresponding game event is added to the database. Additionally, the primary game record which contains the current map data, is updated. Players take turns applying moves to the game "map", or "board" (which currently include "move", "attack", and "end turn"). Once a player wins, the game no longer accepts new moves, and the client does not allow for players to post additional moves.

5) View game record
The user profile has already been discussed as an option to track games a user has created or joined as a challenger. Once a player wins (or loses) a game, their user record is updated and displayed in the user profile screen, showing how many games they have won, lost, as well as a client computed "win percentage". 

6) When a player is finished with their session, they can "log out" to remove the record of their email and pin from local storage. At this point, the "user profile" navigation link is replaced with a "log in" link, which would take them back to the login (also overloaded to allow for creating a new user) page.

