import { createDefaultBattlefield, mapTerrainOptions, validateMap } from "@TBS/game-setup";
import { LocalStorageMapRepository } from "./LocalStorageMapRepository";

const map = () => validateMap(structuredClone(createDefaultBattlefield().map));
const forest = mapTerrainOptions.find((terrain) => terrain === "forest");
if (!forest) throw new Error("Forest terrain fixture is unavailable");

describe("LocalStorageMapRepository", () => {
  beforeEach(() => window.localStorage.clear());

  test("ships the validated default through list/get and keeps it read-only", async () => {
    const repository = new LocalStorageMapRepository(window.localStorage, () => "custom-1");
    const listed = await repository.list();
    expect(listed).toHaveLength(1);
    expect(listed[0]).toMatchObject({ id: "default-battlefield", schemaVersion: 1, readOnly: true });
    expect(await repository.get("default-battlefield")).toEqual(listed[0]);
    await expect(repository.delete("default-battlefield")).rejects.toMatchObject({ code: "read-only" });
  });

  test("saves, reloads, updates, and deletes local maps", async () => {
    const firstPage = new LocalStorageMapRepository(window.localStorage, () => "custom-1");
    const saved = await firstPage.save({ name: "  My map  ", map: map() });
    expect(saved).toMatchObject({ id: "custom-1", name: "My map", readOnly: false });

    const reloadedPage = new LocalStorageMapRepository(window.localStorage, () => "custom-2");
    expect(await reloadedPage.get("custom-1")).toEqual(saved);
    const updatedMap = map().map((row, rowIndex) => row.map((cell, columnIndex) =>
      rowIndex === 0 && columnIndex === 0 ? { ...cell, terrain: forest } : cell));
    expect(await reloadedPage.update("custom-1", { name: "Updated", map: updatedMap })).toMatchObject({ name: "Updated" });
    await reloadedPage.delete("custom-1");
    expect(await reloadedPage.get("custom-1")).toBeUndefined();
  });

  test.each([
    ["malformed JSON", "{", "invalid-map"],
    ["unsupported repository", JSON.stringify({ repositoryVersion: 2, maps: [] }), "unsupported-version"],
    ["unsupported map", JSON.stringify({ repositoryVersion: 1, maps: [{ schemaVersion: 2, id: "bad", name: "Bad", map: map() }] }), "unsupported-version"],
    ["malformed map", JSON.stringify({ repositoryVersion: 1, maps: [{ schemaVersion: 1, id: "bad", name: "Bad", map: [[{ row: 0 }]] }] }), "invalid-map"],
  ])("rejects %s without changing stored data", async (_name, raw, code) => {
    window.localStorage.setItem("TBS.maps.v1", raw);
    const repository = new LocalStorageMapRepository(window.localStorage, () => "new-map");
    await expect(repository.list()).rejects.toMatchObject({ code });
    await expect(repository.save({ name: "Safe", map: map() })).rejects.toMatchObject({ code });
    expect(window.localStorage.getItem("TBS.maps.v1")).toBe(raw);
  });

  test("rejects invalid coordinates, duplicate indexes, and broken neighbors before writing", async () => {
    const repository = new LocalStorageMapRepository(window.localStorage, () => "bad");
    const invalid = map().map((row, rowIndex) => row.map((cell, columnIndex) =>
      rowIndex === 0 && columnIndex === 0 ? { ...cell, row: 3 } : cell));
    await expect(repository.save({ name: "Bad", map: invalid })).rejects.toMatchObject({ code: "invalid-map" });
    expect(window.localStorage.getItem("TBS.maps.v1")).toBeNull();
  });
});
