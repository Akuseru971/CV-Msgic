# CV-Msgic

SaaS frontend React pour générer un CV adaptatif à partir d'un CV de base + une offre d'emploi, avec UI premium épurée, score ATS et système de crédits.

## Stack

- Frontend: React + Vite
- Backend: Node.js + Express
- Paiement: Stripe Checkout
- Persistance crédits: fichier local `data/store.json`

## Configuration

1. Copier l'exemple d'environnement:

```bash
cp .env.example .env
```

2. Compléter au minimum:

- `ANTHROPIC_API_KEY`
- `STRIPE_SECRET_KEY`
- `STRIPE_PRICE_STARTER`
- `STRIPE_PRICE_PRO`
- `STRIPE_PRICE_GROWTH`

Sans ces variables, le frontend fonctionne, mais l'analyse IA et/ou le checkout seront bloqués.

## Lancer le SaaS

1. Installer les dépendances :

```bash
npm install
```

2. Démarrer en local :

```bash
npm run dev
```

Cela démarre:
- client sur `http://localhost:5173`
- API sur `http://localhost:8787`

3. Build de production :

```bash
npm run build
```

## Fonctionnalités incluses

- Upload CV (PDF/DOCX/TXT)
- Analyse IA du CV via backend sécurisé (profil, compétences, expériences)
- Analyse IA de l'offre (URL ou texte)
- Génération d'un CV ATS-friendly sans inventer d'information
- Score ATS + insights
- Système de crédits persistant par utilisateur local
- Recharge via Stripe Checkout (session + confirmation)

## Routes API principales

- `GET /api/credits?userId=...`
- `POST /api/cv/analyze`
- `POST /api/offer/analyze`
- `POST /api/cv/generate`
- `POST /api/credits/checkout-session`
- `POST /api/credits/confirm`

## Notes prod

- Le backend appelle Anthropic côté serveur (clé jamais exposée au navigateur).
- Pour une prod complète, ajoute une vraie authentification (GitHub OAuth/session) et remplace le `userId` local par l'utilisateur authentifié.