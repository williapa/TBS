# Game Domain

Game state is represented by the versioned `GameState` contract in `@TBS/common`. Postgres stores the gameplay payload (`map` and team money) separately from canonical session metadata such as lifecycle, revision, active team, winner, seats, and invite hash. Every accepted action produces the next immutable state plus ordered domain events through the deterministic `applyGameAction` reducer.

Two durable player seats exist: the creator is orange and the challenger is purple, with purple taking the first turn. Additional members are spectators. Spectators share canonical snapshots, action history, revision notifications, and Presence, but cannot submit actions. Realtime is only a wake-up signal; missed notices are reconciled from bounded action history or the canonical database snapshot.

## Core Concepts

# Map
A map in the game is a hexagon, created from hexagonal cells. /common defines functions to reference cells by their number, from left to right, top to bottom, as well as x / y coordinates, starting with a 0 index for both. it also defines functions to retrieve cells which a unit can move to, as well as attack from a given cell position. 

`@TBS/game-setup` owns map generation, versioned map parsing, topology and size validation, immutable editor updates, and construction of the initial game input. For a player to save or create a game from a map, each team must have at least one initial unit with both move and attack capabilities. If both teams also begin with a capital, setup derives the `capital-or-combat-elimination` objective; otherwise it uses combat elimination.

Setup assigns every initial on-board and transported entity a deterministic stable ID. The normalized engine preserves that ID through movement, load/unload, and combat and derives deterministic IDs for constructed or spawned entities. Existing schema-v1 fixtures without IDs remain valid and retain their locked replay checksum; presentation supplies a deterministic compatibility identity for those historical states.

# Terrain 
An additonal aspect of map cells is "terrain type". Terrain types, like "forest", "beach", "water", or "road", impact a moving unit's range during a single move. For example, a boat might only be able to move on water. A person unit cannot move onto a water cell at all. A plane unit's range might not be impacted at all by the terrain cells. The attribute which determines range is "energy". 

# Players
TBS currently supports 2-player games. The game creator takes the "orange" team, which moves second. the game challenger takes the "purple" team, which moves first. In addition to map units being owned by either player team, a "money" value is tracked for each player. 

# Money
Each player starts the game with 1000 money. When a player's turn ends, income for the next player is immediately calculated, based on the player's current buildings, and that income is added to the player's money count.

# Unit
units are player owned game entities, such as animals, vehicles, buildings, objects or people. All units, except objects, start with 100 "health". Each unit type's behavior will be listed below.

## Animals

Animals can move and attack. As for all movement, the terrain of each cell being moved through impacts the total range of movement - this is calculated in the common function which returns cells which can be moved to. The shared combat rules define deterministic damage from unit attributes and current health.

## People

People are like animals, in that they can both move and attack. Attributes which determine movement range and attack strength are defined within the /common code.

## Vehicles

vehicles can move, based on terrain, but not attack. In the current state, these units are essentially blocking units, which could defend another unit but not inflict damage themselves.

## buildings

Building units are not capable of movement or attack. They could still be used as defensive / blocking units, depending on their position on the map. In the current state, there is no way to add new building units to the map during a game. The only unit which carries an effect is the "capital" building. If a map contains at least 1 capital for each team, then this introduces an additional win condition - if a player's capital building is destroyed, they lose the game, even if they have other units that can move and attack still on the board.

The capital building, in addition to its potential association with the additional win condition, is the only building which generates player income. A capital building generates 100 in income for that player's team. 

## Objects

Objects are items which exist on the map but provide no utility. Currently, this serves as a way to create a "dead" space on the map. These objects might provide utility in the future, however. 

# Turn
During a player's turn, any unit which can move can move one time. A unit which can both attack and move can either attack, or move and then attack. A unit that can move and attack cannot perform an attack, and then move. Once a player has exercised moves for all available units, their turn automatically ends. If a player chooses not to move a unit (or units), they can choose to manually end their turn at any point. 

At the end of a turn, the 

# Combat
When a unit attacks another unit, damage is deterministic. Effective attack and defense stats include the existing matchup and boost modifiers. Attacker vitality is `(100 - attacker damage) / 100`, and defender vitality is `(100 - defender damage) / 100`. The exact formula is `max(0, floor(effective attack × attacker vitality) - ceil(effective defense × defender vitality))`. If the first strike does not destroy the defender, the defender counterattacks with the same formula using the post-strike board state. Because the attacker deals damage first, a damaged defender may inflict less counterattack damage.

# Win Conditions

A win condition is defined for each game map, based on the units which exist in its initial state. For any map, destroying all moving & attacking units is a default win condition. The second win condition exists for maps where both teams have a capital building. For these maps, a player can win by destroying their opponent's capital building. 

# Future Plans

This section outlines game functions which have not yet been implemented.

## Units

### People

Status: construction for construction workers is implemented. Other special abilities could come later

There are multiple different types of people units. Eventually, each should have custom special abilties, beyond unique energy, attack, and defense. As one example, the "worker" might be able to transform cell terrain, such as changing a forest into a plain, or a plain into a road. a "construction worker" might be able to build certain types of buildings, like houses. A zookeeper might be able to create a zoo. Performing these actions would consume money and have to be done in place of an attack on that turn. More about money later.


### Vehicles

Status: people can now load into vehicles and be unloaded, defined as "transport". combat stats are NOT currently augmented based on the caried unit. Vehicle movement does not yet consume money.

currently, vehicles can move but not attack. In the future, it might make sense for vehicles to be able to "carry" people units, so that both units would occupy the same cell. Depending on the person and vehicle, the combination of the 2 units might be able to attack with increased attack/defense. Or, they might function simply as a way to extend range - consider a "boat" unit, being able to transport people across a set of water-terrain cells, as a shortcut. Once a "money" feature has been implemented, vehicle movement should consume some amount of money per cell, the idea being that the vehicle requires fuel, which costs money. 

### Buildings

Status: "spawn" has been implemented, allowing all buildings to spawn units for cost.

currently, buildings do nothing except act as a blocking/defense unit. However, in the future, buildings might be able to spawn new unit types, based on the type of building. An airport might be able to spawn pilots, or airplane vehicles. A zoo might be able to spawn animals. These definitions would need to be added to 'common'. 

### Objects

Status: implemneted 
Currently, objects simply occupy cells and cannot be attacked or consumed. But, for the "money bag" object, this should become an occupiable cell. When a unit steps on a cell with a money bag object, the object is consumed (aka, destroyed) and a certain amount of money is added for that player. Other objects might have similar effects. As an additional example, if a unit steps on a "missile" object, then this might create a special action where the player can launch the missile at an enemy and do damage (without typical retaliation combat damage). 

## Terrain
Currently, terrain affects energy consumed by moving units. In the future, however, terrain could be used to impact attack / defense. If you are attacking from a "beach" cell, this might negatively impact your attack and defense. 

## Money 

Status: "spawn" and "construction" now consume money. 

Currently, money is a real game attribute and certain buildings can produce income each turn. In the future, this money will be able to be spent, allowing players to spawn new units, build buildings, and expand their power.
