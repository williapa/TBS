import { renderHook } from "@testing-library/react";
import useActiveGameView from "./useActiveGameView";
import useUser from "./useUser";
import { useGameSocket } from "./gameSocketContext";

jest.mock("./useUser");
jest.mock("./gameSocketContext");

const mockedUseUser = useUser as jest.MockedFunction<typeof useUser>;
const mockedUseGameSocket = useGameSocket as jest.MockedFunction<typeof useGameSocket>;

const createMapItem = (
  unit: UnitTypes,
  team: TeamType,
  index: number
): MapItem => ({
  column: index,
  index,
  row: 0,
  team,
  terrain: "plains" as TerrainType.plains,
  unit,
});

const game = {
  activeTurn: "creator@example.com",
  challenger: "challenger@example.com",
  challengerMoney: 1000,
  creator: "creator@example.com",
  creatorMoney: 1200,
  map: "test-map",
  mapData: [[createMapItem("soldier" as UnitTypes, "orange" as TeamType.orange, 0)]],
  name: "Test game",
  open_timestamp: "1",
};

describe("useActiveGameView", () => {
  test("falls back to REST values when socket state is empty", () => {
    mockedUseUser.mockReturnValue({ pin: "1234", user: "creator@example.com" });
    mockedUseGameSocket.mockReturnValue({
      challengerMoney: null,
      clearMoves: jest.fn(),
      creatorMoney: null,
      isConnected: true,
      joinGame: jest.fn(),
      map: [[]],
      moves: [],
      sendMove: jest.fn(),
      setMap: jest.fn(),
      turn: "",
    } as ReturnType<typeof useGameSocket>);

    const { result } = renderHook(() => useActiveGameView(game as GameProps));

    expect(result.current.currentMap).toEqual(game.mapData);
    expect(result.current.currentTurn).toBe(game.activeTurn);
    expect(result.current.creatorMoney).toBe(1200);
    expect(result.current.creatorIncome).toBe(0);
    expect(result.current.challengerIncome).toBe(0);
    expect(result.current.isLocalPlayersTurn).toBe(true);
    expect(result.current.perspectiveTeam).toBe("orange");
  });

  test("prefers live socket values when they are available", () => {
    const liveMap = [[createMapItem("soldier" as UnitTypes, "purple" as TeamType.purple, 1)]];

    mockedUseUser.mockReturnValue({ pin: "9999", user: "challenger@example.com" });
    mockedUseGameSocket.mockReturnValue({
      challengerMoney: 1400,
      clearMoves: jest.fn(),
      creatorMoney: 900,
      isConnected: true,
      joinGame: jest.fn(),
      map: liveMap,
      moves: [],
      sendMove: jest.fn(),
      setMap: jest.fn(),
      turn: "challenger@example.com",
    } as ReturnType<typeof useGameSocket>);

    const { result } = renderHook(() => useActiveGameView(game as GameProps));

    expect(result.current.currentMap).toEqual(liveMap);
    expect(result.current.currentTurn).toBe("challenger@example.com");
    expect(result.current.creatorMoney).toBe(900);
    expect(result.current.challengerMoney).toBe(1400);
    expect(result.current.creatorIncome).toBe(0);
    expect(result.current.challengerIncome).toBe(0);
    expect(result.current.isLocalPlayersTurn).toBe(true);
    expect(result.current.perspectiveTeam).toBe("purple");
    expect(result.current.opponentTeam).toBe("orange");
  });

  test("calculates income from game map data when socket map state is empty", () => {
    const incomeGame = {
      ...game,
      mapData: [[
        createMapItem("capital" as UnitTypes, "orange" as TeamType.orange, 0),
        createMapItem("factory" as UnitTypes, "orange" as TeamType.orange, 1),
        createMapItem("house" as UnitTypes, "purple" as TeamType.purple, 2),
      ]],
    };

    mockedUseUser.mockReturnValue({ pin: "1234", user: "creator@example.com" });
    mockedUseGameSocket.mockReturnValue({
      challengerMoney: null,
      clearMoves: jest.fn(),
      creatorMoney: null,
      isConnected: true,
      joinGame: jest.fn(),
      map: [[]],
      moves: [],
      sendMove: jest.fn(),
      setMap: jest.fn(),
      turn: "",
    } as ReturnType<typeof useGameSocket>);

    const { result } = renderHook(() => useActiveGameView(incomeGame as GameProps));

    expect(result.current.creatorIncome).toBe(400);
    expect(result.current.challengerIncome).toBe(100);
  });

  test("recalculates income from the live socket map", () => {
    const liveMap = [[
      createMapItem("airport" as UnitTypes, "orange" as TeamType.orange, 0),
      createMapItem("church" as UnitTypes, "orange" as TeamType.orange, 1),
      createMapItem("lab" as UnitTypes, "purple" as TeamType.purple, 2),
    ]];

    mockedUseUser.mockReturnValue({ pin: "9999", user: "challenger@example.com" });
    mockedUseGameSocket.mockReturnValue({
      challengerMoney: 1400,
      clearMoves: jest.fn(),
      creatorMoney: 900,
      isConnected: true,
      joinGame: jest.fn(),
      map: liveMap,
      moves: [],
      sendMove: jest.fn(),
      setMap: jest.fn(),
      turn: "challenger@example.com",
    } as ReturnType<typeof useGameSocket>);

    const { result } = renderHook(() => useActiveGameView(game as GameProps));

    expect(result.current.creatorIncome).toBe(100);
    expect(result.current.challengerIncome).toBe(300);
  });

  test("uses shared income rules instead of ui-only unit income metadata", () => {
    const incomeGame = {
      ...game,
      mapData: [[
        createMapItem("church" as UnitTypes, "orange" as TeamType.orange, 0),
        createMapItem("college" as UnitTypes, "orange" as TeamType.orange, 1),
      ]],
    };

    mockedUseUser.mockReturnValue({ pin: "1234", user: "creator@example.com" });
    mockedUseGameSocket.mockReturnValue({
      challengerMoney: null,
      clearMoves: jest.fn(),
      creatorMoney: null,
      isConnected: true,
      joinGame: jest.fn(),
      map: [[]],
      moves: [],
      sendMove: jest.fn(),
      setMap: jest.fn(),
      turn: "",
    } as ReturnType<typeof useGameSocket>);

    const { result } = renderHook(() => useActiveGameView(incomeGame as GameProps));

    expect(result.current.creatorIncome).toBe(0);
    expect(result.current.challengerIncome).toBe(0);
  });
});
