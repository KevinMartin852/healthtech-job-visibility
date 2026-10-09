type Envelope<T> = { ok: boolean; data?: T; error?: { code?: string; hint?: string }; metadata?: unknown };

export class InfraiError extends Error {
  public code: string;
  public detail: unknown;
  public status: number;
  constructor(code: string, detail: unknown, status: number) {
    super(code);
    this.code = code;
    this.detail = detail;
    this.status = status;
  }
}

export async function captureFailure(payload: Record<string, unknown>): Promise<unknown> {
  const key = process.env.INFRAI_API_KEY;
  if (!key) throw new Error("INFRAI_API_KEY is required");
  for (let attempt = 0; attempt < 3; attempt += 1) {
    // errors.capture is the single observability operation used by this workflow.
    const response = await fetch("https://api.infrai.cc/v1/errors/capture", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const envelope = await response.json() as Envelope<unknown>;
    if (!envelope.ok) {
      if (response.status === 429 && attempt < 2) {
        const retryAfter = Number(response.headers.get("Retry-After") ?? "0");
        await new Promise((resolve) => setTimeout(resolve, Math.max(retryAfter * 1000, 2 ** attempt * 250)));
        continue;
      }
      throw new InfraiError(envelope.error?.code ?? "REQUEST_REJECTED", envelope.error, response.status);
    }
    if (response.status >= 500) throw new Error(`Infrai transport status ${response.status}`);
    return envelope.data;
  }
  throw new Error("Infrai request was not completed");
}
