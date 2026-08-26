import Button from "@cloudscape-design/components/button";

export const SessionLandingPage = () => (
  <main className="session-landing-page">
    <div className="session-landing-page__content">
      <hr />
      <hr />
      <h1>🎖️ Hostile Hexagons 🎖️</h1>
      <p className="session-landing-page__summary">
        Lead your legion to victory across a 6-sided grid in this turn-based strategy game!
      </p>
      <div style={{ margin: "auto" }}>
        <Button
          variant="link"
          href="/game/new"
        >
          🔗 Play with friends via shareable link 🔗
        </Button>
      </div>
      <hr />
      <hr />
    </div>
  </main>
);
