import type { JoinIntent } from "@TBS/application";

type ReconnectDetails = { displayName: string; intent: JoinIntent };

const key = (inviteToken: string) => `TBS.session.${inviteToken}`;

export const saveReconnectDetails = (inviteToken: string, details: ReconnectDetails) => {
  window.localStorage.setItem(key(inviteToken), JSON.stringify(details));
};

export const loadReconnectDetails = (inviteToken: string): ReconnectDetails | undefined => {
  try {
    const value = JSON.parse(window.localStorage.getItem(key(inviteToken)) ?? "null") as Partial<ReconnectDetails> | null;
    if (!value || typeof value.displayName !== "string" || !value.displayName.trim()) return undefined;
    if (value.intent !== "player" && value.intent !== "spectator") return undefined;
    return { displayName: value.displayName, intent: value.intent };
  } catch {
    return undefined;
  }
};
