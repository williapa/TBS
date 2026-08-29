import {
  createHexMap,
  createInitialGameSetup,
  mapPlayerTeamOptions,
  mapTerrainOptions,
  mapUnitOptions,
} from "@TBS/game-setup";
import { presentBoard } from "@TBS/presentation";
import { Renderer2DBoard } from "@TBS/renderer-2d";
import Button from "@cloudscape-design/components/button";

const landingTerrains = [
  "forest", "plains", "water",
  "forest", "road", "mountain", "forest",
  "water", "plains", "plains", "road", "water",
  "mountain", "plains", "forest", "mountain",
  "water", "road", "forest",
] as const;

const requireOption = <Option extends string>(
  options: readonly Option[],
  value: string,
): Option => {
  const option = options.find((candidate) => candidate === value);
  if (!option) throw new Error(`Missing landing-page game option: ${value}`);
  return option;
};

const landingBoard = presentBoard({
  state: createInitialGameSetup(createHexMap(
    3,
    requireOption(mapTerrainOptions, "plains"),
  ).map((row) =>
    row.map((cell) => ({
      ...cell,
      terrain: requireOption(mapTerrainOptions, landingTerrains[cell.index] ?? "plains"),
      ...(cell.index === 13
        ? {
            team: requireOption(mapPlayerTeamOptions, "orange"),
            unit: requireOption(mapUnitOptions, "soldier"),
          }
        : cell.index === 5
          ? {
              team: requireOption(mapPlayerTeamOptions, "purple"),
              unit: requireOption(mapUnitOptions, "dragon"),
            }
          : {}),
    }))),
  ),
});

export const SessionLandingPage = () => (
  <main className="session-landing-page">
    <div className="session-landing-page__content">
      <div className="session-landing-page__hero">
        <h1>
          <span className="session-landing-page__medal">🎖️</span>
          {" Hostile Hexagons "}
          <span className="session-landing-page__medal">🎖️</span>
        </h1>
        <p className="session-landing-page__summary">
          Lead your legion to victory across a 6-sided grid in this turn-based strategy game!
        </p>
        <div className="session-landing-page__action">
          <Button
            variant="primary"
            href="/game/new"
          >
            🔗 Play with friends via shareable link 🔗
          </Button>
        </div>
      </div>

      <div className="session-landing-page__battlefield" aria-hidden="true">
        <div className="session-landing-page__board">
          <Renderer2DBoard
            board={landingBoard}
            interactionMode="static"
            reducedMotion
          />
        </div>
      </div>
    </div>
  </main>
);
