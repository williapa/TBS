import { readRendererPreference, writeRendererPreference } from "./rendererPreference";

describe("renderer preference", () => {
  test("defaults missing, legacy, and invalid values to 3D and preserves a new 2D choice", () => {
    const values = new Map<string, string>([["TBS.board-renderer.v1", "2d"]]);
    const storage = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
    };
    expect(readRendererPreference(storage)).toBe("3d");
    writeRendererPreference("2d", storage);
    expect(readRendererPreference(storage)).toBe("2d");
    values.set("TBS.board-renderer.v2", "future-renderer");
    expect(readRendererPreference(storage)).toBe("3d");
  });

  test("falls back safely when browser storage is unavailable", () => {
    expect(readRendererPreference({ getItem: () => { throw new Error("denied"); } })).toBe("3d");
    expect(() => writeRendererPreference("3d", { setItem: () => { throw new Error("denied"); } })).not.toThrow();
  });
});
