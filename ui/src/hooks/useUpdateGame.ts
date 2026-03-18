import { useParams } from 'react-router-dom';
import useUser from "./useUser";

const useUpdateGame = () => {

  const { user: email, pin } = useUser();
  const { id: gameId } = useParams();
  // todo: this was breaking ability to return promise
  // if (!email || !pin || !gameId) return (gameAction: GameAction, endTurn?: boolean) => window.alert("you need to be logged in.");

  return (gameAction: GameAction, endTurn?: boolean): Promise<Response> => {
    return fetch("http://localhost:8420/updateGame", {
      method: "post",
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        gameAction,
        gameId,
        pin
      })
    }).then((response) => {
      if (response.ok) {
        console.log("move accepted by the filet p.i.");
        // todo: if attack you need to return something
        // will need the function to return a loading state
        if (endTurn) {
          window.alert("Your turn has ended.");
          setTimeout(() => window.location.reload(), 1000);
        }
      } else {
        window.alert("error! move has not been accepted by the server. Please refresh the page.");
      }
      return response.json();
    }).catch((error) => {
      console.log(error);
      window.alert("error! move has not been accepted by the server. Please refresh the page.");
      return error;
    });
  };

};

export default useUpdateGame;
