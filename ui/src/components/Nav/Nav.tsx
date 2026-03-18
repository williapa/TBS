import {
  Link
} from "react-router-dom";

type NavProps = {
  routes: Route[]
};

const Nav = ({ routes }: NavProps) => {
  return (
    <nav>
      <ul>
        {routes.map(({ to, text }: Route) => (
          <li key={text} >
            <Link to={to}>{text}</Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export default Nav;