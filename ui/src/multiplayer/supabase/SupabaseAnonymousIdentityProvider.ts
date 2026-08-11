import {
  GameSessionIdentity,
  GameSessionIdentityError,
  GameSessionIdentityProvider,
} from "../GameSessionIdentity";
import { createSupabaseBrowserClient } from "./createSupabaseBrowserClient";

type AuthUser = { id: string };
type AuthSession = { user: AuthUser };
type AuthFailure = { message: string };

export interface AnonymousAuthClient {
  getSession(): Promise<{
    data: { session: AuthSession | null };
    error: AuthFailure | null;
  }>;
  signInAnonymously(): Promise<{
    data: { user: AuthUser | null; session: AuthSession | null };
    error: AuthFailure | null;
  }>;
}

const unavailable = (operation: string, cause: unknown): GameSessionIdentityError => {
  const detail = cause instanceof Error
    ? cause.message
    : typeof cause === "object" && cause !== null && "message" in cause
      ? String((cause as AuthFailure).message)
      : String(cause);
  return new GameSessionIdentityError(`Anonymous authentication ${operation}: ${detail}`);
};

export class SupabaseAnonymousIdentityProvider implements GameSessionIdentityProvider {
  private identity?: GameSessionIdentity;
  private pending?: Promise<GameSessionIdentity>;

  constructor(private readonly auth: AnonymousAuthClient) {}

  getIdentity(): Promise<GameSessionIdentity> {
    if (this.identity) return Promise.resolve(this.identity);
    if (this.pending) return this.pending;

    this.pending = this.initialize().then((identity) => {
      this.identity = identity;
      return identity;
    }).finally(() => {
      this.pending = undefined;
    });
    return this.pending;
  }

  private async initialize(): Promise<GameSessionIdentity> {
    let existing;
    try {
      existing = await this.auth.getSession();
    } catch (error) {
      throw unavailable("could not restore the browser session", error);
    }

    if (existing.error) {
      throw unavailable("could not restore the browser session", existing.error);
    }
    if (existing.data.session?.user.id) {
      return { userId: existing.data.session.user.id };
    }

    let created;
    try {
      created = await this.auth.signInAnonymously();
    } catch (error) {
      throw unavailable("failed", error);
    }

    if (created.error) throw unavailable("failed", created.error);
    const userId = created.data.user?.id ?? created.data.session?.user.id;
    if (!userId) throw unavailable("failed", "the Auth response did not contain a user");
    return { userId };
  }
}

let defaultProvider: SupabaseAnonymousIdentityProvider | undefined;

export const getSupabaseAnonymousIdentityProvider = () => {
  if (!defaultProvider) {
    defaultProvider = new SupabaseAnonymousIdentityProvider(
      createSupabaseBrowserClient().auth
    );
  }
  return defaultProvider;
};
