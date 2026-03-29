# Feature - transport

STATUS - COMPLETE (MERGED)

This document describes a feature for "transport". The goal is to make it possible for people units to be "carried" by vehicles, so that vehicles can be used to extend the range of those units, and transport them across the map.


## Functional Requirements
1. A people unit can now perform an action "load" into an adjacent vehicle unit. 
2. a people unit can move, then load. or load from its initial position. once the unit loads, and for as long as it remains loaded into the vehicle, it cannot perform any actions, until the vehicle unit performs the "unload" action.
3. a vehicle unit cannot unload a people unit onto a cell that is occupied by another unit, or a cell with terrain of type "water". 
4. a vehicle unit cannot attack after unloading a unit. similar to the flow of all other moving units, a vehicle can choose to optionally move before unloading the unit, but once it unloads, it cannot perform additional actions.
5. When a people unit is loaded into a vehicle cell, both the vehicle and the loaded people unit emoji should be displayed in the cell.
6. Only the health bar for the vehicle should be displayed on a vehicle carrying a people unit. 
7. When a vehicle unit carrying a people unit engages in combat, the combat logic takes place unaffected by the people unit. The people unit has no effect on the vehicle's combat stats.
8. when a vehicle dies in combat, the person unit also dies. 
9. the energy cost for movement when a vehicle is transporting remains the same. 
    
## Load Flow (people)
1. the intiail flow for a people unit remains unaffected. on the intial click, movement cells are hilighted and displayed.
2. When the destination for the people unit is clicked, the action form should now display an option to "load" if the destination cell is adjacent to an unoccupied vehicle. 
3. when the user selects "load", the available, unoccupied vehicles should be hilighted.
4. when the user selects a vehicle to load into, they should have the option to "confirm load" or "cancel". 

## Unload flow (vehicle)
1. when a vehicle that is carrying a people unit is clicked, the initial flow remains unaffected. On the initial click, movement cells are hilighted and displayed.
2. When the vehicle's destination cell is clicked, the action form should now display an "unload" option, provided there are valid unload destinations. For a people unit to be unloaded to a cell, the cell must be empty, and the cell cannot be of terrain type "water".
3. when the user clicks "unload", the valid unloading destination cells should be hilighted - these cells must be adjacent to the vehicle, currently unoccupied, and cannot be of terrain type "water'.
4. when the user selects an unload destination, they should have the option to "confirm unload" or "cancel".

## Additional details

When a people unit is unloaded, the people unit should have the same health as when it was loaded. Additionally, if the people unit is unloaded the same turn it was loaded, it should still be marked "moved" (it doesn't get to move/attack again after transport). If the unload action takes place on a subsequent turn, then the people unit should not have been marked moved yet, and gets the option to move and attack during that turn.

## Testing
building the code and testing the code will be performed by me, manually, pending all code changes. You should attempt to make all necessary changes for the feature across common, server, and ui. 

- [X] validate load
- [X] validate move, then load
- [X] validate unload
- [X] validate move, then unload
- [X] validate you cannot unload people on water (hilighting for unload, generally)
- [X] validate moved status for people that loads & unloads same turn
- [X] validate unmoved status for people that loads, then unloads next turn
- [X] validate combat with loaded vehicle
- [X] validate loaded unit dies when carrying vehicle dies