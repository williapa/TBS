import { render, screen } from "@testing-library/react";
import PlayerDetails from "./PlayerDetails";
import useUser from "../../hooks/useUser";
import { useGameSocket } from "../../hooks/gameSocketContext";

jest.mock("../../hooks/useUser");
jest.mock("../../hooks/gameSocketContext");
jest.mock("@cloudscape-design/components", () => ({
  Textarea: ({ value }: { value?: string }) => <textarea readOnly value={value ?? ""} />,
}));

const mockedUseUser = useUser as jest.MockedFunction<typeof useUser>;
const mockedUseGameSocket = useGameSocket as jest.MockedFunction<typeof useGameSocket>;

describe("PlayerDetails", () => {
  test("renders the current money and per-turn income", () => {
    mockedUseUser.mockReturnValue({ pin: "1234", user: "viewer@example.com" });
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

    render(
      <PlayerDetails
        activeTurn={false}
        color="orange"
        email="creator@example.com"
        income={400}
        money={1200}
      />
    );

    expect(screen.getByText(/Money:/i)).toBeInTheDocument();
    expect(screen.getByText("1200")).toBeInTheDocument();
    expect(screen.getByText(/Income\/turn:/i)).toBeInTheDocument();
    expect(screen.getByText("400")).toBeInTheDocument();
  });
});
