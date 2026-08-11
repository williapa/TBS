import { useEffect, useMemo } from "react";
import { BrowserRouter } from "react-router-dom";
import "./App.css";
import { GameSessionGateway, GameSessionGatewayContext, GameSessionProvider } from "./multiplayer";
import { SupabaseGameSessionGateway } from "./multiplayer/supabase";
import { SessionFlowRoutes } from "./pages/Session/SessionFlowRoutes";

const App = () => {
  const gateway = useMemo(() => new SupabaseGameSessionGateway(), []);
  useEffect(() => {
    if (process.env.REACT_APP_SESSION_E2E !== "true") return;
    const target = window as unknown as { __TBS_E2E_GATEWAY__?: GameSessionGateway };
    target.__TBS_E2E_GATEWAY__ = gateway;
    return () => { delete target.__TBS_E2E_GATEWAY__; };
  }, [gateway]);

  return (
    <BrowserRouter>
      <GameSessionGatewayContext.Provider value={gateway}>
        <GameSessionProvider>
          <SessionFlowRoutes />
        </GameSessionProvider>
      </GameSessionGatewayContext.Provider>
    </BrowserRouter>
  );
};

export default App;
