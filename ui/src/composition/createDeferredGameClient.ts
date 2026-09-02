import type { GameClient } from "@TBS/application";

export type GameClientLoader = () => Promise<GameClient>;

export const createDeferredGameClient = (load: GameClientLoader): GameClient => {
  let client: GameClient | undefined;
  let pending: Promise<GameClient> | undefined;

  const getClient = (): Promise<GameClient> => {
    if (client) return Promise.resolve(client);
    if (pending) return pending;
    pending = load().then((loaded) => {
      client = loaded;
      return loaded;
    }).finally(() => {
      pending = undefined;
    });
    return pending;
  };

  return {
    async createGame(input) {
      return (await getClient()).createGame(input);
    },
    async getActions(gameId, afterRevision) {
      return (await getClient()).getActions(gameId, afterRevision);
    },
    async getInvitePreview(inviteToken) {
      return (await getClient()).getInvitePreview(inviteToken);
    },
    async getSnapshot(gameId) {
      return (await getClient()).getSnapshot(gameId);
    },
    async joinGame(inviteToken, intent, displayName) {
      return (await getClient()).joinGame(inviteToken, intent, displayName);
    },
    async leave() {
      if (client) await client.leave();
      else if (pending) {
        try {
          await (await pending).leave();
        } catch {
          // A client that failed to initialize has no resources to release.
        }
      }
    },
    async submitAction(input) {
      return (await getClient()).submitAction(input);
    },
    async subscribe(gameId, revisionListener, presenceListener) {
      return (await getClient()).subscribe(gameId, revisionListener, presenceListener);
    },
    async updatePresence(input) {
      return (await getClient()).updatePresence(input);
    },
  };
};
