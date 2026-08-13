export type GameSessionIdentity = Readonly<{ userId: string }>;

export interface IdentityPort {
  getIdentity(): Promise<GameSessionIdentity>;
}

export class GameSessionIdentityError extends Error {
  readonly code = "auth-unavailable" as const;
  readonly retryable = true;

  constructor(message: string) {
    super(message);
    this.name = "GameSessionIdentityError";
  }
}
