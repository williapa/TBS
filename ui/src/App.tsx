import type { GameClient } from "@TBS/application";
import { useEffect } from "react";
import { BrowserRouter } from "react-router-dom";
import "./App.css";
import { browserEnvironment } from "./env";
import { GameSessionGatewayContext, GameSessionProvider } from "./multiplayer";
import { SessionFlowRoutes } from "./pages/Session/SessionFlowRoutes";

const App = ({ gateway }: { gateway: GameClient }) => {
  useEffect(() => {
    if (!browserEnvironment.sessionE2E) return;
    const target = window as unknown as { __TBS_E2E_GATEWAY__?: GameClient };
    target.__TBS_E2E_GATEWAY__ = gateway;
    return () => { delete target.__TBS_E2E_GATEWAY__; };
  }, [gateway]);

  return (
    <BrowserRouter future={{ v7_relativeSplatPath: true, v7_startTransition: true }}>
      <GameSessionGatewayContext.Provider value={gateway}>
        <GameSessionProvider>
          <SessionFlowRoutes />
        </GameSessionProvider>
      </GameSessionGatewayContext.Provider>
    </BrowserRouter>
  );
};

export default App;
