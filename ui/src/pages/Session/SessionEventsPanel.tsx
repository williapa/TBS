import type { StandardAppliedAction } from "@TBS/application";
import "./SessionEventsPanel.css";
import { formatDomainEvent } from "./formatDomainEvent";

const MAX_DISPLAYED_EVENTS = 100;

type DisplayedEvent = Readonly<{
  action: StandardAppliedAction;
  event: StandardAppliedAction["events"][number];
  index: number;
  sequence: string;
}>;

export const getDisplayedEvents = (
  actions: readonly StandardAppliedAction[],
): readonly DisplayedEvent[] => {
  let turn = 1;
  let actionInTurn = 0;
  const events: DisplayedEvent[] = [];

  for (const action of actions) {
    action.events.forEach((event, index) => {
      actionInTurn += 1;
      events.push({ action, event, index, sequence: `${turn}.${actionInTurn}` });
      if (event.type === "turn-ended") {
        turn += 1;
        actionInTurn = 0;
      }
    });
  }

  return events.slice(-MAX_DISPLAYED_EVENTS).reverse();
};

export const SessionEventsPanel = ({ actions }: { actions: readonly StandardAppliedAction[] }) => {
  const events = getDisplayedEvents(actions);

  return (
    <section id="events" className="event panel table-container" aria-labelledby="session-events-title">
      <h2 id="session-events-title">Events</h2>
      {events.length === 0 ? <p>No actions yet.</p> : (
        <table>
          <colgroup><col className="events-table__revision" /><col /></colgroup>
          <thead><tr><th>Action</th><th>Event</th></tr></thead>
          <tbody>
            {events.map(({ action, event, index, sequence }) => (
              <tr key={`${action.actionId}:${index}`} data-action-id={action.actionId} data-revision={action.revision}>
                <td>{sequence}</td>
                <td>{formatDomainEvent(event)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
};
