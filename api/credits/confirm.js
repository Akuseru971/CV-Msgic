import Stripe from "stripe";
import { getJsonBody, methodNotAllowed } from "../../lib/http.js";
import { getCredits, isStripeSessionUsed, markStripeSessionUsed, updateCredits } from "../../lib/store.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return methodNotAllowed(res, ["POST"]);

  try {
    if (!process.env.STRIPE_SECRET_KEY) {
      return res.status(500).json({ error: "Stripe non configuré" });
    }

    const body = getJsonBody(req);
    const { userId, sessionId } = body;
    if (!userId || !sessionId) {
      return res.status(400).json({ error: "userId et sessionId requis" });
    }

    const alreadyUsed = await isStripeSessionUsed(sessionId);
    if (alreadyUsed) {
      const credits = await getCredits(userId);
      return res.status(200).json({ credits, alreadyApplied: true });
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.payment_status !== "paid") {
      return res.status(400).json({ error: "Paiement non validé" });
    }

    const creditsToAdd = Number(session.metadata?.credits || 0);
    const metadataUserId = session.metadata?.userId;

    if (!creditsToAdd || metadataUserId !== userId) {
      return res.status(400).json({ error: "Métadonnées Stripe invalides" });
    }

    const credits = await updateCredits(userId, creditsToAdd, "stripe_checkout", {
      sessionId,
      packageId: session.metadata?.packageId,
    });

    await markStripeSessionUsed(sessionId);

    return res.status(200).json({ credits, added: creditsToAdd });
  } catch (error) {
    return res.status(500).json({ error: error.message || "Erreur confirmation paiement" });
  }
}
