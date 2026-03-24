import { renderHook } from "@testing-library/react";
import useActiveGameView from "./useActiveGameView";
import useUser from "./useUser";
import { useGameSocket } from "./gameSocketContext";

jest.mock("./useUser");
jest.mock("./gameSocketContext");

const mockedUseUser = useUser as jest.MockedFunction<typeof useUser>;
const mockedUseGameSocket = useGameSocket as jest.MockedFunction<typeof useGameSocket>;

const game = {
  activeTurn: "creator@example.com",
  challenger: "challenger@example.com",
  challengerMoney: 1000,
  creator: "creator@example.com",
  creatorMoney: 1200,
  map: "test-map",
  mapData: [[{
    column: 0,
    index: 0,
    row: 0,
    team: "orange" as TeamType.orange,
    terrain: "plains" as TerrainType.plains,
    unit: "soldier" as PersonType.soldier,
  }]],
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
    expect(result.current.isLocalPlayersTurn).toBe(true);
    expect(result.current.perspectiveTeam).toBe("orange");
  });

  test("prefers live socket values when they are available", () => {
    const liveMap = [[{
      column: 1,
      index: 1,
      row: 0,
      team: "purple" as TeamType.purple,
      terrain: "forest" as TerrainType.forest,
      unit: "soldier" as PersonType.soldier,
    }]];

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
    expect(result.current.isLocalPlayersTurn).toBe(true);
    expect(result.current.perspectiveTeam).toBe("purple");
    expect(result.current.opponentTeam).toBe("orange");
  });
});
