import useFetch from "react-fetch-hook";
import { useNavigate } from "react-router-dom";
import Error from "../../components/Error";
import Spinner from "../../components/Spinner";
import Layout from "../../components/Layout";
import Button from "@cloudscape-design/components/button";
import Table from "@cloudscape-design/components/table";
import Header from "@cloudscape-design/components/header";
import { Game, GameColumns } from "../Game/GameColumns";

const gameColumns = GameColumns.slice(0,-2);

const Lobby = () => {
  const { isLoading, error, data } = useFetch(`http://localhost:8420/listGames`);
  const navigate = useNavigate();
  if (isLoading) return <Spinner type="deadCenter" />;
  
  if (error) return <Error error={error.message}/>;

  const gameData = data as Game[] || [];

  const action = (
    <Button 
      variant="primary"
      onClick={() => navigate("/createGame")}
    >
      Create Game
    </Button>
  );

  const header = (
    <Layout action={action} type="lr" >
      <Header>
        Open games
      </Header>
    </Layout>
  );

  return (
    <div style={{
      width: "60%",
      marginLeft: "20%",
      marginTop: "30px",
    }}>
      <Table 
        columnDefinitions={gameColumns}
        header={header}
        items={gameData}
      />
    </div>
  );
}

export default Lobby;