import { methodNotAllowed } from "../lib/http.js";
import { getCredits } from "../lib/store.js";

export default async function handler(req, res) {
  if (req.method !== "GET") return methodNotAllowed(res, ["GET"]);

  const userId = String(req.query.userId || "").trim();
  if (!userId) {
    return res.status(400).json({ error: "userId requis" });
  }

  const credits = await getCredits(userId);
  return res.status(200).json({ credits });
}
