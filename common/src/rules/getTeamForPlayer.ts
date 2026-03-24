import { TeamOption } from "../types";

export const getTeamForPlayer = (
  playerEmail: string,
  challengerEmail: string
): TeamOption => (playerEmail === challengerEmail ? "purple" : "orange");
