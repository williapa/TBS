import useUser from "../../hooks/useUser";
import { Button, ColumnLayout, Container } from "@cloudscape-design/components"
import Spinner from "../../components/Spinner";
import ReadOnlyMap from "../../components/Map/ReadOnlyMap";
import Game from "./Game";
import useGame from "../../hooks/useGame";
import { useGameSocket } from "../../hooks/gameSocketContext";

const GameDetails = () => {
  const { user } = useUser();
  const { joinGame } = useGameSocket();
  const { isLoading, error, data } = useGame();
  const { mapData, creator, challenger, map, name, open_timestamp } = data as GameProps;
  const activeGame = user.length && creator && challenger && [creator, challenger].includes(user);
  const gameProps = data as GameProps;

  if (isLoading) return <Spinner type="deadCenter" />;

  if (error) return <p> { error.message } </p>;

  if (activeGame) {
    return <Game {...gameProps} />;
  }

  const buttonIsDisabled = (!user.length || user === creator);

  return (
    <div>
      <div style={{ marginTop: "10px", marginLeft: "20%", width: "60%" }} > 
        <Container header={<h1> {name } </h1>} >
          <ColumnLayout columns={4} >
            <div>
              <p> <b> Creator: </b> </p>
              <p>  { creator } { user === creator && "(you)" } </p>
            </div>
            <div>
              <p> <b> Created: </b> </p>
              <p> { new Date(parseInt(open_timestamp)).toDateString() } </p>
            </div>
            <div>
              <p> <b> Map name: </b> </p>
              <p> { map } </p>
            </div>
            <div style={{ marginTop: "12px" }}>
              <Button variant="primary" disabled={buttonIsDisabled} onClick={() => joinGame(user)}> Join game </Button>
            </div>
          </ColumnLayout>
        </Container> 
      </div>
      <ReadOnlyMap mapData={mapData} />
    </div>
  );

};

export default GameDetails;
