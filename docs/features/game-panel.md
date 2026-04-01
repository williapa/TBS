# Feature - Game Panel

This document describes data that should be displayed in the GamePanel.tsx component, whenever a player clicks a cell on the map. The GamePanel.tsx is a panel that is already integrated into the active game view, occupying the bottom left and bottom middle of the screen, to the left of the events panel. but currently, it only displays static text "Details" and is not dynamic.

## Flow

When a player clicks a cell on the map, whether or not it is their turn, the GamePanel.tsx should be populated with details about the cell. If it is the player's turn, then only the first click in the action flow populates the details view, reflecting the current selected actor. It should not switch to show details for a movement, attack, or boost target. Once a user confirms an action, the details section should be cleared. When no actor is selected, the details section can say something like "Click a cell to see game information."

## Detail Fields 

This section describes what details should be presented for different types of cells.

A. "Type" - note unit subType (flying vehicle, ground vehicle, object, person, animal, or building) (applies to all types)
B. "Damage" - note damage as health (with color of team)
C. "Acted" - note "acted" if unit has acted this turn (this is the property "moved" on the unit cell)
D. "Stats" - list default combat stats (incorporate boosted)
E. "Boosted" - note boost if boosted (n/a for vehicle)
F. "Income" - note contribution to income per turn (if building)
G. "Actions" - list allowed actions (from: boost, attack, move, load, unload, heal, spawn, construct)
H. "Energy" - list available energy for this unit (n/a for buildings)
I. "Energy Costs" - list applicable energy costs for each terrain type (n/a for buildings)
J. "Coordinates" - list coordinates for cell (applies to all types)
K. "Transport" - IF LOADED, list subset of detail sections (excluding G. Actions, H. Energy, I. Energy Cost, and J. coordinates)
  - A. "Type" notated as "carrying {unitType}."
  - B. "Damage" - note damage as health (with color of team)
  - C. "Acted" - note acted if has performed action this turn ("moved" property)
  - D. "Stats" - list default combat stats (incorporate boost if boosted)
  - E. note boost if boosted


## Implementation steps

1. wire up cell click to populate GamePanel.tsx with the unit type, terrain, and coordinates of the clicked cell, based on described flow (when active turn: initial click setting actor populates details, is not cleared until cancel or confirm action. when not active turn: every click populates details for that cell). These data points will be used to build the remainder of the details fields in the following implementation steps.
2. implement detail fields for "empty cell (terrain)" (A,J)
3. implement detail fields for "object cell" logic    (A,G,J)
4. implement detail fields for "buildilng cell" logic (A,B,C,D,E,F,G,J)
5. implement detail fields for "animal cell" logic    (A,B,C,D,E,G,H,I,J)
6. implement detail fields for "people cell" logic    (A,B,C,D,E,G,H,I,J)
7. implement detail fields for "vehicle cell" logic   (A,B,C,D,G,H,I,J,K)

## UI Visual Requirements

- details will need to scroll as some unit types will require significant space. the GamePanel.tsx should not expand to make the entire page scrollable, it should scroll with the available space in the window.
- The section should be built using a cloudscape container, with each field populating a "key value pair" component. However, you should confirm that the cloudscape container will not conflict with the previous requirement related to scrolling.
- for "Actions", use the cloudscape "popover" component and a child cloudscape Button (without a display icon). when the action is clicked, the appropriate details text should be displayed as the popover text.

## Other Details

Functions to get the appropriate energy, energy cost, combat stats, etc. are already available in common. The implemented code for "getDetailsForUnit.ts" outlines some basic functions to build the detail popover text for actions. However, the details text (exported in the map detailsTextByAction) does not include a description of valid targets for "boost" and "heal". These should be appended to the details text for "boost" and "heal" actions, and the UI component can fetch and build a list of valid targets in the client. Or, if you find it to be a better design, you can modify "getDetailsForUnit.ts" to build the details text to accomodate this logic within the common code, simplifying the UI code.

## Testing

tests should likely focus on new logic in the ui code related to building the Game Panel to display the appropriate details. Attempt to define new code as new components and then integrate those components into the GamePanel.tsx file.

## GamePanel Implementation Plan

### Summary
Implement `GamePanel` as a presentational details panel driven by a new derived panel-state model, not by ad hoc reads inside the component. Keep the action-flow reducer in the map layer, but expose a normalized panel payload upward so the panel can render consistent details for both passive inspection and active-turn selection.

This plan resolves the main ambiguities as follows:
- Hide non-applicable fields instead of rendering `N/A`.
- Treat terrain as its own first-class field, separate from occupant/unit type.
- During an active move preview, keep the panel focused on the selected actor and update its coordinates/terrain/action context to the preview destination.
- Keep action descriptions rule-driven from common code; enrich `boost` and `heal` descriptions there so the UI does not recreate rules text.

