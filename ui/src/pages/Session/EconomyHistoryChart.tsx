import type { EconomyHistoryPoint } from "@TBS/presentation";

type EconomyMetric = "money" | "income";

const CHART_HEIGHT = 118;
const LEFT_GUTTER = 42;
const RIGHT_GUTTER = 14;
const TOP_GUTTER = 12;
const BOTTOM_GUTTER = 28;
const TURN_WIDTH = 52;

const formatAmount = (value: number): string => `$${value.toLocaleString("en-US")}`;

export const EconomyHistoryChart = ({
  color,
  metric,
  points,
}: Readonly<{
  color: "orange" | "purple";
  metric: EconomyMetric;
  points: readonly EconomyHistoryPoint[];
}>) => {
  const values = points.map(({ value }) => value);
  const firstTurn = points[0]?.turn ?? 1;
  const lastTurn = points.at(-1)?.turn ?? firstTurn;
  const turnSpan = Math.max(1, lastTurn - firstTurn);
  const plotWidth = Math.max(164, turnSpan * TURN_WIDTH);
  const width = LEFT_GUTTER + RIGHT_GUTTER + plotWidth;
  const plotHeight = CHART_HEIGHT - TOP_GUTTER - BOTTOM_GUTTER;
  const maximum = values.length > 0 ? Math.max(...values) : 0;
  const padding = Math.max(1, Math.round(maximum * 0.08));
  const lowerBound = 0;
  const upperBound = Math.max(100, Math.ceil((maximum + padding) / 100) * 100);
  const x = (turn: number): number => LEFT_GUTTER
    + ((turn - firstTurn) / turnSpan) * plotWidth;
  const y = (value: number): number => TOP_GUTTER
    + ((upperBound - value) / (upperBound - lowerBound)) * plotHeight;
  const polyline = points.map((point) => `${x(point.turn)},${y(point.value)}`).join(" ");
  const ticks = Array.from({ length: lastTurn - firstTurn + 1 }, (_, index) => firstTurn + index);
  const metricLabel = metric === "money" ? "Money" : "Income";
  const description = points.length === 0
    ? `${metricLabel} history has no available data.`
    : `${metricLabel} history from turn ${firstTurn} to turn ${lastTurn}. ${points
        .map(({ turn, value }) => `Turn ${turn}: ${formatAmount(value)}`)
        .join("; ")}.`;

  return (
    <div className="player__chart-scroll" tabIndex={0} aria-label={`${metricLabel} graph, scroll horizontally`}>
      <svg
        aria-label={description}
        className={`player__chart player__chart--${color}`}
        height="100%"
        role="img"
        viewBox={`0 0 ${width} ${CHART_HEIGHT}`}
        width={width}
      >
        <line className="player__chart-axis" x1={LEFT_GUTTER} x2={width - RIGHT_GUTTER} y1={TOP_GUTTER + plotHeight} y2={TOP_GUTTER + plotHeight} />
        <text className="player__chart-value" x={LEFT_GUTTER - 4} y={TOP_GUTTER + 4}>{formatAmount(upperBound)}</text>
        <text className="player__chart-value" x={LEFT_GUTTER - 4} y={TOP_GUTTER + plotHeight}>{formatAmount(lowerBound)}</text>
        {ticks.map((turn) => (
          <g key={turn}>
            <line className="player__chart-tick" x1={x(turn)} x2={x(turn)} y1={TOP_GUTTER + plotHeight} y2={TOP_GUTTER + plotHeight + 4} />
            <text className="player__chart-turn" x={x(turn)} y={CHART_HEIGHT - 5}>T{turn}</text>
          </g>
        ))}
        {points.length > 1 && <polyline className="player__chart-line" points={polyline} />}
        {points.map((point, index) => (
          <circle
            className="player__chart-point"
            cx={x(point.turn)}
            cy={y(point.value)}
            key={`${point.turn}:${point.value}:${index}`}
            r="2.5"
          />
        ))}
        <text className="player__chart-axis-label" x="4" y={CHART_HEIGHT - 5}>Turn</text>
      </svg>
    </div>
  );
};
