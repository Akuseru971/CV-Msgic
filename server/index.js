import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import Stripe from "stripe";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, "../data");
const STORE_PATH = path.join(DATA_DIR, "store.json");

const app = express();
app.use(cors());
app.use(express.json({ limit: "2mb" }));

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY)
  : null;

const CREDIT_PACKAGES = [
  { id: "starter", label: "Starter", credits: 5, priceVar: "STRIPE_PRICE_STARTER" },
  { id: "pro", label: "Pro", credits: 15, priceVar: "STRIPE_PRICE_PRO" },
  { id: "growth", label: "Growth", credits: 50, priceVar: "STRIPE_PRICE_GROWTH" },
];

function ensureStore() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(STORE_PATH)) {
    const initial = {
      users: {},
      usedStripeSessions: {},
      transactions: [],
    };
    fs.writeFileSync(STORE_PATH, JSON.stringify(initial, null, 2), "utf-8");
  }
}

function loadStore() {
  ensureStore();
  return JSON.parse(fs.readFileSync(STORE_PATH, "utf-8"));
}

function saveStore(store) {
  fs.writeFileSync(STORE_PATH, JSON.stringify(store, null, 2), "utf-8");
}

function getOrCreateUser(userId) {
  const store = loadStore();
  if (!store.users[userId]) {
    store.users[userId] = {
      credits: 3,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    saveStore(store);
  }
  return store.users[userId];
}

function updateCredits(userId, delta, reason, metadata = {}) {
  const store = loadStore();
  if (!store.users[userId]) {
    store.users[userId] = {
      credits: 3,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  const next = Math.max(0, (store.users[userId].credits || 0) + delta);
  store.users[userId].credits = next;
  store.users[userId].updatedAt = new Date().toISOString();
  store.transactions.push({
    id: randomUUID(),
    userId,
    delta,
    reason,
    metadata,
    createdAt: new Date().toISOString(),
  });
  saveStore(store);
  return next;
}

async function callAnthropic(messages, system, maxTokens = 2000) {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY manquant");
  }

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: process.env.ANTHROPIC_MODEL || "claude-sonnet-4-5-20250929",
      max_tokens: maxTokens,
      system,
      messages,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Erreur Anthropic: ${res.status} ${text}`);
  }

  const data = await res.json();
  return data.content?.[0]?.text || "";
}

async function extractOfferFromUrl(url) {
  const response = await fetch(url, {
    headers: {
      "user-agent": "Mozilla/5.0 CVAdaptBot/1.0",
    },
  });
  const html = await response.text();
  const withoutScript = html.replace(/<script[\s\S]*?<\/script>/gi, " ");
  const withoutStyle = withoutScript.replace(/<style[\s\S]*?<\/style>/gi, " ");
  const text = withoutStyle.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  return text.slice(0, 5000);
}

app.get("/api/health", (_, res) => {
  res.json({ ok: true });
});

app.get("/api/credits", (req, res) => {
  const userId = String(req.query.userId || "").trim();
  if (!userId) {
    return res.status(400).json({ error: "userId requis" });
  }
  const user = getOrCreateUser(userId);
  return res.json({ credits: user.credits });
});

app.post("/api/cv/analyze", async (req, res) => {
  try {
    const { cvText } = req.body;
    if (!cvText || typeof cvText !== "string") {
      return res.status(400).json({ error: "cvText requis" });
    }

    const result = await callAnthropic(
      [{ role: "user", content: `Voici le contenu du CV:\n\n${cvText.slice(0, 6000)}` }],
      `Expert RH. Analyse ce CV et retourne UNIQUEMENT un JSON valide sans markdown:
      {"nom":"","titre":"","annees_experience":0,"competences_cles":[],"experiences":[{"poste":"","entreprise":"","duree":"","points_forts":[]}],"formations":[{"diplome":"","ecole":"","annee":""}],"langues":[],"soft_skills":[],"resume_profil":""}`,
      1500
    );

    let parsed;
    try {
      parsed = JSON.parse(result.replace(/```json|```/g, "").trim());
    } catch {
      parsed = {
        nom: "Profil",
        titre: "Professionnel",
        annees_experience: 5,
        competences_cles: ["Leadership", "Gestion de projet"],
        experiences: [],
        formations: [],
        langues: ["Français"],
        soft_skills: [],
        resume_profil: "Profil extrait.",
      };
    }

    return res.json({ profile: parsed });
  } catch (error) {
    return res.status(500).json({ error: error.message || "Erreur analyse CV" });
  }
});

app.post("/api/offer/analyze", async (req, res) => {
  try {
    const { mode, url, text } = req.body;
    if (mode !== "url" && mode !== "text") {
      return res.status(400).json({ error: "mode invalide" });
    }

    let offerContent = "";
    if (mode === "url") {
      if (!url) {
        return res.status(400).json({ error: "url requise" });
      }
      offerContent = await extractOfferFromUrl(url);
    } else {
      if (!text) {
        return res.status(400).json({ error: "text requis" });
      }
      offerContent = text.slice(0, 5000);
    }

    const result = await callAnthropic(
      [{ role: "user", content: `Offre d'emploi:\n\n${offerContent}` }],
      `Analyse cette offre, retourne UNIQUEMENT un JSON valide sans markdown:
      {"titre_poste":"","entreprise":"","secteur":"","competences_requises":[],"mots_cles_ats":[],"responsabilites":[],"profil_recherche":"","niveau_experience":"","type_poste":""}`,
      1200
    );

    let parsed;
    try {
      parsed = JSON.parse(result.replace(/```json|```/g, "").trim());
    } catch {
      parsed = {
        titre_poste: "Poste",
        competences_requises: [],
        mots_cles_ats: [],
        responsabilites: [],
        secteur: "",
      };
    }

    return res.json({
      offer: {
        ...(mode === "url" ? { url } : {}),
        text: offerContent,
        ...parsed,
      },
    });
  } catch (error) {
    return res.status(500).json({ error: error.message || "Erreur analyse offre" });
  }
});

