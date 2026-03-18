import { useState} from "react";
import {
  Button,
  ColumnLayout,
  Container,
  SpaceBetween,
  Table,
  TextFilter,
  TextFilterProps
} from "@cloudscape-design/components";
import { Game, GameColumns } from "./Game/GameColumns";
import useFetch from "react-fetch-hook";
import Spinner from "../components/Spinner";

const UserProfile = ({ email }: { email: string }) => {

  const [filterText, setFilterText] = useState("");
  const [filteredGames, setFilteredGames] = useState<Game[]>([]);

  const { error, isLoading, data } = useFetch(`http://localhost:8420/user/${email}`);

  if (error) return <p> {error.message} </p>;

  if (isLoading) return <Spinner type="deadCenter" />;

  const { games, player } = data as { games: Game[], player: any };
  const { wins, losses } = player;

  const filterGames = (filterText: string) => {
    if (!filterText.length) return games;
    return games.filter((game) => 0 <= JSON.stringify(game).indexOf(filterText));
  };

  const onChange = ({ detail }: { detail: TextFilterProps }) => {
    setFilterText(detail.filteringText);
    setFilteredGames(filterGames(detail.filteringText));
  };

  return (
    <div style={{
      maxWidth: "60%",
      marginLeft: "20%",
      marginTop: "30px"
    }}>
      <SpaceBetween direction="vertical" size="s">
        <Container header={<h1>👨‍🚀 {email} 👨‍🚀</h1>} >
          <ColumnLayout columns={3} >
            <div>
              <p> <b> Wins: </b> </p>
              <p> { wins} </p>
            </div>
            <div>
              <p> <b> Losses: </b> </p>
              <p> { losses} </p>
            </div>
            <div>
              <p> <b> Win Rate: </b> </p>
              <p> { wins + losses < 1 ? "0%": (wins / wins + losses) } </p>
            </div>
          </ColumnLayout>
        </Container>
        <Table
          columnDefinitions={GameColumns}
          empty={<div><p>no games.</p> <Button href="/createGame" variant="link">create a game</Button> </div>}
          filter={
            <TextFilter
              filteringText={filterText} 
              onChange={onChange}
            />
          } 
          header={<h2>Games</h2>} 
          items={filterText.length ? filteredGames: games} 
        />
      </SpaceBetween>
    </div>
  );

};

export default UserProfile;
