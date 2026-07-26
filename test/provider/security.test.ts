import { describe, expect, test } from "bun:test";
import { basename } from "node:path";
import type { LanguageModelV3CallOptions, LanguageModelV3StreamPart } from "@ai-sdk/provider";
import { createAdRouter } from "../../src/provider.js";
import { DEFAULT_BASE_URL, parseBaseURL, resolveConfig } from "../../src/transport/config.js";
import { MAX_TOTAL_RESPONSE_BYTES } from "../../src/transport/parse.js";

const prompt: LanguageModelV3CallOptions = {
  prompt: [{ role: "user", content: [{ type: "text", text: "hello" }] }],
};

async function collect(stream: ReadableStream<LanguageModelV3StreamPart>) {
  const result: LanguageModelV3StreamPart[] = [];
  const reader = stream.getReader();
  while (true) {
    const item = await reader.read();
    if (item.done) break;
    result.push(item.value);
  }
  reader.releaseLock();
  return result;
}

describe("transport security", () => {
  test("accepts HTTPS and loopback HTTP while rejecting unsafe URLs", () => {
    expect(parseBaseURL(DEFAULT_BASE_URL).protocol).toBe("https:");
    expect(parseBaseURL("http://localhost:8787").hostname).toBe("localhost");
    expect(parseBaseURL("http://127.0.0.1:8787").hostname).toBe("127.0.0.1");
    expect(parseBaseURL("http://[::1]:8787").hostname).toBe("[::1]");
    for (const value of [
      "http://api-staging.adrouter.co",
      "http://example.com",
      "ftp://example.com",
      "https://user:secret@example.com",
      "not-a-url",
    ]) {
      expect(() => parseBaseURL(value)).toThrow();
    }
  });

  test("forces hosted live mode and defaults workspace to its basename", () => {
    const config = resolveConfig("deepseek-v4-flash", { apiKey: "key" });
    expect(config.baseURL).toBe(DEFAULT_BASE_URL);
    expect(config.hosted).toBe(true);
    expect(config.runtimeMode).toBe("live");
    expect(config.adMode).toBe("live");
    expect(config.workspace).toBe(basename(process.cwd()));
    expect(() =>
      resolveConfig("deepseek-v4-flash", {
        apiKey: "key",
        runtimeMode: "mock",
      }),
    ).toThrow("hosted URLs only support live");
  });

  test("omits local-only execution overrides from hosted requests", async () => {
    let requestBody: Record<string, unknown> | undefined;
    const provider = createAdRouter({
      apiKey: "key",
      fetch: (async (_input, init) => {
        requestBody = JSON.parse(String(init?.body));
        return Response.json({ assistant: { content: "ok" } });
      }) as typeof fetch,
    });

    await provider.languageModel("deepseek-v4-flash").doGenerate(prompt);

    expect(requestBody?.runtime_mode).toBeUndefined();
    expect(requestBody?.tier_override).toBeUndefined();
  });

  test("protects authenticated headers and disables redirects", async () => {
    let request: RequestInit | undefined;
    const provider = createAdRouter({
      apiKey: "real-key",
      baseURL: "http://localhost:8787",
      fetch: (async (_input, init) => {
        request = init;
        return Response.json({ assistant: { content: "ok" } });
      }) as typeof fetch,
    });
    await provider.languageModel("deepseek-v4-flash").doGenerate({
      ...prompt,
      headers: {
        authorization: "Bearer attacker",
        accept: "text/plain",
        "content-type": "text/plain",
        "x-request-id": "allowed",
      },
    });
    const headers = new Headers(request?.headers);
    expect(headers.get("authorization")).toBe("Bearer real-key");
    expect(headers.get("accept")).toBe("application/x-ndjson, application/json");
    expect(headers.get("content-type")).toBe("application/json");
    expect(headers.get("x-request-id")).toBe("allowed");
    expect(request?.redirect).toBe("manual");

    const redirected = createAdRouter({
      apiKey: "key",
      baseURL: "http://localhost:8787",
      fetch: (async () =>
        new Response(null, {
          status: 302,
          headers: { location: "https://example.test" },
        })) as unknown as typeof fetch,
    }).languageModel("deepseek-v4-flash");
    await expect(redirected.doGenerate(prompt)).rejects.toThrow("must not redirect");
  });

  test("fails closed on oversized JSON and NDJSON lines", async () => {
    const oversizedJson = createAdRouter({
      apiKey: "key",
      baseURL: "http://localhost:8787",
      fetch: (async () =>
        new Response("x".repeat(MAX_TOTAL_RESPONSE_BYTES + 1), {
          headers: { "content-type": "application/json" },
        })) as unknown as typeof fetch,
    }).languageModel("deepseek-v4-flash");
    const jsonParts = await collect((await oversizedJson.doStream(prompt)).stream);
    const jsonFinish = jsonParts.find((part) => part.type === "finish");
    expect(jsonParts.some((part) => part.type === "error")).toBe(true);
    if (jsonFinish?.type !== "finish") throw new Error("missing finish");
    expect((jsonFinish.providerMetadata?.adrouter as any).ads).toEqual([]);

    const longLine = `${JSON.stringify({ type: "text", content: "x".repeat(1024 * 1024) })}\n`;
    const oversizedLine = createAdRouter({
      apiKey: "key",
      baseURL: "http://localhost:8787",
      fetch: (async () =>
        new Response(longLine, {
          headers: { "content-type": "application/x-ndjson" },
        })) as unknown as typeof fetch,
    }).languageModel("deepseek-v4-flash");
    const lineParts = await collect((await oversizedLine.doStream(prompt)).stream);
    expect(lineParts.some((part) => part.type === "error")).toBe(true);
    const lineFinish = lineParts.find((part) => part.type === "finish");
    if (lineFinish?.type !== "finish") throw new Error("missing finish");
    expect((lineFinish.providerMetadata?.adrouter as any).ads).toEqual([]);
  });

  test("caps sponsor fields and drops unsafe sponsor URLs", async () => {
    const model = createAdRouter({
      apiKey: "key",
      baseURL: "http://localhost:8787",
      fetch: (async () =>
        Response.json({
          status: "live",
          ads: [
            {
              id: "i".repeat(500),
              tier: "A",
              title: `\u001b[31m${"t".repeat(500)}`,
              body: "b".repeat(1000),
              cta: "c".repeat(200),
              label: "l".repeat(200),
              url: "http://insecure.example",
            },
          ],
          assistant: { content: "ok" },
        })) as unknown as typeof fetch,
    }).languageModel("deepseek-v4-flash");
    const result = await model.doGenerate(prompt);
    const ad = (result.providerMetadata?.adrouter as any).ads[0];
    expect(ad.id).toHaveLength(128);
    expect(ad.title).toHaveLength(120);
    expect(ad.body).toHaveLength(500);
    expect(ad.cta).toHaveLength(80);
    expect(ad.label).toHaveLength(80);
    expect(ad.url).toBeUndefined();
  });

  test("keeps caller aborts attached through streaming and clears sponsor state", async () => {
    const abort = new AbortController();
    const model = createAdRouter({
      apiKey: "key",
      baseURL: "http://localhost:8787",
      fetch: (async (_input, init) => {
        const body = new ReadableStream<Uint8Array>({
          start(controller) {
            controller.enqueue(
              new TextEncoder().encode(
                `${JSON.stringify({
                  type: "ad",
                  status: "live",
                  ads: [{ id: "ad", tier: "C", title: "Sponsor", body: "Body" }],
                })}\n`,
              ),
            );
            init?.signal?.addEventListener("abort", () => {
              controller.error(new DOMException("aborted", "AbortError"));
            });
          },
        });
        return new Response(body, { headers: { "content-type": "application/x-ndjson" } });
      }) as typeof fetch,
    }).languageModel("deepseek-v4-flash");
    const result = await model.doStream({ ...prompt, abortSignal: abort.signal });
    setTimeout(() => abort.abort(), 1);
    const output = await collect(result.stream);
    expect(output.some((part) => part.type === "error")).toBe(true);
    const finish = output.find((part) => part.type === "finish");
    if (finish?.type !== "finish") throw new Error("missing finish");
    expect((finish.providerMetadata?.adrouter as any).ads).toEqual([]);
  });
});
