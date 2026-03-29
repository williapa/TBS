# Feature - Construction

This file describes the "construction" feature. Construction will allow construction workers to construct buildings for a monetary fee. 

## Flow

At any point that a normal combat unit would be able to "attack" (having moved or without moving), a construction worker should have the option to construct a new building on an empty space, provided the player has sufficient funds for that building type, and that the terrain is valid for the building to be constructed. This flow is similar to the "spawn" flow, with 2 exceptions. 
1) construction workers have the option to move to a new cell before constructing a building.
2) construction workers are the only unit type which can build buildings (whereas all buildings have spawn options).

## Costs & Terrain

This section lists the costs and terrain options for construction.

| Building | Cost | Invalid terrain(s) |
| --- | --- | --- |
| Airport | 1000 | water | 
| Bank | 2000 | water |
| Capital | 10000 | water |
| Church | 1500 | water |
| College | 3000 | water |
| Factory | 2000 | water |
| House | 700 | water |
| Lab | 1500 | water |
| Office | 1000 | water |
| Port | 2500 | beach, mountain, road, forest, plains, desert | 
| Zoo | 5000 | water |

## Functional Requirements
- Construction workers now have an additional action option, "construct", which can be performed once per turn, in addition to "Moving", but as an alternative to "attack". A construction worker can move and construct as a valid action, but cannot combine "attack" and "construct", with or without moving.
- construction options depend on available money and should be disabled if funds are insufficient.
- Constructing buildings must be performed on a cell adjacent to the construction worker, and on a valid terrain type.
- On confirmation of construction, the appropriate funds should be subtracted from the player's balance.
- A newly constructed building cannot spawn units during the same turn it was constructed. 
- The flow for spawn should be:  
  (1) click construction worker.  
  (2) a construction worker should have the option to move, construct, or attack, and the option to construct should be available after moving, if the player chooses to move first.  
  (3) At the point the player selects the construction option, the action form should list the available building options, in addition to the cancel option.  
  (3) after building selection, potential cells for the building to be constructed should be hilighted.  
  (4) after clicking the cell on which the building should be constructed, the action form should allow the user to either confirm the construction, or cancel the action. 

## Code changes

This feature, for files requiring code changes, should closely resemble the changes that were required for the "docs/features/spawn-units.md" feature. Refer to the "code changes" section in that document to get an understanding of where changes belong. Or, you could reference git commit 1be6a0b7b7c6e532ec0ae0012f4e81947c3494cc which contains the changes that ultimately implemented the spawn units feature.

## Testing
The test plan is that I will manually review the code, run build commands, and manually test during a real game flow. It is not necessary to write tests - the agent should focus on implementing the feature code as described, though the agent should carefully consider potential side effects of these changes based on the files that are touched.
