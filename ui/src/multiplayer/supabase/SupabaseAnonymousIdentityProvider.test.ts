import {
  AnonymousAuthClient,
  SupabaseAnonymousIdentityProvider,
} from "./SupabaseAnonymousIdentityProvider";

const userId = "00000000-0000-0000-0000-000000000101";

describe("SupabaseAnonymousIdentityProvider", () => {
  it("restores an existing browser session without creating a new user", async () => {
    const signInAnonymously = jest.fn();
    const auth: AnonymousAuthClient = {
      getSession: jest.fn().mockResolvedValue({
        data: { session: { user: { id: userId } } },
        error: null,
      }),
      signInAnonymously,
    };

    await expect(new SupabaseAnonymousIdentityProvider(auth).getIdentity())
      .resolves.toEqual({ userId });
    expect(signInAnonymously).not.toHaveBeenCalled();
  });

  it("creates one anonymous user and reuses it after a simulated reload", async () => {
    let session: { user: { id: string } } | null = null;
    const signInAnonymously = jest.fn(async () => {
      session = { user: { id: userId } };
      return { data: { user: session.user, session }, error: null };
    });
    const auth: AnonymousAuthClient = {
      getSession: jest.fn(async () => ({ data: { session }, error: null })),
      signInAnonymously,
    };

    const firstPage = new SupabaseAnonymousIdentityProvider(auth);
    await expect(firstPage.getIdentity()).resolves.toEqual({ userId });
    await expect(firstPage.getIdentity()).resolves.toEqual({ userId });

    const reloadedPage = new SupabaseAnonymousIdentityProvider(auth);
    await expect(reloadedPage.getIdentity()).resolves.toEqual({ userId });
    expect(signInAnonymously).toHaveBeenCalledTimes(1);
  });

  it("normalizes Auth failures and permits a later retry", async () => {
    const getSession = jest.fn()
      .mockResolvedValueOnce({ data: { session: null }, error: { message: "offline" } })
      .mockResolvedValueOnce({ data: { session: { user: { id: userId } } }, error: null });
    const auth: AnonymousAuthClient = {
      getSession,
      signInAnonymously: jest.fn(),
    };
    const provider = new SupabaseAnonymousIdentityProvider(auth);

    await expect(provider.getIdentity()).rejects.toMatchObject({
      code: "auth-unavailable",
      retryable: true,
    });
    await expect(provider.getIdentity()).resolves.toEqual({ userId });
  });
});
