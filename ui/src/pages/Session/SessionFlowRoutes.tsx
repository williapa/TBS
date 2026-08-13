import { Link, Navigate, Route, Routes } from "react-router-dom";
import type { MapRepository} from "../../maps";
import { MapRepositoryProvider } from "../../maps";
import MapEditorPage from "../MapEditor/MapEditorPage";
import { InviteJoinPage } from "./InviteJoinPage";
import { SessionHomePage } from "./SessionHomePage";

export const SessionFlowRoutes = ({ mapRepository }: { mapRepository?: MapRepository }) => (
  <MapRepositoryProvider repository={mapRepository}>
    <nav aria-label="Primary">
      <ul>
        <li><Link to="/">Start game</Link></li>
        <li><Link to="/maps/new">Create map</Link></li>
      </ul>
    </nav>
    <Routes>
      <Route path="/" element={<SessionHomePage />} />
      <Route path="/maps" element={<Navigate replace to="/maps/new" />} />
      <Route path="/maps/new" element={<MapEditorPage />} />
      <Route path="/maps/:mapId/edit" element={<MapEditorPage />} />
      <Route path="/game/:inviteToken" element={<InviteJoinPage />} />
      <Route path="/createGame" element={<Navigate replace to="/" />} />
      <Route path="/lobby" element={<Navigate replace to="/" />} />
      <Route path="/mapEditor" element={<Navigate replace to="/maps/new" />} />
      <Route path="/signup" element={<Navigate replace to="/" />} />
      <Route path="/profile/*" element={<Navigate replace to="/" />} />
      <Route path="*" element={<main><h1>Page not found</h1><Link to="/">Start a game</Link></main>} />
    </Routes>
  </MapRepositoryProvider>
);
