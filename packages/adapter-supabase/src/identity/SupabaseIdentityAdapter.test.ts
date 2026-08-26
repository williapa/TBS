import { describe, expect, it, vi } from "vitest";

import type { AnonymousAuthClient } from "./SupabaseIdentityAdapter";
import { SupabaseIdentityAdapter } from "./SupabaseIdentityAdapter";

const userId = "00000000-0000-0000-0000-000000000101";

describe("SupabaseIdentityAdapter", () => {
  it("restores an existing browser session without creating a user", async () => {
    const signInAnonymously = vi.fn();
    const auth: AnonymousAuthClient = {
      getSession: vi.fn().mockResolvedValue({
        data: { session: { user: { id: userId } } },
        error: null,
      }),
      signInAnonymously,
    };
    await expect(new SupabaseIdentityAdapter(auth).getIdentity()).resolves.toEqual({ userId });
    expect(signInAnonymously).not.toHaveBeenCalled();
  });

  it("creates one anonymous identity and reuses it after a simulated reload", async () => {
    let session: { user: { id: string } } | null = null;
    const signInAnonymously = vi.fn(async () => {
      session = { user: { id: userId } };
      return { data: { user: session.user, session }, error: null };
    });
    const auth: AnonymousAuthClient = {
      getSession: vi.fn(async () => ({ data: { session }, error: null })),
      signInAnonymously,
    };
    const firstPage = new SupabaseIdentityAdapter(auth);
    await expect(firstPage.getIdentity()).resolves.toEqual({ userId });
    await expect(firstPage.getIdentity()).resolves.toEqual({ userId });
    await expect(new SupabaseIdentityAdapter(auth).getIdentity()).resolves.toEqual({ userId });
    expect(signInAnonymously).toHaveBeenCalledTimes(1);
  });

  it("normalizes Auth failures and permits a later retry", async () => {
    const auth: AnonymousAuthClient = {
      getSession: vi.fn()
        .mockResolvedValueOnce({ data: { session: null }, error: { message: "offline" } })
        .mockResolvedValueOnce({ data: { session: { user: { id: userId } } }, error: null }),
      signInAnonymously: vi.fn(),
    };
    const adapter = new SupabaseIdentityAdapter(auth);
    await expect(adapter.getIdentity()).rejects.toMatchObject({
      code: "auth-unavailable",
      retryable: true,
    });
    await expect(adapter.getIdentity()).resolves.toEqual({ userId });
  });
});
