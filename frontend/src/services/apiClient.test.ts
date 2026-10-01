import { afterEach, describe, expect, it, vi } from "vitest";

const supabaseMock = vi.hoisted(() => ({
  auth: { getSession: vi.fn() },
}));

vi.mock("../lib/supabase", () => ({ supabase: supabaseMock }));

import { ApiError, apiRequest, resolveApiUrl } from "./apiClient";

describe("authenticated API client", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("sends the current Supabase access token to the backend", async () => {
    supabaseMock.auth.getSession.mockResolvedValue({
      data: { session: { access_token: "user-access-token" } },
      error: null,
    });
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(apiRequest<{ ok: boolean }>("/api/finance/workspace")).resolves.toEqual({ ok: true });
    const headers = fetchMock.mock.calls[0]?.[1]?.headers as Headers;
    expect(headers.get("Authorization")).toBe("Bearer user-access-token");
  });

  it("fails locally when there is no authenticated session", async () => {
    supabaseMock.auth.getSession.mockResolvedValue({ data: { session: null }, error: null });

    await expect(apiRequest("/api/finance/workspace")).rejects.toEqual(
      new ApiError(401, "Authentication required"),
    );
  });

  it("joins a deployed backend base URL without duplicate slashes", () => {
    expect(resolveApiUrl("/api/ocr", "https://api.example.com/")).toBe(
      "https://api.example.com/api/ocr",
    );
    expect(resolveApiUrl("/api/ocr", "")).toBe("/api/ocr");
  });
});
