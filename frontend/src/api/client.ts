export type FieldErrors = Record<string, string[]>;

export class ApiError extends Error {
  status: number;
  fieldErrors: FieldErrors;

  constructor(status: number, message: string, fieldErrors: FieldErrors = {}) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.fieldErrors = fieldErrors;
  }
}

type Options = {
  method?: "GET" | "POST";
  body?: unknown;
};

function readCookie(name: string): string | undefined {
  const match = document.cookie.split("; ").find((part) => part.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.slice(name.length + 1)) : undefined;
}

function errorFromBody(status: number, body: unknown): ApiError {
  if (body && typeof body === "object") {
    const data = body as Record<string, unknown>;
    if (typeof data.detail === "string") {
      return new ApiError(status, data.detail);
    }
    const fieldErrors: FieldErrors = {};
    for (const [field, value] of Object.entries(data)) {
      fieldErrors[field] = Array.isArray(value) ? value.map(String) : [String(value)];
    }
    const message = Object.values(fieldErrors).flat().join(" ");
    if (message) {
      return new ApiError(status, message, fieldErrors);
    }
  }
  return new ApiError(status, "Something went wrong. Please try again.");
}

export async function apiFetch<T>(path: string, options: Options = {}): Promise<T> {
  const method = options.method ?? "GET";
  const headers: Record<string, string> = { Accept: "application/json" };
  if (options.body !== undefined) {
    headers["Content-Type"] = "application/json";
  }
  if (method !== "GET") {
    const token = readCookie("csrftoken");
    if (token) headers["X-CSRFToken"] = token;
  }

  let response: Response;
  try {
    response = await fetch(`/api${path}`, {
      method,
      headers,
      credentials: "same-origin",
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    });
  } catch {
    throw new ApiError(0, "Could not reach the server. Check your connection and try again.");
  }

  if (response.status === 204) {
    return undefined as T;
  }
  const body = await response.json().catch(() => undefined);
  if (!response.ok) {
    throw errorFromBody(response.status, body);
  }
  return body as T;
}