### Key Changes
- Add a new UI-facing panel model, for example `GamePanelState`, that represents exactly what the panel should show:
  - `focus`: `"cell"` or `"actor"`
  - `coords`, `terrain`
  - `occupant`: current `MapItem` or normalized loaded-unit data
  - `rows`: prebuilt key-value content for rendering
  - `transportRows`: optional nested summary for `loadedUnit`
- Keep the reducer local in [GameMap.tsx](C:/Users/pauls/projects/TBS/ui/src/pages/Game/GameMap.tsx), but add an `onPanelStateChange` prop from [Game.tsx](C:/Users/pauls/projects/TBS/ui/src/pages/Game/Game.tsx) so the map remains the source of truth for click-flow behavior.
- In `GameMap`, derive panel state with one pure helper from:
  - `interactionState`
  - current `mapData`
  - whether the map is active
  - last passively inspected cell
- Panel-selection behavior:
  - Inactive turn: every click updates the panel to that cell.
  - Active turn with no selected actor: any click updates the panel to that cell.
  - Active turn after actor selection: panel follows the actor, not attack/heal/boost/load/unload targets.
  - Move preview: panel updates to the same actor at the preview destination.
  - Confirm or cancel action: clear panel back to the empty prompt.
  - Server map refresh/reset: clear panel unless a fresh click/selection reestablishes it.
- Build row-generation in a dedicated UI helper, not inline in `GamePanel`, so rendering stays simple and testable.
  - Always show: `Occupant Type`, `Terrain`, `Coordinates`
  - Occupied units/buildings/objects show only applicable extra rows
  - `Damage` displays as health (`100 - damage`) with team-colored value
  - `Acted` renders only when `moved === true`
  - `Stats` uses boosted-adjusted default combat stats, not matchup-specific special-case stats
  - `Income` only for buildings
  - `Energy` and terrain `Energy Costs` only for movable units
  - `Actions` uses capability-based actions for the unit type, not turn- or board-specific availability
  - Vehicles with `loadedUnit` render an additional transport subsection with the reduced field set from the doc
- Extend [getDetailsForUnit.ts](C:/Users/pauls/projects/TBS/common/src/rules/getDetailsForUnit.ts) so common exports a richer action-details helper:
  - preserve `getActionsForUnit`
  - add a helper that returns action descriptions with appended valid-target text for `boost` and `heal`
  - export this helper from `@TBS/common`
- Export the common calculators the panel needs from the common package root if they are not already surfaced:
  - combat stats helper for base stats
  - default energy helper
  - terrain movement-cost helper
  - income helper
- Render `GamePanel` with Cloudscape components, but keep scrolling on an inner content wrapper:
  - outer panel remains fixed within the existing bottom-row layout
  - inner body gets `overflow-y: auto` and `min-height: 0`
  - use Cloudscape `Container` for the shell and key/value presentation for rows
  - use Cloudscape `Popover` + text button for the `Actions` row

### Public Interfaces / Types
- Add a UI type like `GamePanelState` plus a small row type such as `GamePanelRow`.
- Add an `onPanelStateChange` prop to `GameMap`.
- Add a new common export for enriched action details from `getDetailsForUnit.ts`.
- Export any missing common stat/energy/movement helpers from the package root instead of reaching into internal paths.

### Test Plan
- `GameMap` / panel-state derivation:
  - inactive-turn click shows clicked cell details
  - active-turn click on a non-actor cell shows that cell
  - selecting an actor pins panel to that actor
  - selecting attack/heal/boost/load/unload targets does not replace actor details
  - choosing a move preview updates actor coordinates/terrain in the panel
  - cancel and confirm clear the panel
  - reducer reset after server map change clears panel state
- Details-row generation:
  - empty terrain cell shows occupant type, terrain, coordinates only
  - object cell shows object-specific actions/details only
  - building shows health/stats/boost/income/actions when applicable
  - person/animal shows combat, boost, energy, movement costs, actions
  - vehicle with `loadedUnit` shows transport subsection and omits excluded loaded-unit rows
- Common action-details helper:
  - `boost` descriptions include valid target groups
  - `heal` descriptions include valid target groups
  - existing action descriptions remain stable for other actions
- Component rendering:
  - empty prompt appears when panel state is null
  - action popovers render descriptions
  - panel content scrolls internally instead of expanding the page

### Assumptions
- `Actions` means unit/building capabilities by rules, not currently legal moves on this exact turn.
- `Stats` means default stats plus boost effect, not opponent-dependent special combat bonuses.
- Health is shown on a 0-100 scale derived from `damage`.
- Buildings may show `Acted` only when `moved` is actually set by existing gameplay flows; otherwise the row is omitted.
