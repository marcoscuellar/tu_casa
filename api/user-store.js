var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// functions-src/user-store.ts
var user_store_exports = {};
__export(user_store_exports, {
  default: () => handler,
  maxDuration: () => maxDuration
});
module.exports = __toCommonJS(user_store_exports);
var maxDuration = 15;
var KV_URL = process.env.KV_REST_API_URL;
var KV_TOKEN = process.env.KV_REST_API_TOKEN;
var kvReady = Boolean(KV_URL && KV_TOKEN);
async function kvCommand(command) {
  const res = await fetch(KV_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${KV_TOKEN}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(command)
  });
  if (!res.ok) throw new Error(`KV ${res.status}`);
  const json = await res.json();
  if (json.error) throw new Error(json.error);
  return json.result;
}
async function kvGetJson(key, fallback) {
  const raw = await kvCommand(["GET", key]);
  if (typeof raw !== "string" || raw.length === 0) return fallback;
  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}
async function kvSetJson(key, value) {
  await kvCommand(["SET", key, JSON.stringify(value)]);
}
function keyFor(kind, email) {
  return `tucasa:${kind}:${email.trim().toLowerCase()}`;
}
function cleanEmail(v) {
  return typeof v === "string" ? v.trim() : "";
}
async function handler(req, res) {
  try {
    if (!kvReady) {
      res.status(200).json({ configured: false });
      return;
    }
    if (req.method === "GET") {
      const email = cleanEmail(req.query.email);
      if (!email) {
        res.status(400).json({ error: "Missing email." });
        return;
      }
      const [applied, saved] = await Promise.all([
        kvGetJson(keyFor("applied", email), []),
        kvGetJson(keyFor("saved", email), [])
      ]);
      res.status(200).json({ configured: true, applied, saved });
      return;
    }
    if (req.method === "POST") {
      const body = req.body ?? {};
      const email = cleanEmail(body.email);
      if (!email) {
        res.status(400).json({ error: "Missing email." });
        return;
      }
      const writes = [];
      if (Array.isArray(body.applied)) {
        writes.push(kvSetJson(keyFor("applied", email), body.applied));
      }
      if (Array.isArray(body.saved)) {
        writes.push(kvSetJson(keyFor("saved", email), body.saved));
      }
      await Promise.all(writes);
      res.status(200).json({ configured: true, ok: true });
      return;
    }
    res.status(405).json({ error: "Method not allowed" });
  } catch (err) {
    console.error("user-store failed:", err);
    const message = err instanceof Error ? err.message : "Storage is temporarily unavailable.";
    res.status(500).json({ error: message });
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  maxDuration
});
