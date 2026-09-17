import type { AiOpponent } from "@TBS/application";

import { FourForestsAiClient } from "./FourForestsAiClient";

export const createFourForestsAiOpponent = (): AiOpponent => new FourForestsAiClient();
