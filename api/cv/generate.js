import { callAnthropic } from "../../lib/anthropic.js";
import { getJsonBody, methodNotAllowed } from "../../lib/http.js";
import { getCredits, updateCredits } from "../../lib/store.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return methodNotAllowed(res, ["POST"]);

  try {
    const body = getJsonBody(req);
    const { userId, cvText, offer } = body;

    if (!userId || !cvText || !offer) {
      return res.status(400).json({ error: "userId, cvText et offer requis" });
    }

    const credits = await getCredits(userId);
    if (credits <= 0) {
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

    const remainingCredits = await updateCredits(userId, -1, "cv_generation", {
      offerTitle: offer.titre_poste || "",
    });

    return res.status(200).json({ result, remainingCredits });
  } catch (error) {
    return res.status(500).json({ error: error.message || "Erreur génération" });
  }
}
