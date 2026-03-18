import { useEffect, useState } from "react";
import {
  BrowserRouter as Router,
  Link,
  Routes,
  Route
} from "react-router-dom";
import useLocalStorage from "use-local-storage";
import { GameSocketProvider } from "./hooks/gameSocketContext";
import Lobby from "./pages/Lobby/Lobby";
import MapEditorPage from "./pages/MapEditor/MapEditorPage";
import SignupPage from "./pages/Signup/SignupPage";
import Layout from "./components/Layout";
import UserProfile from "./pages/UserProfile";
import About from "./pages/About";
import CreateGameForm from "./pages/Game/Create/CreateGameForm";
import GameDetails from "./pages/Game/GameDetails";
import "@cloudscape-design/global-styles/index.css"
import './App.css';

const MAX_EMAIL_LENGTH = 40;

const trim = (string = "", maxLength = MAX_EMAIL_LENGTH) => {
  return string.length > maxLength
    ? `${string.substring(0, maxLength)}...`
    : string;
};

const App = () => {
  const [user] = useLocalStorage("user", { user: "" });
  const [loggedInUserEmail, setLoggedInUserEmail] = useState(user.user);
  const initialRoute = { to: "/signup", text: "Login", component: <SignupPage set={setLoggedInUserEmail} /> }
  const [firstRoute, setFirstRoute] = useState(initialRoute);
 
  useEffect(() => {
    if (loggedInUserEmail.length) {
      setFirstRoute({ 
        to: `/profile/${loggedInUserEmail}`,
        text: `_👨‍🚀 ${trim(loggedInUserEmail)} 👨‍🚀_`,
        component: <UserProfile email={loggedInUserEmail} /> 
      });
    } else {
      setFirstRoute(initialRoute);
    }
  }, [loggedInUserEmail]);
  
  // use App as routes container 
  // all functionality starts in /pages
  const routes = [
    firstRoute,
    { to: "/lobby", text: "_🏛️ Lobby 🏛️_", component: <Lobby /> },
    { to: "/", text: "_🥇 Medal Versus 🥇_", component: <Layout type="deadCenter"><About /></Layout> }, // TODO: make docs page, use react-markdown
    { to: "/createGame", text: "_⚔️ Create Game ⚔️_", component: <CreateGameForm /> },
    { to: "/mapEditor", text: "_🗺️ Create Map 🗺️_", component: <MapEditorPage /> },
  ];

  return (
    <Router>
      <div style={{ height: `${window.innerHeight - 44}px` }}>
        <nav>
          <ul>
            {routes.map(({ to, text }) => (
              <li key={text} onClick={()=> { window.location.pathname = to; }}>
                <Link to={to}>{text}</Link>
              </li>
            ))}
          </ul>
        </nav>
        <Routes>
          {routes.map(({ to, component }) => (
            <Route key={to} path={to} element={component} />
          ))}
          <Route 
            key="gameId" 
            path="/game/:id" 
            element={
              <GameSocketProvider>
                <GameDetails />
              </GameSocketProvider>
            } 
          />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
