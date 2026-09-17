import { Link, Navigate, Route, Routes } from "react-router-dom";
import type { CreateAiOpponent } from "@TBS/application";
import { browserEnvironment } from "../../env";
import type { MapRepository} from "../../maps";
import { MapRepositoryProvider } from "../../maps";
import MapEditorPage from "../MapEditor/MapEditorPage";
import { AiGamePage } from "./AiGamePage";
import { InviteJoinPage } from "./InviteJoinPage";
import { SessionHomePage } from "./SessionHomePage";
import { SessionLandingPage } from "./SessionLandingPage";
import { SoloGamePage } from "./SoloGamePage";

export const SessionFlowRoutes = ({
  createAiOpponent,
  mapRepository,
  showTestOnlyGameContent = browserEnvironment.showTestOnlyGameContent,
}: Readonly<{
  mapRepository?: MapRepository;
  createAiOpponent: CreateAiOpponent;
  showTestOnlyGameContent?: boolean;
}>) => (
  <MapRepositoryProvider repository={mapRepository}>
    <nav aria-label="Primary">
      <ul>
        {/*<li className="primary-navigation__home">
          <Link aria-label="Home" to="/"><span aria-hidden="true">🏰</span></Link>
        </li> */}
        <li><Link to="/game/new">Play with a friend</Link></li>
        <li><Link to="/game/ai">Campaign demo</Link></li>
      </ul>
    </nav>
    <Routes>
      <Route path="/" element={<SessionLandingPage />} />
      <Route
        path="/game/new"
        element={<SessionHomePage showDefaultBattlefield={showTestOnlyGameContent} />}
      />
      <Route path="/game/solo" element={<SoloGamePage />} />
      <Route path="/game/ai" element={<AiGamePage createAiOpponent={createAiOpponent} />} />
      <Route path="/maps" element={<Navigate replace to="/maps/new" />} />
      <Route path="/maps/new" element={<MapEditorPage />} />
      <Route path="/maps/:mapId/edit" element={<MapEditorPage />} />
      <Route path="/game/:inviteToken" element={<InviteJoinPage />} />
      <Route path="/createGame" element={<Navigate replace to="/game/new" />} />
      <Route path="/lobby" element={<Navigate replace to="/" />} />
      <Route path="/mapEditor" element={<Navigate replace to="/maps/new" />} />
      <Route path="/signup" element={<Navigate replace to="/" />} />
      <Route path="/profile/*" element={<Navigate replace to="/" />} />
      <Route path="*" element={<main><h1>Page not found</h1><Link to="/">Go home</Link></main>} />
    </Routes>
  </MapRepositoryProvider>
);
