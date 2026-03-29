# Feature - Objects

STATUS - COMPLETE (MERGED) 

This file describes the objects feature. Objects encompass 3 "special" unit types, each with their own unique function. Those functions will be outlined here. 

# universal features

objects enable 1-time special abilities that are triggered when a people or vehicle unit confirms movement onto a cell that is occupied by an object unit. This means that, for people and vehicle units moving, cells occupied by an object are considered valid destinations. However, an animal unit should not be able to move onto a cell occupied by an object, and a construction worker should not be able to build a building on a cell occupied by an object. Finally, a building unit should NOT be able to "spawn" a unit onto a cell with an object.

# Money

The money object is an object that should award a player who moves a people or vehicle unit to the money, 1000 money. 

## Functional requirements:
- people and vehicles can now select a unit occupied by a money as a destination. 
- When a people or vehicle unit confirms a move to a cell occupied by a money as a destination, the money is destroyed, replaced by the moving unit, and the monetary award is applied to that player's money.
- the monetary award should be equal to 1000.
- this special reward does not affect that unit's ability to perform a follow-up action, such as unload, attack, or construct, so long as it is valid. 
- However, the monetary award does not apply until after the player action is confirmed, meaning that a construction worker cannot move to a money, and then spend those bonus funds on a construction action in the same flow. the monetary award is confirmed and applied after the server confirms & accepts the full action. 
- animals (dragon, lion) cannot select a money as a destination. 

# Missile

The missile triggers a special projectile combat effect, which deals 1-time combat damage (equal to a constant of 30, regardless of unit defense) to any enemy unit, selected by the player whose unit finds the missile.

## Functional Requirements
- The missile object is an object that should award a player who moves a people or vehicle unit to the missile cell, with a missile launch.
- when the player confirms a movement destination that is occupied by the missile, they are prompted to select a target for the missile.
- after selecting the enemy target for the missile, they should get the action form option to "confirm missile launch" before the action is dispatched to the server.
- once a unit confirms the missile launch, they cannot perform additional actions (such as "attack", "unload", or "construct"). This generally follows the pattern in which movable units can move, and optionally perform one additional action.
- There is a special exception to the missile behavior - if the enemy team includes a "priest" unit, then the missile will do 0 damage. This special ability should only be triggered on the server - the UI should not warn or prevent a player from triggering the missile and selecting a target if their enemy has a priest unit; this is the player's responsibility to check for. 

# Nuke

the nuke triggers a 1-time projectile damage effect, similar to the missile. However, the nuke not only damages its target, but all adjacent cells to the target. The target should be dealt a constant of 50 damage, and the adjacent cells should be dealt a constant of 25 damage. Aside from this "area of effect" aspect, the flow will match the missile object.

## Functional Requirements 
- the nuke object awards the player who moves a people or vehicle unit to the nuke cell, with a nuke launch.
- when the player confirms a movement destination that is occupied by the nuke, they are prompted to select a target for the nuke.
- after selecting the enemy target for the nuke, they should see an action form option to "confirm nuke launch" before the action is dispatched to the server.
- once a unit confirms a nuke launch, the unit cannot perform additional actions (such as "attack", "unload", or "construct"). This generally follows the pattern in which movable units can move, and optionally perform one additional action.
- There is a special exception to the nuke behavior - if the enemy team includes a "priest" unit, then the nuke will do 0 damage - neither to the target cell, nor to the adjacent cell. This special ability should only be triggered on the server - the UI should not warn or prevent a player from triggering the missile and selecting a target if their enemy has a priest unit; this is the player's responsibility to check for. 

## Test Criteria

### Money
- [X] money can be triggered by people unit
- [X] money can be triggered by vehicle unit
- [X] money CANNOT be triggered by animal unit
- [X] increments money total by 1000 for appropriate team
- [X] people unit can attack after triggering money
- [X] people unit can construct after triggering money
- [X] vehicle unit can unload after triggering money

### Missile
- [X] people unit can launch missile
- [X] vehicle unit can launch missile
- [X] animal unit CANNOT launch missile
- [X] all enemy units are valid missile targets
- [X] missile does 30 damage to target
- [X] missile is negated by presence of a priest
- [X] people unit CANNOT perform follow-up attack
- [X] people unit CANNOT perform follow-up construction
- [X] vehicle CANNOT perform follow-up attack
- [X] vehicle CANNOT perform follow-up unload

### Nuke
- [X] people unit can launch nuke
- [X] vehicle unit can launch nuke
- [X] animal unit CANNOT launch nuke
- [X] all enemy units are valid nuke targets
- [X] nuke does 50 damage to target & 25 damage to adjacent units
- [X] nuke CAN damage allied units (via AoE, since direct target still must be enemy)
- [X] nuke is negated by presence of a priest
- [X] people unit CANNOT perform follow-up attack
- [X] people unit CANNOT perform follow-up construction
- [X] vehicle CANNOT perform follow-up attack
- [X] vehicle CANNOT perform follow-up unload