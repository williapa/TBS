import type { AppliedAction } from "@TBS/common";
import "./SessionEventsPanel.css";
import { formatDomainEvent } from "./formatDomainEvent";

const MAX_DISPLAYED_EVENTS = 100;

export const SessionEventsPanel = ({ actions }: { actions: readonly AppliedAction[] }) => {
  const events = actions
    .flatMap((action) => action.events.map((event, index) => ({ action, event, index })))
    .slice(-MAX_DISPLAYED_EVENTS);

  return (
    <section id="events" className="event panel table-container" aria-labelledby="session-events-title">
      <h2 id="session-events-title">Events</h2>
      {events.length === 0 ? <p>No actions yet.</p> : (
        <table>
          <colgroup><col className="events-table__revision" /><col /></colgroup>
          <thead><tr><th>Turn</th><th>Event</th></tr></thead>
          <tbody>
            {events.map(({ action, event, index }) => (
              <tr key={`${action.actionId}:${index}`} data-action-id={action.actionId} data-revision={action.revision}>
                <td>{action.revision}</td>
                <td>{formatDomainEvent(event)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
};
