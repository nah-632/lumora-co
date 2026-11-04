import type { resolveProvider } from "./gateway";
import type { TextGenerator } from "./generate";
import { ProviderError, classifyResponseBody } from "./provider-errors";

/**
 * Adapts the SDK model handle to the narrow `TextGenerator` interface.
 *
 * The gateway has already resolved and validated the provider by this point, so
 * the model handle is passed in rather than re-resolved per call.
 *
 * WHY THIS IS NOT A ONE-LINE WRAPPER: OpenAI-compatible routers do not all report
 * failures honestly. Hugging Face's router answers an exhausted account or an
 * unroutable model with an **error body on an HTTP 200**, and the SDK turns that
 * into the opaque `Invalid JSON response`. That message points at the prompt when
 * the real cause is the account. So two guards are applied, in order:
 *
 *   1. A raw `fetch` is used instead of `generateText`. That is the only way to
 *      see the response body before the SDK decides it is unparseable.
 *   2. Every body is classified BEFORE being read as a completion — with
 *      classifyResponseBody — and a refusal is thrown as a ProviderError carrying
 *      an exact code.
 *
 * Uses a hand-rolled request rather than `generateObject` for the same reason the
 * pipeline validates its own output: structured-output mode is not supported
 * across every model this router serves, so JSON is requested in the prompt and
 * validated by the registry schema.
 */
export function httpGenerator(
  provider: NonNullable<ReturnType<typeof resolveProvider>>,
): TextGenerator {
  return {
    async generate({ system, user, maxOutputTokens }) {
      const endpoint = `${provider.baseURL.replace(/\/+$/, "")}/chat/completions`;

      let response: Response;
      try {
        response = await fetch(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${provider.apiKey}`,
          },
          body: JSON.stringify({
            model: provider.modelId,
            messages: [
              { role: "system", content: system },
              { role: "user", content: user },
            ],
            max_tokens: maxOutputTokens,
            temperature: 0.4,
            // Asks the provider to emit a single JSON object rather than prose.
            // It guarantees "an object", NOT this project's schema, so the exact
            // field names are stated in the prompt as well — see shapeInstruction
            // in the tool registry. Both are needed: this makes JSON likely, the
            // prompt makes the RIGHT JSON likely, and the zod parse decides.
            response_format: { type: "json_object" },
          }),
          // A generation can legitimately take a while on a busy provider, but
          // not forever. Without this a hung request holds a slot and the
          // teacher waits with no way to tell the difference from slow work.
          //
          // 55 s, not 90: see `maxDuration` above. The platform kills the
          // function at 60 s, so an abort that never fires first would turn our
          // clean `provider_unavailable` into an opaque 504.
          signal: AbortSignal.timeout(55_000),
        });
      } catch {
        // A transport failure. No body to inspect, so it is a generic outage.
        throw new ProviderError("provider_bad_response");
      }

      const rawBody = await response.text().catch(() => "");

      // The refusal check runs FIRST, and independently of the status code,
      // because a 200 with an error body is exactly the case that misleads.
      const refusal = classifyResponseBody(rawBody, response.status);
      if (refusal) {
        throw new ProviderError(refusal, response.status);
      }

      if (!response.ok) {
        throw new ProviderError("provider_bad_response", response.status);
      }

      let body: unknown;
      try {
        body = JSON.parse(rawBody);
      } catch {
        throw new ProviderError("provider_bad_response", response.status);
      }

      const choice = (body as { choices?: Array<{ message?: { content?: unknown } }> }).choices?.[0];
      const content = choice?.message?.content;
      if (typeof content !== "string" || content.trim() === "") {
        // A completion with no text is not usable, and not a schema problem.
        throw new ProviderError("provider_bad_response", response.status);
      }

      const finishReason = (choice as { finish_reason?: string } | undefined)?.finish_reason;
      return { text: content, truncated: finishReason === "length" };
    },
  };
}
