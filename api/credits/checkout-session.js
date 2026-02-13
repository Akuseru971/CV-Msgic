import Stripe from "stripe";
import { getJsonBody, methodNotAllowed } from "../../lib/http.js";

const CREDIT_PACKAGES = [
  { id: "starter", credits: 5, priceVar: "STRIPE_PRICE_STARTER" },
  { id: "pro", credits: 15, priceVar: "STRIPE_PRICE_PRO" },
  { id: "growth", credits: 50, priceVar: "STRIPE_PRICE_GROWTH" },
];

export default async function handler(req, res) {
  if (req.method !== "POST") return methodNotAllowed(res, ["POST"]);

  try {
    if (!process.env.STRIPE_SECRET_KEY) {
      return res.status(500).json({ error: "Stripe non configuré" });
    }

    const body = getJsonBody(req);
    const { userId, packageId } = body;
    if (!userId || !packageId) {
      return res.status(400).json({ error: "userId et packageId requis" });
    }

    const pack = CREDIT_PACKAGES.find((entry) => entry.id === packageId);
    if (!pack) {
      return res.status(400).json({ error: "Pack invalide" });
    }

    const price = process.env[pack.priceVar];
    if (!price) {
      return res.status(500).json({ error: `${pack.priceVar} manquant` });
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    const baseUrl = process.env.APP_BASE_URL || "http://localhost:3000";

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [{ price, quantity: 1 }],
      metadata: {
        userId,
        packageId: pack.id,
        credits: String(pack.credits),
      },
      success_url: `${baseUrl}/?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/`,
    });

    return res.status(200).json({ url: session.url });
  } catch (error) {
    return res.status(500).json({ error: error.message || "Erreur Stripe" });
  }
}
