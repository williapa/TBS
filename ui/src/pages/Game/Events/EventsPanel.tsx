
import { PropsWithChildren } from "react";
import useFetch from "react-fetch-hook";
import { useParams } from "react-router-dom";
import { GameEvent } from "@TBS/common";
import EventsTable from "./EventsTable";
import { useGameSocket } from "../../../hooks/gameSocketContext";

const EventsPanel = () => {

  const { id } = useParams();
  const { moves } = useGameSocket();

  const EventWrapper = ({ children }: PropsWithChildren) => (
    <div id="events" className="event panel table-container">
      { children } 
    </div>
  );

  const { isLoading, error, data } = useFetch(`http://localhost:8420/game/${id}/events`);

  if (isLoading) return <EventWrapper><p>Loading...</p></EventWrapper>;

  if (error) return <EventWrapper><p> Error: {error.message}</p></EventWrapper>;
  
  const x = data as { Items: GameEvent[] };
  const y: { Items: GameEvent[] } = {
    Items: [...moves, ...x.Items]
  };
  /*
  const serverEvents: Events = data.Items;

  const events = {
    Items: [...moves, ...serverEvents] 
  };
  */
  return (
    <EventWrapper>
      <EventsTable events={y} />
    </EventWrapper>
  );
  
};

export default EventsPanel;