app.post("/api/cv/generate", async (req, res) => {
  try {
    const { userId, cvText, offer } = req.body;
    if (!userId || !cvText || !offer) {
      return res.status(400).json({ error: "userId, cvText et offer requis" });
    }

    const user = getOrCreateUser(userId);
    if ((user.credits || 0) <= 0) {
      return res.status(402).json({ error: "Crédits insuffisants" });
    }

    const result = await callAnthropic(
      [
        {
          role: "user",
          content: `CV:\n${cvText.slice(0, 5000)}\n\nOFFRE:\nPoste: ${offer.titre_poste}\nSecteur: ${offer.secteur}\nCompétences: ${offer.competences_requises?.join(", ")}\nMots-clés ATS: ${offer.mots_cles_ats?.join(", ")}\nProfil: ${offer.profil_recherche}`,
        },
      ],
      `Expert en optimisation CV pour systèmes ATS.

RÈGLES ABSOLUES:
1. Ne jamais inventer d'expériences, diplômes ou compétences inexistants
2. Uniquement réorganiser, reformuler et valoriser ce qui existe
3. Intégrer les mots-clés ATS naturellement dans les formulations existantes
4. Prioriser les expériences pertinentes pour ce poste
5. Verbes d'action forts, métriques existantes uniquement

Format markdown:

# [Prénom Nom]
[Titre adapté] · [Email] · [Téléphone] · [Ville]

## Profil
[2-3 phrases percutantes avec mots-clés du poste, basées sur vraies expériences]

## Compétences
**[Catégorie]:** comp1, comp2, comp3

## Expériences
### [Titre] · [Entreprise] · [Dates]
- [Réalisation concrète, verbe d'action]

## Formation
### [Diplôme] · [École] · [Année]

## Langues
[Langues et niveaux]

---
SCORE_ATS: [0-100]
POINTS_FORTS: [point1 | point2 | point3]
RECOMMANDATIONS: [conseil1 | conseil2]`,
      3000
    );

    const remainingCredits = updateCredits(userId, -1, "cv_generation", {
      offerTitle: offer.titre_poste || "",
    });

    return res.json({ result, remainingCredits });
  } catch (error) {
    return res.status(500).json({ error: error.message || "Erreur génération" });
  }
});

app.post("/api/credits/checkout-session", async (req, res) => {
  try {
    if (!stripe) {
      return res.status(500).json({ error: "Stripe non configuré" });
    }

    const { userId, packageId } = req.body;
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

    const baseUrl = process.env.APP_BASE_URL || "http://localhost:5173";

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

    return res.json({ url: session.url });
  } catch (error) {
    return res.status(500).json({ error: error.message || "Erreur Stripe" });
  }
});

app.post("/api/credits/confirm", async (req, res) => {
  try {
    if (!stripe) {
      return res.status(500).json({ error: "Stripe non configuré" });
    }

    const { userId, sessionId } = req.body;
    if (!userId || !sessionId) {
      return res.status(400).json({ error: "userId et sessionId requis" });
    }

    const store = loadStore();
    if (store.usedStripeSessions[sessionId]) {
      const user = getOrCreateUser(userId);
      return res.json({ credits: user.credits, alreadyApplied: true });
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (session.payment_status !== "paid") {
      return res.status(400).json({ error: "Paiement non validé" });
    }

    const credits = Number(session.metadata?.credits || 0);
    const metadataUserId = session.metadata?.userId;
    if (!credits || metadataUserId !== userId) {
      return res.status(400).json({ error: "Métadonnées Stripe invalides" });
    }

    const nextCredits = updateCredits(userId, credits, "stripe_checkout", {
      sessionId,
      packageId: session.metadata?.packageId,
    });

    const freshStore = loadStore();
    freshStore.usedStripeSessions[sessionId] = true;
    saveStore(freshStore);

    return res.json({ credits: nextCredits, added: credits });
  } catch (error) {
    return res.status(500).json({ error: error.message || "Erreur confirmation paiement" });
  }
});

const port = Number(process.env.PORT || 8787);
app.listen(port, () => {
  ensureStore();
  console.log(`API CVAdapt démarrée sur http://localhost:${port}`);
});
