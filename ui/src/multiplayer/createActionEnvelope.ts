import { ActionEnvelope, CURRENT_GAME_PROTOCOL_VERSION, GameAction } from "@TBS/common";

const fallbackUuid = () => "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (character) => {
  const random = Math.floor(Math.random() * 16);
  const value = character === "x" ? random : (random & 0x3) | 0x8;
  return value.toString(16);
});

export const createActionEnvelope = (
  expectedRevision: number,
  action: GameAction,
  actionId = globalThis.crypto?.randomUUID?.() ?? fallbackUuid()
): ActionEnvelope => ({
  protocolVersion: CURRENT_GAME_PROTOCOL_VERSION,
  actionId,
  expectedRevision,
  action,
});
