interface Env {
  R2_BUCKET: R2Bucket;
  API_URL: string;
  WORKER_API_KEY: string;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const segments = url.pathname.split("/").filter(Boolean);

    if (segments.length < 2) {
      return jsonError(
        "Invalid URL. Use /{userId}/{imageFile}?w=400&fmt=webp",
        400,
      );
    }

    const [userId, imageFile] = segments;
    const imageId = imageFile.replace(/\.[^.]+$/, '');
    const params = Object.fromEntries(url.searchParams);
    const requestId = crypto.randomUUID();

    //if transform params exist, check r2 cache for transformed version
    if (Object.keys(params).length > 0) {
      const paramsHash = await hashParams(params);
      const cacheKey = `transformed/${userId}/${paramsHash}/${imageFile}`;
      //r2 cache check (at edge ~5ms )
      const cached = await env.R2_BUCKET.get(cacheKey);
      if (cached) {
        return new Response(cached.body, {
          headers: {
            "Content-Type": cached.httpMetadata?.contentType || "image/jpeg",
            "Cache-Control": "public, max-age=2592000",
            "X-Request-Id": requestId,
            "X-Cache": "HIT",
          },
        });
      }

      //cache miss -> call origin express api endpoint
      try {
        const apiRes = await fetch(`${env.API_URL}/api/v1/transform`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Request-Id": requestId,
            "Authorization": `Bearer ${env.WORKER_API_KEY}`,
          },
          body: JSON.stringify({
            image_id: imageId,
            ...params,
          }),
        });

        if (!apiRes.ok) {
          const err = (await apiRes.json()) as any;
          return jsonError(
            err.error || "Transform failed",
            apiRes.status,
            requestId,
          );
        }

        // Fetch transformed image from R2 and serve
        const transformed = await env.R2_BUCKET.get(cacheKey);
        if (transformed) {
          return new Response(transformed.body, {
            headers: {
              "Content-Type":
                transformed.httpMetadata?.contentType || "image/jpeg",
              "Cache-Control": "public, max-age=2592000",
              "X-Request-Id": requestId,
              "X-Cache": "MISS",
            },
          });
        }
      } catch (error) {
        return jsonError("Origin unavailable", 502, requestId);
      }
    }

    //no params - serve original
    const original = await env.R2_BUCKET.get(
      `originals/${userId}/${imageFile}`,
    );
    if (!original) return jsonError("Image not found", 404, requestId);

    return new Response(original.body, {
      headers: {
        "Content-Type": original.httpMetadata?.contentType || "image/jpeg",
        "Cache-Control": "public, max-age=2592000",
        "X-Request-Id": requestId,
      },
    });
  },
};

async function hashParams(params: Record<string, string>): Promise<string> {
  const sorted = Object.keys(params)
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join("&");
  const data = new TextEncoder().encode(sorted);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, 16);
}

function jsonError(
  message: string,
  status: number,
  requestId?: string,
): Response {
  return new Response(
    JSON.stringify({ error: message, request_id: requestId }),
    {
      status,
      headers: { "Content-Type": "application/json" },
    },
  );
}
