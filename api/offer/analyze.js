import { callAnthropic } from "../../lib/anthropic.js";
import { getJsonBody, methodNotAllowed } from "../../lib/http.js";

async function extractOfferFromUrl(url) {
  const response = await fetch(url, {
    headers: {
      "user-agent": "Mozilla/5.0 CVAdaptBot/1.0",
    },
  });

  if (!response.ok) {
    throw new Error("Impossible de récupérer l'URL de l'offre");
  }

  const html = await response.text();
  const withoutScript = html.replace(/<script[\s\S]*?<\/script>/gi, " ");
  const withoutStyle = withoutScript.replace(/<style[\s\S]*?<\/style>/gi, " ");
  return withoutStyle.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 5000);
}

export default async function handler(req, res) {
  if (req.method !== "POST") return methodNotAllowed(res, ["POST"]);

  try {
    const body = getJsonBody(req);
    const mode = body.mode;
    const url = body.url;
    const text = body.text;

    if (mode !== "url" && mode !== "text") {
      return res.status(400).json({ error: "mode invalide" });
    }

    let offerContent = "";
    if (mode === "url") {
      if (!url) return res.status(400).json({ error: "url requise" });
      offerContent = await extractOfferFromUrl(url);
    } else {
      if (!text) return res.status(400).json({ error: "text requis" });
      offerContent = String(text).slice(0, 5000);
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

    return res.status(200).json({
      offer: {
        ...(mode === "url" ? { url } : {}),
        text: offerContent,
        ...parsed,
      },
    });
  } catch (error) {
    return res.status(500).json({ error: error.message || "Erreur analyse offre" });
  }
}
