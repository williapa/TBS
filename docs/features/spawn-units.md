# Feature - Buildings Spawn Units 

This document describes a new feature to be implemented via agent - to allow a new game actions, enabling player buildings to spawn new units.

# Description 

The feature will allow buildings to perform an action, once per turn - this action will spawn a new unit (a person, vehicle, or animal, depending on the building type) for a monetary cost. The spawn location should be imediately adjacent to the building, and should depend on terrain.

# Unit specifications

This section will hilight the units which can be spawned by each building type, and for what price. Additionally, it will specify types of terrain on which each unit CANNOT be spawned.
The format will be:

## Building Name
- unit name, cost, [invalid terrain(s)]
  

## Capital
- soldier, 200, [water]
- leader, 1000, [water]

## Airport
- airplane, 1000, [mountain, forest, water]
- helicopter, 500, [forest, water]
- pilot, 300, [water]

## Port
- sub, 500, [forest, beach, plain, road, mountain, desert]

## Factory
- truck, 400, [water, mountain, forest]
- big truck, 600, [water, mountain, forest]
- ambulance, 500 [water, mountain, forest]

## College
- engineer, 200 [water]
- student athlete, 300 [water]
  
## Lab
- scientist, 300 [water]
- doctor, 500 [water]
  
## Zoo
- dragon, 2500 []
- lion, 1500 [water]

## Church
- priest, 100 [water]
- blues musician, 100 [water]
- michael jackson, 1000 []

## Office
- zuckerbird, 1000 [water]
- worker, 100 [water]

## House
- construction worker, 100, [water]

## Bank
(none)

# Functional Requirements
- buildings can now perform 1 action per turn.
- The automatic "end turn" functionality should now account for the fact that buildings can potentially perform actions, provided the player has enough funds to spawn any unit with that building.
- spawn options depend on available money and should be disabled if funds are insufficient.
- Units must spawn adjacent to the acting building, on terrain that is valid for the spawning unit, in addition to being unoccupied.
- The flow for spawn should be: (1) click building -> (2) list spawn options in the Action Form, in addition to the cancel option (3) after unit selection, potential cells for the unit to be spawned should be hilighted (4) after clicking the cell on which the unit should be spawned, the action form should allow the user to either confirm the spawn, or cancel the action. 
- the server should validate all these requirements before accepting, applying & broadcasting a spawn action.
- spawn options should list the unit type, cost, and display the associated emoji.
- The events table should display a spawn action in a format like "player@email.com spent 200 to spawn a soldier." It's not necessary for the event to specify which building type spawned the unit.

# Code change areas

This section will hilight the general areas that code changes will likely be applied, though it's possible that it is not exhaustive.

## Common

1. Define a function which returns building options for a particular building type and amount of funds. When passed a building type and the available funds, it should return an array of objects, with each object defining a valid unit, its cost, and the invalid terrains. This function should be defined in a new directory "spawn", in a new appropriately named file (which should match the function name).

2. Update the existing function in common "isTurnOver.ts" to account for buildings potentially being able to perform actions - it will use the function defined in #1, to determine if a building is able to spawn anything. If there are buildings that have not acted during the turn, but sufficient funds aren't available to spawan any units, then the turn should automatically be ended. In order for this function alone to be updated, it is important to note that buildings should be marked "moved" after spawning a unit. this property, "moved", is meant to generally reflect that any action has been performed by that unit. Perhaps it should be renamed, but let's not do that work as part of this feature.

## Server

3. The server should be able to accept a "spawn" action (in processGameAction.ts) and validate that it adheres to the game logic - that the building has not acted this turn, that the unit spawned is valid, that the player has the available funds, and that the spawn destination cell is valid for that unit type. If any of these checks fail, the action should be rejected. Otherwise, it should be applied and broadcast. There should be no additional properties required in the broadcast response (the map, player money values, and new events should be sufficient data for the response, which are already returned for accepted events).

## UI

4. The gameInteraction.ts reducer must now define types related to the "spawn" flow:
(1) click building -> (2) list spawn options in the Action Form, in addition to the cancel option (3) after unit selection, potential cells for the unit to be spawned should be hilighted (4) after clicking the cell on which the unit should be spawned, the action form should allow the user to either confirm the spawn, or cancel the action. 

5. The ActionForm.tsx should be updated to display the valid spawn options, which should be attainable from the /common spawn function. These options should display the unit name, the cost, and the emoji related to the unit.

6. On confirmation, the GameMap.tsx file should be updated to build a new gameAction type (which may need to be extended to accomodated spawns) to be sent to the server - assuming these code changes are done in order, then this type has already been defined on the server side.

7. The gameSocketContext.ts hook should now be able to receive and interpret a spawn action and update the appropriate state. 

8. the final change is to update the EventCell.tsx code to render a spawn event, the result of which should read like, "player@email.com spent 200 to spawn a soldier."

# Other details
For units that can move and attack, they are marked as having "moved" or acted, which displays a check mark next to the unit on the map. A similar marking should be applied to buildings, so that players can see which buildings have acted so far during their turn. This change is performed within the HexMap on the MapItem, and so this change technically will exist on the client and server, as the mapData gets saved on the server, and returned to the client - for that reason I wasn't sure which section to include this code change in, but it should now accomodate buildings.

# Testing
The test plan is that I will manually review the code, run build commands, and manually test during a real game flow. It is not necessary to write tests - the agent should focus on implementing the feature code as described, though the agent should carefully consider potential side effects of these changes based on the files that are touched.