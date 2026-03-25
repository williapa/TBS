# Money Feature

Status - COMPLETE (MERGED)

## Summary
- Add `creatorMoney` and `challengerMoney` to active game records.
- Initialize both players at `1000` money.
- Add shared income calculation in `/common`.
- Award income to the next active player whenever an `endTurn` event is created.
- Store income and updated money totals on `endTurn` events.
- Broadcast current money totals with every `gameEvent` payload so the UI stays in sync.

## Common
- Add a helper that returns income for a single map item.
- Export the helper from `common/src/index.ts`.
- Initial income rules:
  - `capital` => `100`
  - everything else => `0`

## Server
- On game creation, persist `creatorMoney: 1000`.
- When a challenger joins, persist `challengerMoney: 1000`.
- During turn processing, when an `endTurn` event is generated:
  - identify the next active player,
  - identify that player’s team,
  - sum building income for that team across the map,
  - add that income to the correct money total,
  - include `income`, `creatorMoney`, and `challengerMoney` on the `endTurn` event.
- Include `creatorMoney` and `challengerMoney` in every `gameEvent` websocket payload.

## UI
- Extend active game types to include `creatorMoney` and `challengerMoney`.
- Update socket state to keep current money totals in sync with broadcasts.
- Use live money values in `PlayerDetails` instead of hardcoded values.
- Show income gained in the event table for `endTurn` events.
- Do not implement spending or money bag behavior yet.

## Verification
- Run `npm run build` from the repo root.
