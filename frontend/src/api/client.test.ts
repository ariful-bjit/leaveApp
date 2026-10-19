import { ApiError, apiFetch } from "./client";

function mockFetch(status: number, body?: unknown) {
  const response = new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
  return vi.spyOn(globalThis, "fetch").mockResolvedValue(response);
}

describe("apiFetch", () => {
  it("prefixes /api and returns parsed JSON", async () => {
    const fetchMock = mockFetch(200, { ok: true });
    await expect(apiFetch("/auth/me")).resolves.toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/auth/me",
      expect.objectContaining({ method: "GET", credentials: "same-origin" }),
    );
  });

  it("sends JSON body and CSRF token on POST", async () => {
    document.cookie = "csrftoken=abc123";
    const fetchMock = mockFetch(201, { id: 1 });
    await apiFetch("/requests", { method: "POST", body: { reason: "x" } });
    const init = fetchMock.mock.calls[0][1] as RequestInit;
    const headers = init.headers as Record<string, string>;
    expect(headers["X-CSRFToken"]).toBe("abc123");
    expect(headers["Content-Type"]).toBe("application/json");
    expect(init.body).toBe(JSON.stringify({ reason: "x" }));
  });

  it("does not send a CSRF token on GET", async () => {
    document.cookie = "csrftoken=abc123";
    const fetchMock = mockFetch(200, {});
    await apiFetch("/balance");
    const headers = (fetchMock.mock.calls[0][1] as RequestInit).headers as Record<string, string>;
    expect(headers["X-CSRFToken"]).toBeUndefined();
  });

  it("returns undefined for 204", async () => {
    mockFetch(204);
    await expect(apiFetch("/auth/logout", { method: "POST" })).resolves.toBeUndefined();
  });

  it("throws ApiError with detail", async () => {
    mockFetch(409, { detail: "This request has already been decided." });
    const error = (await apiFetch("/requests/1/cancel", { method: "POST" }).catch((e: unknown) => e)) as ApiError;
    expect(error).toBeInstanceOf(ApiError);
    expect(error.status).toBe(409);
    expect(error.message).toBe("This request has already been decided.");
  });

  it("throws ApiError with field errors and a combined message", async () => {
    mockFetch(400, { end_date: ["End date must be on or after the start date."] });
    const error = (await apiFetch("/requests", { method: "POST", body: {} }).catch((e: unknown) => e)) as ApiError;
    expect(error.status).toBe(400);
    expect(error.fieldErrors).toEqual({ end_date: ["End date must be on or after the start date."] });
    expect(error.message).toBe("End date must be on or after the start date.");
  });

  it("throws a friendly ApiError on network failure", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new TypeError("Failed to fetch"));
    const error = (await apiFetch("/balance").catch((e: unknown) => e)) as ApiError;
    expect(error).toBeInstanceOf(ApiError);
    expect(error.status).toBe(0);
    expect(error.message).toMatch(/could not reach the server/i);
  });
});
