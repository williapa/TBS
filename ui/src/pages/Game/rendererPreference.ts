export type BoardRendererKind = "2d" | "3d";

const STORAGE_KEY = "TBS.board-renderer.v1";

export const readRendererPreference = (storage: Pick<Storage, "getItem"> = window.localStorage): BoardRendererKind => {
  try {
    return storage.getItem(STORAGE_KEY) === "3d" ? "3d" : "2d";
  } catch {
    return "2d";
  }
};

export const writeRendererPreference = (
  renderer: BoardRendererKind,
  storage: Pick<Storage, "setItem"> = window.localStorage,
): void => {
  try {
    storage.setItem(STORAGE_KEY, renderer);
  } catch {
    // A storage denial must not prevent a match from rendering.
  }
};
