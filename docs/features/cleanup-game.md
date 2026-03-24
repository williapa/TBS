# Feature - Cleanup Game Logic Related to Displaying User Action Options

The react code for the game interface, specifically for the game interface for players (as opposed to the read-only or map-creation views) is getting messy. Specifically, the game logic is starting to feel difficult to trace through, and is spread across many layers of components.

I will attempt to explain the existing design by tracing through the active game components.

# 1st Level - ui/src/pages/Game/GameDetails.tsx

this is the top level for the game view, and encompasses the active game view as well as the game "details" view, which is meant to be a summary of a game that is not yet active (meaning, a 2nd player, "challenger", has not joined the game, so it hasn't actually started yet and is not ready to process game actions from either player). This component uses the rest API to fetch the current data for the game (by ID), and passes these props as initial data down the chain. However, many of these props end up getting passed down through multiple components, and many of these props are only initial values - they need to be overriden by the gameSocket context values once game actions have broadcast new values for things like the game events, the game map, or the money values for each player. 

The game details component, based on the data from the "getGameById" rest API, determines whether the game has been started by examining whether the game has a creator and a challenger defined on the game data. IF so, the data from the getGameById API is passed as props to the "Game" component (named "Game") and rendered - this view is the "active game". That's where we'll go to next.

# 2nd Level - ui/src/pages/Game/Game.tsx

This is the top level for the active game, meaning it needs to let a player click the map to view options for moves, attacks, etc. before confirming and dispatching the action to the webSocket. This component uses 2 instances of the "playerDetails" component to render each player's email, money, and control whether the details component is hilighted (to indicate the current active turn). This component also has logic to work through & determine which player is which color, and who's turn it is. This can be confusing because depending on the particular function, it may be necessary to either know the current player's email (their "id"), or their "team color" (purple or orange, which is determined by whether they are the "creator" or the "challenger" - the creator is orange, and the challenger is purple. These associations also determine who moves first - purple, or the challenger, always goes first. There could have been logic to reverse this order, to let the creator of the game choose who goes first, or to make it random, but I opted not to build this.) The logic to determine who's turn it is feels a little complex, but the problem is ultimately due to the need to distinguish the team color, the creator versus the challenger, and to render the UI view with context of the player's perspective, based on who the signed in user is. 

This component also renders an events panel, which is a table that lists the events, or actions, that have been executed, as a type of game history. This component uses the webSocket hook to listen for new game events, and pushes them onto the list. This is clean enough, so we won't be diving into this component. 

The final component is the GameMap, which primarily takes the map data, as well as two props related to the active turn: "active", a boolean that determines whether the map can be interacted with at all, and the "perspective", a string representing the team Color (purple or orange) for the logged in player. 
Due to the design where intial data is populated from the rest API, this component will eventually need to add money props for each player's current money count. The value is available from the webSocket context, but when the player initially loads the game, or returns to an active game after closing the window, the socket will not have a value.

It has occured to me that if there a way to combine the rest API data with the webSocket context, that might be the cleanest way to handle these problems. However, I wasn't immediately sure on the best way to accomplish that. For now, let's continue down the chain, because unfortunately it gets messier.

# 3rd level - ui/src/pages/game/GameMap.tsx <-- important

The GameMap is responsible for rendering the map, its units, handling clicks and dispatching the confirmed game action to the webSocket. 

It defines a function to post the game action to the websocket, "postGameAction". this function is not TERRIBLE, but it's starting to get bloated and feel overcomplicated.

The second function defined is "unitClick" - this is the intial click action. When a player clicks a unit, it's appropriate to display the cells it can move to. If a player does not want to move the unit, and wants to perform another action from the existing position ("attack"), 

There is a state property in GameMap called "actor". when a unit is clicked, this unit becomes the current "actor". Then, based on whether there is an actor, the "callback" function (a property on the next level down) for any given cell switches from "unitClick" to "postGameAction". However, further down the chain there is additional logic that comes into play to display an "ActionForm" that gives options like "confirm", "attack", and "cancel". 

A final detail on the GameMap is a state property, "editing". Actor, setActor, editing, and SetEditing are all passed as properties to the direct child, hexGrid. For certain form actions, it's appropriate to set (or clear) actor and editing based on whether the user is cancelling, or needs to close the ActionForm to hilight target cells for things like moving or attacking (the editing state) - but these state values are also touched by "unitClick" and "postGameAction". 
(it occurs to me that, at the very least, these properties could be passed together, rather than separate properties, although this might become confusing). Let's inspect hexGrid now.

# 4th level - ui/src/components/HexGrid/HexGrid.ts

The HexGrid renders the hexagonal map, which is a hexagon with the same cell length for each side - this value is tracked as property "dimension" and technically, this property could be eliminated by instead looking at the length of the first entry in the 2 dimensional array that is the map data - the orientation the grid is displayed makes it so that a flat side of the hexagon is the first row of the mapItem, and so as the first index for the 2d array increases, the row lengths widen to the center, then decrease. As mentioned before, it takes the actor, setActor, editing, and setEditing values from the GameMap as properties. It takes the "callback" function, which is either the postGameAction or the unitClick function, and it takes the activeTeam as a property - "orange" or "purple", as units on map cells will carry identifier as to the team color, so knowing the activeTeam lets you know which units are allies or targets.

Most of the logic in this component is for controlling the visual display of individual cells. It reads the mapData and updates CSS rules for each cell. But most of the properties it accepts are then passed down to the child cell. 

# 5th level - ui/src/components/Map/Cell/Cell.tsx

Surprise! this is also a pass through. One of the cell props is "mode", which toggles between either "game" or "editor". In the context we are exploring, an active game, this property will always be "game". There is a separate view where players can edit a custom Map, which then uses the editor cell to change the cell terrain or starting units. But we don't need to explore that. IN game mode, every cell will always be a "game" cell. All the props are then passed to the next level - "gameCell".

# 6th level - ui/src/components/Map/Cell/GameCell.tsx <-- important

From a UI perspective, the GameCell renders the cell, the terrain as a background, and the unit (represented by an emoji and a health bar) if it exists, in the foreground. It also tracks whether the Action Form (the final child component we will explore) is open and passes certain properties to it. 

5 functions related to player clicks are defined on this level:
1. openActions = opens the actionForms, by setting a state property "formVisibility" to true, but only if the property "editing" is false. 
2. cancel - this clears the actor and hilight targets, triggered by a boolean argument for the function. if it's false, these properties are preserved. If the 2nd argument is true, it removes a localstorage value designed to track the intermediate position of a unit that is potentially going to move and attack (you select the movement cell first, after which the UI needs to give the option to attack, if that position has attackable targets - but both the potential movement position and the original position need to be tracked during this flow, and a player can cancel before confirming, hence the option to delete this position from local storage). Regardless of those two arguments, it always sets the formVisibility to false, 
3. hilightMovementCells - this function is essentially a passthrough to the property "callback" - though it needs to optionally pass an additional argument to that function, if the acting unit is going to attack from its original position - this action has a codeword "park&bark" which is referenced at the upper level GameMap.
4. clickTargetUnit - this is the function to handle a "target" click - a target would be a hilighted cell, to either move to, or an attack target. This logic requires that an actor (an initial unit) to be defined, if there is not an actor then there should not be any target, and so there is a chunk of logic here to log an error, because this function should not be called if there isn't an actor defined..
5. confirm - this function is used to confirm the game action to be sent to the server, so it closes the action form and then calls the "callback" function with the appropriate values.

If the actionsForm is open, then the actions form gets renders. The actionsForm takes functions cancel, confirm, and hilightTargets (which is a passthrough property, that is used by the action form for when a user chooses to attack", then the attack targets need to be hilighted). There is also logic to determine which function should be the click handler for the cell - if the cell is a target (determined by the "isTarget" property) then "clickTargetUnit" is the cell click handler. If the cell is Active (is a unit on the team of the current active player), then "hilightMovementCells" becomes the click handler. And as a fallback, a custom "cancel" function is assigned that clears the actor and closes the form by calling "cancel". 

# 7th level - src/components/Map/Cell/Action/ActionForm.tsx <-- important

Let's finally describe the ActionForm.

The actionForm uses the "useGame" hook (which contains the data fetched from the "getGameById") to reference the initial game state, as well as the "useGameSocket" context, and falls back to the initial state if the data from the gameSocket is undefined. 

The actionForm component defines 4 functions:

1. move - calls "save" and then "cancel", defined on the ActionForm props. cancel is not called with either flag, so that the actor and targets are preserved - this only is used to close the form. (the upper level logic takes care of clearing the hilighted movement cells)
2. attack - calls "save' and then "cancel", with the first flag as true, so that the actor and hilighted cells are cleared, in addition to the form being closed.
3. displayAttackOptions - this is for when a user is choosing to attack, so that the target options can be hilighted, and the player can choose which target to attack. Here, that localStorage position is set, for reference of where the unit is attacking from (because the actor unit on the map hasn't been moved yet). It calls props.attack, passing the attackable cells, and this is attack prop is the function "hilightTargets" defined in an earlier component. Finally, it calls "props.cancel(false, true) so that neither localStorage or the actor/hilightedTargets are cleared - it's just because the form needs to be hidden so that the player can see and choose their attack target next.
4. clearAndCancel - this is a form option for the user to cancel the in-progress action. It calls props.cancel(true) so that the actor and hiighted cells are cleared, and the form is hidden.

These 4 functions become click handlers for the form options:
"Attack" - if a unit is not already attacking (determined by props.targetType !== "attack"), and there are potential attackable cells, the form displays this option, which uses the "displayAttackOptions" function defined in this component, as the handler.
"Move" - if the player is confirming that they want to move and not attack (determined by props.targetType === "move"), this option is displayed, and it uses the "move" function defined in this component, as the handler.
"Confirm ${targetType}" if props.targetType === "attack", meaning the player has chosen to attack and clicked a cell to attack, then this option is displayed, and it uses the "attack" function defined in this component, as the handler.
"Cancel" - this option is always displayed, and uses "clearAndCancel" as the click option.


  
# Planning Goals

We have now walked through all 7 levels of code which cover the "Game" view. Of these levels, the levels that contain the most logic related to the user's actions and updating state, are level 3 ("GameMap.tsx"), level 6 ("GameCell.tsx"), and level 7 ("ActionForm.tsx"). 

The current design was arrived at, by adding code as I went, and without a clear perspective on the full game functionality. As it exists, the game is only partially implemented. I am currently planning to add additional functionality (outlined in docs/game-domain.md under the "Future Plans" header) which requires adding and updating this logic, so that players can spend money to spawn new units (which would be an action option for "building" units). But any enhancement to the current game functionality would surely touch this code, and the complexity now seems unnecessary, potentially redundant in places, and overall not a clean and extensible design. 

I have considered that the ActionForm should be a "dumb" display only component, that takes a state that determines where the user is in their flow, and renders the appropriate buttons and then uses a single function to call back to the higher level to execute the necessary state updates to the map as well as the form. This might be done using a reducer.

It also occurs to me that any props that are being curried through these various layers that could be obtained via a hook/context would be ideal. It seems like it might be best if the useWebSocket context could encapsulate the data for the useGame hook (which fetches data from the rest API), that might also reduce some complexity. But I was not immediately clear if that would be best practice, because I don't think you can put an existing hook into another hook - I'm sure I could just refactor the actual fetch call into the webSocket, but then that requires a lot of refactoring across the places that called the old "useGame" hook. 

In summary, the goals are:

- arrive at a cleaner design
- reduce redundancy, repeated & overly complex code
- accomodate needs for features outlined in "future plans"; 
- generally, to be more easily extensible

In accomplishing these goals, it is likely that the existing type definitions would be improved and made to be more specific, which will improve readability.
  

# Codex Plan: Cleanup Active Game Interaction Flow

## Summary
Refactor the active-game UI as a phased cleanup centered on a single interaction state model, with the goal of removing cross-component action logic, eliminating transient `localStorage` state, and making future actions like unit spawning/building fit naturally into the same flow.

Use an incremental architecture change rather than a full rewrite: keep the existing page structure (`GameDetails` -> `Game` -> `GameMap`) and websocket transport, but consolidate game state derivation and player action flow behind clearer hooks/types and a reducer-driven controller.

## Key Changes
### 1. Introduce a single game-view state source
Create a composed hook for active-game pages, conceptually `useActiveGameView`, that merges:
- initial REST data from `useGame`
- live socket overrides from `useGameSocket`
- derived view fields such as `currentMap`, `currentTurn`, `creatorMoney`, `challengerMoney`, `perspectiveTeam`, `opponentTeam`, `isLocalPlayersTurn`

This should replace the current repeated fallback logic in `Game.tsx`, `GameMap.tsx`, and `ActionForm.tsx`. Do not move REST fetching into the socket provider yet; instead compose the two sources in a higher-level hook so the existing provider contract stays stable while the UI gets a single source of truth.

Public interface change:
- Add a typed view-model hook return shape for active-game pages.
- Remove `ActionForm`’s dependency on `useGame`.
- Reduce `GameMap` props to values that are truly page-owned, or let it consume the new hook directly if that produces less prop drilling.

### 2. Replace tuple-based `actor` and scattered booleans with a reducer-driven interaction model
Replace the current interaction state:
- `actor: [string, number[], Coords] | false`
- `editing: boolean`
- `attackTargets: number[]`
- intermediate attack position stored in `localStorage`

with a reducer-managed state object, for example:
- `selectedUnit`
- `origin`
- `previewDestination`
- `mode` such as `idle | unitSelected | choosingMoveTarget | actionMenu | choosingAttackTarget | confirming`
- `availableMoveTargets`
- `availableAttackTargets`
- `pendingAction` such as `move`, `attack`, later `build`

Model transitions explicitly through reducer events such as:
- `SELECT_UNIT`
- `CHOOSE_MOVE_TARGET`
- `OPEN_ACTION_MENU`
- `CHOOSE_ATTACK_MODE`
- `SELECT_ATTACK_TARGET`
- `CONFIRM_ACTION`
- `CANCEL_FLOW`
- `RESET_AFTER_SERVER_EVENT`

This becomes the single owner of “where the player is in the flow,” so `GameMap` stops mutating actor tuples, `HexGrid` stops mutating `actor[0]`, and `GameCell` no longer decides business logic. Keep this reducer in `GameMap` first; only extract it into a hook if the file remains large after cleanup.

Public interface/type changes:
- Replace `Actor` with named object types.
- Replace loose callback signatures with typed action handlers.
- Add a discriminated union for interaction state and a typed union for UI intents.

### 3. Make `ActionForm` presentational
Convert `ActionForm` into a dumb UI component that:
- receives a list of available actions or a typed menu state
- renders buttons based on that state
- emits one typed callback like `onAction(actionId)`

Move all game rules and side effects out of `ActionForm`:
- no `useGame`
- no `useGameSocket`
- no `getAttackableCells`
- no `localStorage`
- no cancel/save choreography hidden inside the form

The parent interaction controller should decide:
- whether `Attack` is available
- whether `Move` means confirm move or choose move target
- whether `Confirm attack` is shown
- how cancel behaves in each phase

This makes “build/spawn unit” a straightforward future extension: the controller can add a new action option and its follow-up state without making `ActionForm` smarter.

### 4. Simplify cell responsibilities
Shift responsibility by layer:
- `GameMap`: owns interaction reducer, derives allowed actions/targets, dispatches websocket payloads
- `HexGrid`: pure projection of cell state, receives target/highlight info and typed click handlers
- `GameCell`: presentational cell wrapper that reports clicks and positions the menu, but does not decide game rules
- `ActionForm`: render-only action menu

Concrete cleanup expectations:
- `HexGrid` should not mutate incoming state (`actor[0] = "attack"` must go away)
- `GameCell` should stop owning flow-specific helpers like `hilightMovementCells`, `clickTargetUnit`, and mixed-purpose `cancel`
- replace generic `callback` with clearer handlers such as `onCellClick`, `onTargetClick`, or a single typed `onCellIntent(cell, intent?)`
- replace `isTarget?: string | false` with typed cell UI state such as `targetType?: "move" | "attack"` or a richer cell-status object

### 5. Separate rule derivation from transport
Extract pure helpers for the active-turn interaction rules:
- derive selectable units for the current player
- derive move targets for a selected unit
- derive attack targets from origin or preview destination
- derive action menu options for the current state
- build final websocket payloads from the pending interaction state

These helpers should be pure and testable, using `@TBS/common` where possible. `sendMove` remains the transport boundary; optimistic map updates should be isolated behind explicit helper functions rather than mixed into click handlers.

This is also where future “build/spawn” support should plug in:
- add a new action derivation branch for build-capable units/buildings
- add money validation against merged game view state
- add payload builders for build actions without reworking the UI flow again

## Test Plan
Cover the reducer/helpers first, then a few focused component tests.

Core interaction scenarios:
- selecting a movable friendly unit highlights only legal move targets
- clicking the selected unit again opens the in-place action path without mutating shared state
- choosing move then confirm emits the correct move payload and resets interaction state
- choosing attack from current position emits the correct attack payload
- choosing move target then attack uses the preview destination as attack origin without `localStorage`
- cancel from every phase returns to the expected prior or idle state
- clicking non-active or non-target cells during a flow clears or preserves state exactly as intended

Data-flow scenarios:
- active-game pages prefer socket map/turn/money when available and fall back to REST data on initial load
- `ActionForm` renders only from props and has no direct data dependencies
- a socket game event resets stale pending interaction state when the authoritative map changes

Future-proofing scenarios:
- menu-state structure can represent an additional `build` option without changing `ActionForm`’s API
- money-gated actions can be disabled/hidden from derived state without new prop drilling

## Assumptions
- Plan target is a phased cleanup, not a single-pass rewrite.
- Existing user-visible behavior should be preserved unless cleanup reveals an obvious bug in the current flow.
- REST data remains in `useGame` for initial hydration; socket state is layered on top through a composed hook rather than by merging providers immediately.
- `build/spawn` is not implemented in this pass, but the reducer/state model must leave a clear extension point for it.
- Type improvements are part of the cleanup and should favor discriminated unions and named objects over tuples, `any`, and overloaded booleans/strings.
