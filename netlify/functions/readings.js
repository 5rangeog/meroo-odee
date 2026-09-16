import { getStore } from "@netlify/blobs";

const ALLOWED_CATS = ["meoru", "odi"];

function json(body, status) {
  return new Response(JSON.stringify(body), {
    status: status || 200,
    headers: { "content-type": "application/json; charset=utf-8" }
  });
}

export default async (req) => {
  const url = new URL(req.url);
  const cat = url.searchParams.get("cat");

  if (!cat || !ALLOWED_CATS.includes(cat)) {
    return json({ error: "invalid cat" }, 400);
  }

  const store = getStore("cat-readings");
  const key = `readings-${cat}`;

  try {
    if (req.method === "GET") {
      const data = (await store.get(key, { type: "json" })) || [];
      return json(data);
    }

    if (req.method === "POST") {
      const body = await req.json();
      const data = (await store.get(key, { type: "json" })) || [];
      const entry = {
        id: (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(16).slice(2)),
        rate: Number(body.rate),
        recordedBy: String(body.recordedBy || "가족").slice(0, 30),
        note: String(body.note || "").slice(0, 300),
        timestamp: Number(body.timestamp) || Date.now()
      };
      data.unshift(entry);
      // 최대 300개까지만 보관
      const trimmed = data.slice(0, 300);
      await store.setJSON(key, trimmed);
      return json(entry, 201);
    }

    if (req.method === "DELETE") {
      const id = url.searchParams.get("id");
      if (!id) return json({ error: "id required" }, 400);
      let data = (await store.get(key, { type: "json" })) || [];
      data = data.filter((d) => d.id !== id);
      await store.setJSON(key, data);
      return json({ ok: true });
    }

    return json({ error: "method not allowed" }, 405);
  } catch (err) {
    return json({ error: String(err && err.message ? err.message : err) }, 500);
  }
};

export const config = { path: "/api/readings" };
