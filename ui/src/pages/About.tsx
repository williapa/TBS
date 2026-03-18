import { Button } from "@cloudscape-design/components";
import useLocalStorage from "use-local-storage";

const About = () => {
  const [user, setUser] = useLocalStorage("user", false);

  const logout = () => {
    setUser(undefined);
    window.location.reload();
  };

  let button = null;

  if (user) {
    button = (
      <Button onClick={logout}>
        Logout
      </Button>
    );
  }
  return (  
    <div style={{ flexDirection: "column" }} >
      <hr/>
      <hr/>
      <h1 style={{ fontSize: "5.6rem" }}> 🥇 Medal Versus 🥇 </h1>
      <p style={{fontSize: "1.6rem" }}> Simulate conflict amongst leaders of high society in this fast-paced, turn-based military strategy game. </p>
      <p style={{ textAlign: "center" }}> <b> Prod. By Key Value 🗝️💸 </b> </p>
      <hr/>
      <hr/>
      <div style={{ display: "flex", flexDirection: "row", justifyContent: "center" }} >
        {button}
      </div>
    </div>
  );
};

export default About;