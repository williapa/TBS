# Feature - details view

This document describes the details that should be populated into the details panel whenever a player clicks a cell on the map - this should be true whether it is the player's turn or not. If it is the player's turn, then only the first click in the action flow populates the details view, reflecting the current selected actor. It should not switch to show details for a movement, attack, or boost target. Once a user confirms an action, the details section should be cleared. When no actor is selected, the details section can say something like "Click a cell to see game information."

## Terrain cell (empty)
- list energy costs for unit types
- list coordinates for cell

## People, Animal, Vehicle & Building Occupied Cells 
- a) note unit subType (flying vehicle, ground vehicle, person, animal, or building)
- b) note damage as health (with color of team)
- c) note moved if moved this turn
- d) list default combat stats (incorporate boosted)
- e) note boost if boosted (n/a for vehicle)
- f) note added income (if building)
- g) list allowed special actions (from: boost, attack, move, load, unload, heal, spawn, construct)
- h) list available energy for this unit (n/a for buildings)
- i) list applicable energy costs for each terrain type (n/a for buildings)
- j) list special ability (describe boost/heal/construct/priest/spawn in detail, specifying type rules, costs)
- k) list coordinates for cell

l) IF LOADED: "carrying {unitType}:"
- note moved if moved this turn
- note damage as health (with color of team)
- list default combat stats (incorporate boost if boosted)
- note boost if boosted

# Object cell
- describe special effect
- list coordinates for cell


## Implementation steps
1. wire up cell click to populate details panel with the json content of that cell, based on described logic (when active turn: initial click setting actor populates details, is not cleared until cancel or confirm action. when not active turn: every click populates details for that cell).
2. implement "empty cell (terrain)" logic: use the common energy function to determine costs per unit by iterating through unit types
3. implement "object cell" logic - define map of text describing each special effect in plain language, then wire to details for objects (exclude none - that's the empty cell case)
4. define map of text that outlines "allowed special actions" for each unit type to be used for final details 
5. implement "buildilng cell" logic (a,b,c,d,e,f,g,j,k)
6. implement "animal cell" logic    (a,b,c,d,e,g,h,i,j,k)
7. implement "people cell" logic    (a,b,c,d,e,g,h,i,j,k)
8. implement "vehicle cell" logic   (a,b,c,d,g,h,i,j,k,l)

## Additional notes:
details will need to scroll as some unit types will require significant space - the details panel should not expand to make the entire page scrollable, it should scroll with the available space in the window

## Manual Tasks Prior to Agent:
- map of text describing each object special effect in plain language (#3)
- map of text outlining rules for unit special actions for each unit type in plain language (people, animal, vehicle & building) (might need to be 2 levels - map actions to unit, then descriptions for action)