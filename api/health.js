import { methodNotAllowed } from "../lib/http.js";

export default async function handler(req, res) {
  if (req.method !== "GET") return methodNotAllowed(res, ["GET"]);
  return res.status(200).json({ ok: true });
}
