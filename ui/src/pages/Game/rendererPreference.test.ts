import { readRendererPreference, writeRendererPreference } from "./rendererPreference";

describe("renderer preference", () => {
  test("defaults invalid values to 2D and round-trips 3D", () => {
    const values = new Map<string, string>();
    const storage = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
    };
    expect(readRendererPreference(storage)).toBe("2d");
    writeRendererPreference("3d", storage);
    expect(readRendererPreference(storage)).toBe("3d");
    values.set("TBS.board-renderer.v1", "future-renderer");
    expect(readRendererPreference(storage)).toBe("2d");
  });

  test("falls back safely when browser storage is unavailable", () => {
    expect(readRendererPreference({ getItem: () => { throw new Error("denied"); } })).toBe("2d");
    expect(() => writeRendererPreference("3d", { setItem: () => { throw new Error("denied"); } })).not.toThrow();
  });
});
