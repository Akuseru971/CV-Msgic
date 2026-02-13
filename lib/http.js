export function getJsonBody(req) {
  if (!req.body) return {};
  if (typeof req.body === "string") {
    try {
      return JSON.parse(req.body);
    } catch {
      return {};
    }
  }
  return req.body;
}

export function methodNotAllowed(res, methods) {
  res.setHeader("Allow", methods.join(", "));
  return res.status(405).json({ error: "Method not allowed" });
}
