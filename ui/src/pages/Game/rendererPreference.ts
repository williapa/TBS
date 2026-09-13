export type BoardRendererKind = "2d" | "3d";

const STORAGE_KEY = "TBS.board-renderer.v2";

export const readRendererPreference = (storage: Pick<Storage, "getItem"> = window.localStorage): BoardRendererKind => {
  try {
    return storage.getItem(STORAGE_KEY) === "2d" ? "2d" : "3d";
  } catch {
    return "3d";
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
