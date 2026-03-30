import { useState } from "react";
import { useGameSocket } from "../../hooks/gameSocketContext";
import useUser from "../../hooks/useUser";
import { Textarea } from "@cloudscape-design/components";
import './PlayerDetails.css';

type PlayerDetailsMap = {
  activeTurn: boolean;
  color: "orange" | "purple";
  email: string;
  income: number;
  money: number;
};

const PlayerDetails = ({ activeTurn, color, email, income, money }: PlayerDetailsMap) => {
  const [comment, setComment] = useState("");
  const { sendMove, turn } = useGameSocket();
  const { user, pin } = useUser();
  const flip = color === "orange" ? "&flip=true" : "";
  const currentActiveTurn = (turn.length > 0 && turn !== "gameOver") ? (turn === email) : activeTurn;
  const endTurn = () => {
    sendMove({
      action: "end",
    }, email, pin);
  };

  return (
    <div className="player panel" style={{ outline: currentActiveTurn ? "4px solid white": "1px solid #bbb", outlineOffset: currentActiveTurn ? "-4px" : "-1px" }}>
      <div style={{  background: color }}>
        <p> { email } { currentActiveTurn && (<span>(acting)</span>)} </p>
        <img
          src={`https://api.dicebear.com/5.x/adventurer/svg?seed=${email}${flip}`}
          alt="avatar"
        />
      </div>
      <div 
        className="actions"
        style={{ 
          display: (currentActiveTurn && user === email? "flex" : "none"),
          marginLeft: "5px",
          marginRight: "5px"
        }}
      >
        <button className="button" onClick={endTurn}>
          End Turn
        </button>
        <Textarea value={comment} onChange={({detail}) => setComment(detail.value)} />
        <button className="button">
          Comment
        </button>
      </div>
      <div>
        <p>
          <b> Money: </b> 
          <span> {money} </span>
        </p>
        <p>
          <b> Income/turn: </b>
          <span> {income} </span>
        </p>
      </div>
    </div>
  );
};
 
export default PlayerDetails;
