import { GameEvent } from "@TBS/common";
import ReactTimeAgo from "react-time-ago";
import './EventsTable.css';
import EventCell from "./EventCell";

const EventsTable = ({ events }: { events: { Items: GameEvent[] } }) => {

  if (!events || !events.Items || events.Items.length < 1) return <p>Good luck, have fun!</p>;

  return (
    <table>
      <thead>
        <tr>
          <th>
            <b> Time </b>
          </th>
          <th>
            <b> Event </b>
          </th>
        </tr>
      </thead>
      <tbody>
        {events.Items.map((event: GameEvent, index: number) => {
          const timestamp = Number(event.id.split("#")[1]);
          return (
            <tr key={index}>
              <td>
                <ReactTimeAgo date={new Date(timestamp)} locale="en-US" timeStyle="round"/>
              </td>
              <td>
                <EventCell event={event} />
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
  
};

export default EventsTable;
