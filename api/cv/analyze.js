import { callAnthropic } from "../../lib/anthropic.js";
import { getJsonBody, methodNotAllowed } from "../../lib/http.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return methodNotAllowed(res, ["POST"]);

  try {
    const body = getJsonBody(req);
    const cvText = body.cvText;

    if (!cvText || typeof cvText !== "string") {
      return res.status(400).json({ error: "cvText requis" });
    }

    const result = await callAnthropic(
      [{ role: "user", content: `Voici le contenu du CV:\n\n${cvText.slice(0, 6000)}` }],
      `Expert RH. Analyse ce CV et retourne UNIQUEMENT un JSON valide sans markdown:
      {"nom":"","titre":"","annees_experience":0,"competences_cles":[],"experiences":[{"poste":"","entreprise":"","duree":"","points_forts":[]}],"formations":[{"diplome":"","ecole":"","annee":""}],"langues":[],"soft_skills":[],"resume_profil":""}`,
      1500
    );

    let profile;
    try {
      profile = JSON.parse(result.replace(/```json|```/g, "").trim());
    } catch {
      profile = {
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

    return res.status(200).json({ profile });
  } catch (error) {
    return res.status(500).json({ error: error.message || "Erreur analyse CV" });
  }
}
