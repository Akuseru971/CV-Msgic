import { useEffect, useRef, useState } from "react";

// ─── CONFIG ───────────────────────────────────────────────────────────────────
const CREDIT_PACKAGES = [
  { id: "starter", label: "Starter", credits: 5, price: "4,90 €", unit: "0,98 € / CV" },
  { id: "pro", label: "Pro", credits: 15, price: "9,90 €", unit: "0,66 € / CV", popular: true },
  { id: "growth", label: "Growth", credits: 50, price: "24,90 €", unit: "0,50 € / CV" },
];

const STEPS = ["upload", "analyze", "offer", "generate", "result"];
const STEP_LABELS = { upload: "Import", analyze: "Analyse", offer: "Offre", generate: "Génération", result: "Résultat" };

// ─── API ──────────────────────────────────────────────────────────────────────
async function apiPost(path, payload) {
  const res = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Erreur API");
  return data;
}

function getUserId() {
  const key = "cvadapt_user_id";
  const existing = localStorage.getItem(key);
  if (existing) return existing;
  const created = `usr_${crypto.randomUUID()}`;
  localStorage.setItem(key, created);
  return created;
}

function readFileAsText(file) {
  return new Promise((res) => {
    const r = new FileReader();
    r.onload = (e) => res(e.target.result);
    r.readAsText(file);
  });
}

// ─── ICONS ────────────────────────────────────────────────────────────────────
const Icon = {
  upload: () => (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M10 13V4M10 4L6 8M10 4l4 4" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M3 14v1.5A1.5 1.5 0 004.5 17h11a1.5 1.5 0 001.5-1.5V14" strokeLinecap="round"/>
    </svg>
  ),
  bolt: () => (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M8 1.5L2 8.5h5L6 12.5l6-7H7L8 1.5z" strokeLinejoin="round"/>
    </svg>
  ),
  link: () => (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M5.5 8.5a3 3 0 004.243 0l1.5-1.5a3 3 0 00-4.243-4.243L6.25 4" strokeLinecap="round"/>
      <path d="M8.5 5.5a3 3 0 00-4.243 0l-1.5 1.5a3 3 0 004.243 4.243L7.75 10" strokeLinecap="round"/>
    </svg>
  ),
  file: () => (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M3 2h5.5L11 4.5V12H3V2z" strokeLinejoin="round"/>
      <path d="M8.5 2v2.5H11" strokeLinejoin="round"/>
      <path d="M5 7h4M5 9.5h3" strokeLinecap="round"/>
    </svg>
  ),
  check: () => (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M2.5 7.5l3 3 6-6" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  close: () => (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M4 4l8 8M12 4l-8 8" strokeLinecap="round"/>
    </svg>
  ),
  copy: () => (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="5" y="5" width="7" height="7" rx="1"/>
      <path d="M9 5V3a1 1 0 00-1-1H3a1 1 0 00-1 1v5a1 1 0 001 1h2" strokeLinecap="round"/>
    </svg>
  ),
  download: () => (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M7 2v7M7 9l-3-3M7 9l3-3" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M2 11h10" strokeLinecap="round"/>
    </svg>
  ),
  arrow: () => (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M2.5 7h9M8 3.5L11.5 7 8 10.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  back: () => (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M11.5 7h-9M6 3.5L2.5 7 6 10.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  sparkle: () => (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M8 1v2M8 13v2M1 8h2M13 8h2M3.2 3.2l1.4 1.4M11.4 11.4l1.4 1.4M3.2 12.8l1.4-1.4M11.4 4.6l1.4-1.4"/>
      <circle cx="8" cy="8" r="2.5"/>
    </svg>
  ),
};

// ─── STEP INDICATOR ───────────────────────────────────────────────────────────
function StepIndicator({ current }) {
  const idx = STEPS.indexOf(current);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "0", padding: "0 32px" }}>
      {STEPS.slice(0, -1).map((s, i) => {
        const done = i < idx;
        const active = i === idx;
        return (
          <div key={s} style={{ display: "flex", alignItems: "center", flex: i < STEPS.length - 2 ? 1 : "none" }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "6px" }}>
              <div style={{
                width: "24px", height: "24px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
                background: done ? "rgba(255,255,255,0.9)" : active ? "rgba(255,255,255,0.1)" : "transparent",
                border: `1px solid ${done ? "rgba(255,255,255,0.9)" : active ? "rgba(255,255,255,0.3)" : "rgba(255,255,255,0.1)"}`,
                transition: "all 0.4s ease",
              }}>
                {done
                  ? <span style={{ color: "#07060f" }}><Icon.check /></span>
                  : <span style={{ width: "5px", height: "5px", borderRadius: "50%", background: active ? "rgba(255,255,255,0.7)" : "rgba(255,255,255,0.15)", display: "block" }} />
                }
              </div>
              <span style={{ fontSize: "10px", letterSpacing: "0.08em", textTransform: "uppercase", color: active ? "rgba(255,255,255,0.6)" : done ? "rgba(255,255,255,0.3)" : "rgba(255,255,255,0.15)", fontFamily: "'Instrument Sans', sans-serif", fontWeight: 500, whiteSpace: "nowrap" }}>
                {STEP_LABELS[s]}
              </span>
            </div>
            {i < STEPS.length - 2 && (
              <div style={{ flex: 1, height: "1px", background: done ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.06)", margin: "0 10px", marginBottom: "22px", transition: "background 0.4s ease" }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── SHARED COMPONENTS ────────────────────────────────────────────────────────
function Label({ children }) {
  return <div style={{ fontSize: "10px", letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(255,255,255,0.2)", marginBottom: "10px", fontFamily: "'Instrument Sans', sans-serif" }}>{children}</div>;
}
function Title({ children }) {
  return <h2 style={{ fontSize: "26px", fontWeight: 400, color: "rgba(255,255,255,0.85)", fontFamily: "'Instrument Serif', serif", margin: "0 0 8px", letterSpacing: "-0.02em" }}>{children}</h2>;
}
function Subtitle({ children }) {
  return <p style={{ color: "rgba(255,255,255,0.28)", fontSize: "14px", margin: "0 0 28px", lineHeight: 1.6, fontFamily: "'Instrument Sans', sans-serif" }}>{children}</p>;
}
function PrimaryButton({ children, onClick, disabled }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      width: "100%", padding: "13px 20px", borderRadius: "8px",
      background: disabled ? "transparent" : "rgba(255,255,255,0.07)",
      border: `1px solid ${disabled ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.11)"}`,
      color: disabled ? "rgba(255,255,255,0.18)" : "rgba(255,255,255,0.7)",
      fontSize: "13px", fontFamily: "'Instrument Sans', sans-serif", fontWeight: 500,
      cursor: disabled ? "not-allowed" : "pointer", letterSpacing: "0.03em",
      display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
      transition: "all 0.2s",
    }}>
      {children}
    </button>
  );
}
function LoadingState({ label, sub }) {
  return (
    <div style={{ textAlign: "center", padding: "60px 0" }}>
      <div style={{ display: "flex", gap: "6px", justifyContent: "center", marginBottom: "28px" }}>
        {[0, 1, 2].map(i => (
          <div key={i} style={{ width: "3px", height: "3px", borderRadius: "50%", background: "rgba(255,255,255,0.4)", animation: `blink 1.4s ease ${i * 0.25}s infinite` }} />
        ))}
      </div>
      <div style={{ color: "rgba(255,255,255,0.55)", fontSize: "16px", fontWeight: 400, fontFamily: "'Instrument Serif', serif", marginBottom: "6px" }}>{label}</div>
      <div style={{ color: "rgba(255,255,255,0.18)", fontSize: "12px", fontFamily: "'Instrument Sans', sans-serif", letterSpacing: "0.05em" }}>{sub}</div>
    </div>
  );
}

// ─── UPLOAD STEP ─────────────────────────────────────────────────────────────
function UploadStep({ onUpload }) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef();

  const handleFile = async (file) => {
    if (!file) return;
    const text = await readFileAsText(file);
    onUpload(file.name, text);
  };

  return (
    <div style={{ animation: "fadeUp 0.5s ease" }}>
      <Label>Import du CV</Label>
      <Title>Votre document de base</Title>
      <Subtitle>Nous analysons la structure sans altérer votre contenu</Subtitle>

      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); handleFile(e.dataTransfer.files[0]); }}
        onClick={() => inputRef.current?.click()}
        style={{
          border: `1px dashed ${dragging ? "rgba(255,255,255,0.25)" : "rgba(255,255,255,0.09)"}`,
          borderRadius: "10px", padding: "52px 40px", cursor: "pointer",
          background: dragging ? "rgba(255,255,255,0.02)" : "transparent",
          textAlign: "center", transition: "all 0.2s ease", marginBottom: "20px",
        }}
      >
        <div style={{ width: "36px", height: "36px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.1)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 18px", color: "rgba(255,255,255,0.3)" }}>
          <Icon.upload />
        </div>
        <p style={{ color: "rgba(255,255,255,0.45)", fontSize: "13px", fontWeight: 500, marginBottom: "6px", fontFamily: "'Instrument Sans', sans-serif" }}>
          Glisser-déposer ou{" "}
          <span style={{ color: "rgba(255,255,255,0.65)", borderBottom: "1px solid rgba(255,255,255,0.2)" }}>parcourir</span>
        </p>
        <p style={{ color: "rgba(255,255,255,0.18)", fontSize: "11px", letterSpacing: "0.05em", fontFamily: "'Instrument Sans', sans-serif" }}>
          PDF · DOCX · TXT
        </p>
        <input ref={inputRef} type="file" accept=".pdf,.docx,.txt,.doc" style={{ display: "none" }}
          onChange={(e) => handleFile(e.target.files[0])} />
      </div>

      <div style={{ display: "flex", gap: "8px" }}>
        {["Non stocké", "Confidentiel", "ATS-ready"].map((t) => (
          <span key={t} style={{ fontSize: "10px", color: "rgba(255,255,255,0.2)", letterSpacing: "0.06em", padding: "4px 10px", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "4px", fontFamily: "'Instrument Sans', sans-serif" }}>{t}</span>
        ))}
      </div>
    </div>
  );
}

// ─── ANALYZE STEP ─────────────────────────────────────────────────────────────
function AnalyzeStep({ cvText, cvName, onAnalyzed }) {
  const [analyzing, setAnalyzing] = useState(false);
  const [profile, setProfile] = useState(null);

  const analyze = async () => {
    setAnalyzing(true);
    try {
      const data = await apiPost("/api/cv/analyze", { cvText });
      setProfile(data.profile);
    } catch {
      setProfile({ nom: "Profil", titre: "Professionnel", annees_experience: 5, competences_cles: ["Leadership", "Gestion de projet"], experiences: [], formations: [], langues: ["Français"], soft_skills: [], resume_profil: "Profil extrait." });
    }
    setAnalyzing(false);
  };

  if (analyzing) return <LoadingState label="Extraction du profil" sub="Compétences · Expériences · Formations" />;

  if (profile) return (
    <div style={{ animation: "fadeUp 0.5s ease" }}>
      <Label>Profil extrait</Label>
      <Title>{profile.nom}</Title>
      <Subtitle>{profile.resume_profil}</Subtitle>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1px", background: "rgba(255,255,255,0.05)", borderRadius: "8px", overflow: "hidden", marginBottom: "20px" }}>
        {[["Titre actuel", profile.titre], ["Expérience", `${profile.annees_experience} ans`]].map(([l, v]) => (
          <div key={l} style={{ background: "#07060f", padding: "14px 16px" }}>
            <div style={{ fontSize: "10px", letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(255,255,255,0.2)", marginBottom: "6px", fontFamily: "'Instrument Sans', sans-serif" }}>{l}</div>
            <div style={{ color: "rgba(255,255,255,0.7)", fontSize: "13px", fontWeight: 500, fontFamily: "'Instrument Sans', sans-serif" }}>{v}</div>
          </div>
        ))}
      </div>

      <div style={{ marginBottom: "28px" }}>
        <div style={{ fontSize: "10px", letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(255,255,255,0.2)", marginBottom: "12px", fontFamily: "'Instrument Sans', sans-serif" }}>Compétences détectées</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
          {profile.competences_cles?.map((c) => (
            <span key={c} style={{ padding: "5px 11px", borderRadius: "4px", fontSize: "11px", background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.45)", border: "1px solid rgba(255,255,255,0.07)", letterSpacing: "0.02em", fontFamily: "'Instrument Sans', sans-serif" }}>{c}</span>
          ))}
        </div>
      </div>

      <PrimaryButton onClick={() => onAnalyzed(profile)}>
        Continuer <Icon.arrow />
      </PrimaryButton>
    </div>
  );

  return (
    <div style={{ animation: "fadeUp 0.5s ease" }}>
      <Label>Analyse</Label>
      <Title>Extraction du profil</Title>
      <Subtitle>L'IA identifie vos compétences et restructure vos expériences</Subtitle>

      <div style={{ border: "1px solid rgba(255,255,255,0.07)", borderRadius: "8px", padding: "14px 16px", display: "flex", alignItems: "center", gap: "14px", marginBottom: "28px" }}>
        <div style={{ color: "rgba(255,255,255,0.2)" }}><Icon.file /></div>
        <div style={{ flex: 1 }}>
          <div style={{ color: "rgba(255,255,255,0.6)", fontSize: "13px", fontWeight: 500, marginBottom: "2px", fontFamily: "'Instrument Sans', sans-serif" }}>{cvName}</div>
          <div style={{ color: "rgba(255,255,255,0.2)", fontSize: "11px", fontFamily: "'Instrument Sans', sans-serif" }}>{(cvText.length / 1000).toFixed(1)} k caractères</div>
        </div>
        <div style={{ width: "5px", height: "5px", borderRadius: "50%", background: "rgba(120,220,140,0.6)" }} />
      </div>

      <PrimaryButton onClick={analyze}>
        Analyser — gratuit <Icon.arrow />
      </PrimaryButton>
    </div>
  );
}

// ─── OFFER STEP ───────────────────────────────────────────────────────────────
function OfferStep({ onOffer }) {
  const [url, setUrl] = useState("");
  const [text, setText] = useState("");
  const [mode, setMode] = useState("url");
  const [loading, setLoading] = useState(false);

  const handle = async () => {
    setLoading(true);
    try {
      const data = await apiPost("/api/offer/analyze", {
        mode,
        url: mode === "url" ? url : undefined,
        text: mode === "text" ? text : undefined,
      });
      onOffer(data.offer);
    } catch {
      const content = mode === "url" ? `URL: ${url}` : text;
      onOffer({ titre_poste: "Poste", url, text: content, competences_requises: [], mots_cles_ats: [], responsabilites: [], secteur: "" });
    }
    setLoading(false);
  };

  if (loading) return <LoadingState label="Analyse de l'offre" sub="Extraction des exigences · Mots-clés ATS" />;

  return (
    <div style={{ animation: "fadeUp 0.5s ease" }}>
      <Label>Offre d'emploi</Label>
      <Title>Ciblez votre candidature</Title>
      <Subtitle>URL ou texte — l'IA extrait les critères déterminants</Subtitle>

      <div style={{ display: "flex", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "6px", overflow: "hidden", marginBottom: "16px" }}>
        {[["url", "URL"], ["text", "Texte"]].map(([m, l]) => (
          <button key={m} onClick={() => setMode(m)} style={{
            flex: 1, padding: "9px", border: "none", cursor: "pointer", fontSize: "11px",
            fontFamily: "'Instrument Sans', sans-serif", fontWeight: 500, letterSpacing: "0.05em",
            textTransform: "uppercase",
            background: mode === m ? "rgba(255,255,255,0.06)" : "transparent",
            color: mode === m ? "rgba(255,255,255,0.65)" : "rgba(255,255,255,0.25)",
            transition: "all 0.2s",
          }}>{l}</button>
        ))}
      </div>

      {mode === "url" ? (
        <div style={{ position: "relative", marginBottom: "20px" }}>
          <div style={{ position: "absolute", left: "13px", top: "50%", transform: "translateY(-50%)", color: "rgba(255,255,255,0.2)" }}><Icon.link /></div>
          <input value={url} onChange={(e) => setUrl(e.target.value)}
            placeholder="https://linkedin.com/jobs/..."
            style={{ width: "100%", padding: "11px 13px 11px 36px", borderRadius: "7px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.7)", fontSize: "13px", outline: "none", boxSizing: "border-box", fontFamily: "'Instrument Sans', sans-serif" }} />
        </div>
      ) : (
        <textarea value={text} onChange={(e) => setText(e.target.value)}
          placeholder="Collez le texte de l'offre ici…" rows={7}
          style={{ width: "100%", padding: "12px 13px", borderRadius: "7px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.6)", fontSize: "13px", outline: "none", boxSizing: "border-box", fontFamily: "'Instrument Sans', sans-serif", resize: "vertical", lineHeight: 1.65, marginBottom: "20px" }} />
      )}

      <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "11px 13px", borderRadius: "7px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", marginBottom: "22px" }}>
        <div style={{ color: "rgba(255,255,255,0.2)" }}><Icon.bolt /></div>
        <span style={{ color: "rgba(255,255,255,0.25)", fontSize: "12px", fontFamily: "'Instrument Sans', sans-serif" }}>
          Cette opération consomme{" "}
          <strong style={{ color: "rgba(255,255,255,0.45)", fontWeight: 600 }}>1 crédit</strong>
        </span>
      </div>

      <PrimaryButton onClick={handle} disabled={mode === "url" ? !url : !text}>
        Analyser l'offre <Icon.arrow />
      </PrimaryButton>
    </div>
  );
}

// ─── GENERATE STEP ────────────────────────────────────────────────────────────
function GenerateStep({ profile, offer, cvText, onGenerated, credits, userId, onCreditsUpdated }) {
  const [generating, setGenerating] = useState(false);

  const overlap = offer.competences_requises?.filter(c =>
    profile.competences_cles?.some(p => p.toLowerCase().includes(c.toLowerCase().slice(0, 4)))
  ).length || 0;
  const total = offer.competences_requises?.length || 1;
  const matchPct = Math.min(Math.round((overlap / total) * 55 + 44), 96);

  const generate = async () => {
    if (credits <= 0) return;
    setGenerating(true);
    try {
      const data = await apiPost("/api/cv/generate", {
        userId,
        cvText,
        offer,
      });
      onGenerated(data.result);
      onCreditsUpdated(data.remainingCredits);
    } catch (error) {
      alert(error.message || "Erreur génération");
    }
    setGenerating(false);
  };

  if (generating) return <LoadingState label="Optimisation en cours" sub="Restructuration · Intégration ATS · Mise en valeur" />;

  return (
    <div style={{ animation: "fadeUp 0.5s ease" }}>
      <Label>Prêt à générer</Label>
      <Title>Analyse du match</Title>
      <Subtitle>Correspondance entre votre profil et les exigences du poste</Subtitle>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1px", background: "rgba(255,255,255,0.05)", borderRadius: "8px", overflow: "hidden", marginBottom: "18px" }}>
        {[["Votre profil", profile.titre, `${profile.annees_experience} ans`], ["Poste ciblé", offer.titre_poste, offer.niveau_experience || "—"]].map(([label, val, sub]) => (
          <div key={label} style={{ background: "#07060f", padding: "14px 16px" }}>
            <div style={{ fontSize: "10px", letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(255,255,255,0.18)", marginBottom: "8px", fontFamily: "'Instrument Sans', sans-serif" }}>{label}</div>
            <div style={{ color: "rgba(255,255,255,0.75)", fontSize: "13px", fontWeight: 500, marginBottom: "3px", fontFamily: "'Instrument Sans', sans-serif" }}>{val}</div>
            <div style={{ color: "rgba(255,255,255,0.25)", fontSize: "11px", fontFamily: "'Instrument Sans', sans-serif" }}>{sub}</div>
          </div>
        ))}
      </div>

      <div style={{ marginBottom: "18px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
          <span style={{ fontSize: "10px", letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(255,255,255,0.2)", fontFamily: "'Instrument Sans', sans-serif" }}>Compatibilité estimée</span>
          <span style={{ fontSize: "13px", color: "rgba(255,255,255,0.5)", fontFamily: "'Instrument Serif', serif" }}>{matchPct}%</span>
        </div>
        <div style={{ height: "1px", background: "rgba(255,255,255,0.06)", borderRadius: "1px", overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${matchPct}%`, background: "rgba(255,255,255,0.25)", borderRadius: "1px", transition: "width 1.2s cubic-bezier(0.4,0,0.2,1)" }} />
        </div>
      </div>

      {offer.mots_cles_ats?.length > 0 && (
        <div style={{ marginBottom: "26px" }}>
          <div style={{ fontSize: "10px", letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(255,255,255,0.18)", marginBottom: "10px", fontFamily: "'Instrument Sans', sans-serif" }}>Mots-clés à intégrer</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "5px" }}>
            {offer.mots_cles_ats.slice(0, 8).map((k) => (
              <span key={k} style={{ padding: "4px 10px", borderRadius: "4px", fontSize: "11px", background: "rgba(255,255,255,0.03)", color: "rgba(255,255,255,0.35)", border: "1px solid rgba(255,255,255,0.06)", fontFamily: "'Instrument Sans', sans-serif" }}>{k}</span>
            ))}
          </div>
        </div>
      )}

      {credits <= 0 ? (
        <div style={{ padding: "14px 16px", borderRadius: "7px", border: "1px solid rgba(200,80,80,0.15)", background: "rgba(200,80,80,0.03)", textAlign: "center" }}>
          <div style={{ color: "rgba(220,120,120,0.7)", fontSize: "13px", fontWeight: 500, fontFamily: "'Instrument Sans', sans-serif" }}>Crédits insuffisants</div>
          <div style={{ color: "rgba(255,255,255,0.2)", fontSize: "12px", marginTop: "4px", fontFamily: "'Instrument Sans', sans-serif" }}>Rechargez votre compte pour continuer</div>
        </div>
      ) : (
        <PrimaryButton onClick={generate}>
          <Icon.sparkle /> Générer — 1 crédit <Icon.arrow />
        </PrimaryButton>
      )}
    </div>
  );
}

// ─── RESULT STEP ──────────────────────────────────────────────────────────────
function ResultStep({ result, offer, onReset }) {
  const [tab, setTab] = useState("cv");
  const [copied, setCopied] = useState(false);

  const scoreMatch = result.match(/SCORE_ATS:\s*(\d+)/);
  const score = scoreMatch ? parseInt(scoreMatch[1]) : 82;
  const pointsMatch = result.match(/POINTS_FORTS:\s*(.+?)(?:\n|RECOMMANDATIONS)/s);
  const recoMatch = result.match(/RECOMMANDATIONS:\s*(.+?)$/s);
  const cvContent = result.replace(/---[\s\S]*$/, "").trim();

  const copyToClipboard = () => {
    navigator.clipboard.writeText(cvContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const download = () => {
    const blob = new Blob([cvContent], { type: "text/plain" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `CV_${offer.titre_poste?.replace(/\s+/g, "_") || "optimise"}.txt`;
    a.click();
  };

  return (
    <div style={{ animation: "fadeUp 0.5s ease" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "24px" }}>
        <div>
          <Label>Terminé</Label>
          <Title>CV optimisé</Title>
          <Subtitle>Pour : {offer.titre_poste}</Subtitle>
        </div>
        <div style={{ textAlign: "right", paddingTop: "4px" }}>
          <div style={{ fontSize: "32px", fontWeight: 300, color: score >= 80 ? "rgba(140,210,155,0.8)" : "rgba(220,175,110,0.8)", fontFamily: "'Instrument Serif', serif", letterSpacing: "-0.03em", lineHeight: 1 }}>{score}</div>
          <div style={{ fontSize: "9px", letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(255,255,255,0.18)", fontFamily: "'Instrument Sans', sans-serif", marginTop: "4px" }}>Score ATS</div>
        </div>
      </div>

      <div style={{ display: "flex", borderBottom: "1px solid rgba(255,255,255,0.06)", marginBottom: "20px" }}>
        {[["cv", "CV généré"], ["insights", "Insights"]].map(([t, l]) => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding: "9px 16px", border: "none", background: "none", cursor: "pointer",
            fontSize: "11px", fontFamily: "'Instrument Sans', sans-serif", fontWeight: 500,
            color: tab === t ? "rgba(255,255,255,0.65)" : "rgba(255,255,255,0.25)",
            borderBottom: `1px solid ${tab === t ? "rgba(255,255,255,0.4)" : "transparent"}`,
            marginBottom: "-1px", letterSpacing: "0.05em", textTransform: "uppercase", transition: "all 0.2s",
          }}>{l}</button>
        ))}
      </div>

      {tab === "cv" ? (
        <>
          <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "8px", padding: "18px", maxHeight: "280px", overflowY: "auto", marginBottom: "12px" }}>
            <pre style={{ color: "rgba(255,255,255,0.5)", fontSize: "11px", lineHeight: "1.8", fontFamily: "'Instrument Serif', serif", whiteSpace: "pre-wrap", margin: 0 }}>
              {cvContent}
            </pre>
          </div>
          <div style={{ display: "flex", gap: "8px", marginBottom: "18px" }}>
            <button onClick={copyToClipboard} style={{
              flex: 1, padding: "10px", borderRadius: "7px", background: "transparent",
              border: "1px solid rgba(255,255,255,0.08)", color: copied ? "rgba(140,210,155,0.8)" : "rgba(255,255,255,0.4)",
              fontSize: "11px", fontFamily: "'Instrument Sans', sans-serif", cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: "7px",
              fontWeight: 500, letterSpacing: "0.05em", textTransform: "uppercase",
            }}>
              {copied ? <><Icon.check /> Copié</> : <><Icon.copy /> Copier</>}
            </button>
            <button onClick={download} style={{
              flex: 2, padding: "10px", borderRadius: "7px", background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.65)",
              fontSize: "11px", fontFamily: "'Instrument Sans', sans-serif", cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: "7px",
              fontWeight: 500, letterSpacing: "0.05em", textTransform: "uppercase",
            }}>
              <Icon.download /> Télécharger .txt
            </button>
          </div>
        </>
      ) : (
        <div style={{ marginBottom: "18px" }}>
          {pointsMatch && (
            <div style={{ border: "1px solid rgba(255,255,255,0.06)", borderRadius: "8px", padding: "14px 16px", marginBottom: "8px" }}>
              <div style={{ fontSize: "10px", letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(140,210,155,0.4)", fontFamily: "'Instrument Sans', sans-serif", marginBottom: "10px" }}>Points forts</div>
              {pointsMatch[1].split("|").map((p, i) => (
                <div key={i} style={{ color: "rgba(255,255,255,0.45)", fontSize: "13px", fontFamily: "'Instrument Sans', sans-serif", lineHeight: 1.6, padding: "3px 0", borderBottom: i < pointsMatch[1].split("|").length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none" }}>
                  {p.trim()}
                </div>
              ))}
            </div>
          )}
          {recoMatch && (
            <div style={{ border: "1px solid rgba(255,255,255,0.06)", borderRadius: "8px", padding: "14px 16px" }}>
              <div style={{ fontSize: "10px", letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(220,175,110,0.4)", fontFamily: "'Instrument Sans', sans-serif", marginBottom: "10px" }}>Recommandations</div>
              {recoMatch[1].split("|").map((r, i) => (
                <div key={i} style={{ color: "rgba(255,255,255,0.4)", fontSize: "13px", fontFamily: "'Instrument Sans', sans-serif", lineHeight: 1.6, padding: "3px 0", borderBottom: i < recoMatch[1].split("|").length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none" }}>
                  {r.trim()}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <button onClick={onReset} style={{
        width: "100%", padding: "10px", borderRadius: "7px",
        background: "transparent", border: "1px solid rgba(255,255,255,0.05)",
        color: "rgba(255,255,255,0.22)", fontSize: "11px",
        fontFamily: "'Instrument Sans', sans-serif", cursor: "pointer",
        display: "flex", alignItems: "center", justifyContent: "center", gap: "7px",
        fontWeight: 500, letterSpacing: "0.05em", textTransform: "uppercase",
      }}>
        <Icon.back /> Autre offre
      </button>
    </div>
  );
}

// ─── CREDITS MODAL ────────────────────────────────────────────────────────────
function CreditsModal({ onClose, onBuy }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", backdropFilter: "blur(16px)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
      <div style={{ background: "#0c0b18", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "14px", padding: "32px", maxWidth: "420px", width: "100%", animation: "fadeUp 0.3s ease" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "28px" }}>
          <div>
            <div style={{ fontSize: "10px", letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(255,255,255,0.2)", marginBottom: "8px", fontFamily: "'Instrument Sans', sans-serif" }}>Crédits</div>
            <h3 style={{ color: "rgba(255,255,255,0.8)", fontSize: "22px", fontWeight: 400, fontFamily: "'Instrument Serif', serif", margin: 0, letterSpacing: "-0.02em" }}>Recharger le compte</h3>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "6px", color: "rgba(255,255,255,0.3)", cursor: "pointer", width: "30px", height: "30px", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Icon.close />
          </button>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          {CREDIT_PACKAGES.map((pkg) => (
            <button key={pkg.id} onClick={() => onBuy(pkg)} style={{
              padding: "14px 18px", borderRadius: "8px",
              border: `1px solid ${pkg.popular ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.06)"}`,
              background: pkg.popular ? "rgba(255,255,255,0.03)" : "transparent",
              cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center",
            }}>
              <div style={{ textAlign: "left" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <span style={{ color: "rgba(255,255,255,0.7)", fontWeight: 500, fontSize: "14px", fontFamily: "'Instrument Sans', sans-serif" }}>{pkg.label}</span>
                  {pkg.popular && <span style={{ fontSize: "9px", letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(255,255,255,0.28)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "3px", padding: "2px 6px", fontFamily: "'Instrument Sans', sans-serif" }}>Populaire</span>}
                </div>
                <div style={{ color: "rgba(255,255,255,0.22)", fontSize: "11px", marginTop: "2px", fontFamily: "'Instrument Sans', sans-serif" }}>{pkg.credits} CV · {pkg.unit}</div>
              </div>
              <div style={{ color: "rgba(255,255,255,0.6)", fontWeight: 400, fontSize: "16px", fontFamily: "'Instrument Serif', serif" }}>{pkg.price}</div>
            </button>
          ))}
        </div>
        <p style={{ color: "rgba(255,255,255,0.13)", fontSize: "11px", textAlign: "center", marginTop: "20px", fontFamily: "'Instrument Sans', sans-serif", letterSpacing: "0.04em" }}>
          Paiement sécurisé · Sans abonnement · Sans engagement
        </p>
      </div>
    </div>
  );
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function App() {
  const [userId] = useState(() => getUserId());
  const [step, setStep] = useState("upload");
  const [credits, setCredits] = useState(3);
  const [cvName, setCvName] = useState("");
  const [cvText, setCvText] = useState("");
  const [profile, setProfile] = useState(null);
  const [offer, setOffer] = useState(null);
  const [generatedCV, setGeneratedCV] = useState(null);
  const [showCredits, setShowCredits] = useState(false);

  useEffect(() => {
    const init = async () => {
      try {
        const creditsRes = await fetch(`/api/credits?userId=${encodeURIComponent(userId)}`);
        const creditsData = await creditsRes.json();
        if (creditsRes.ok && typeof creditsData.credits === "number") {
          setCredits(creditsData.credits);
        }

        const params = new URLSearchParams(window.location.search);
        const sessionId = params.get("session_id");
        if (sessionId) {
          const confirm = await apiPost("/api/credits/confirm", { userId, sessionId });
          if (typeof confirm.credits === "number") {
            setCredits(confirm.credits);
          }
          params.delete("session_id");
          const next = `${window.location.pathname}${params.toString() ? `?${params.toString()}` : ""}`;
          window.history.replaceState({}, "", next);
        }
      } catch {
      }
    };

    init();
  }, [userId]);

  const handleBuyCredits = async (pkg) => {
    try {
      setShowCredits(false);
      const data = await apiPost("/api/credits/checkout-session", {
        userId,
        packageId: pkg.id,
      });
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      alert(error.message || "Erreur Stripe");
    }
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Instrument+Sans:wght@400;500;600&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #07060f; }
        ::selection { background: rgba(255,255,255,0.1); }
        ::-webkit-scrollbar { width: 3px; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 2px; }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes blink { 0%, 80%, 100% { opacity: 0.1; } 40% { opacity: 0.8; } }
        input::placeholder, textarea::placeholder { color: rgba(255,255,255,0.15) !important; }
        input:focus, textarea:focus { border-color: rgba(255,255,255,0.18) !important; outline: none; }
        button:hover:not(:disabled) { opacity: 0.8; }
      `}</style>

      <div style={{ minHeight: "100vh", background: "#07060f" }}>
        <div style={{ position: "fixed", inset: 0, pointerEvents: "none",
          backgroundImage: "radial-gradient(ellipse 80% 50% at 15% 0%, rgba(60,45,160,0.06) 0%, transparent 60%)"
        }} />

        <header style={{ position: "sticky", top: 0, zIndex: 50, borderBottom: "1px solid rgba(255,255,255,0.05)", padding: "0 32px", height: "52px", display: "flex", alignItems: "center", justifyContent: "space-between", backdropFilter: "blur(24px)", background: "rgba(7,6,15,0.92)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{ width: "16px", height: "16px", border: "1px solid rgba(255,255,255,0.25)", borderRadius: "3px", transform: "rotate(45deg)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <div style={{ width: "4px", height: "4px", background: "rgba(255,255,255,0.6)", borderRadius: "1px" }} />
            </div>
            <span style={{ fontFamily: "'Instrument Serif', serif", fontSize: "15px", color: "rgba(255,255,255,0.65)", letterSpacing: "0.01em" }}>CVAdapt</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "7px", color: "rgba(255,255,255,0.28)", fontSize: "12px", fontFamily: "'Instrument Sans', sans-serif" }}>
              <Icon.bolt />
              <span>{credits} crédit{credits !== 1 ? "s" : ""}</span>
            </div>
            <button onClick={() => setShowCredits(true)} style={{ padding: "5px 13px", borderRadius: "5px", background: "transparent", border: "1px solid rgba(255,255,255,0.09)", color: "rgba(255,255,255,0.38)", fontSize: "11px", fontFamily: "'Instrument Sans', sans-serif", cursor: "pointer", letterSpacing: "0.05em", fontWeight: 500 }}>
              Recharger
            </button>
          </div>
        </header>

        {step !== "upload" && (
          <div style={{ borderBottom: "1px solid rgba(255,255,255,0.04)", padding: "18px 0 14px", background: "rgba(7,6,15,0.7)", backdropFilter: "blur(24px)" }}>
            <StepIndicator current={step} />
          </div>
        )}

        {step === "upload" && (
          <div style={{ maxWidth: "400px", margin: "0 auto", padding: "72px 24px 40px", textAlign: "center", animation: "fadeUp 0.6s ease" }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: "8px", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "20px", padding: "5px 14px", marginBottom: "32px" }}>
              <div style={{ width: "5px", height: "5px", borderRadius: "50%", background: "rgba(140,210,155,0.6)" }} />
              <span style={{ fontSize: "10px", color: "rgba(255,255,255,0.28)", letterSpacing: "0.09em", textTransform: "uppercase", fontFamily: "'Instrument Sans', sans-serif" }}>ATS-optimized · Claude AI</span>
            </div>
            <h1 style={{ fontFamily: "'Instrument Serif', serif", fontSize: "46px", fontWeight: 400, color: "rgba(255,255,255,0.82)", lineHeight: 1.1, marginBottom: "22px", letterSpacing: "-0.03em" }}>
              Votre CV,<br />
              <em style={{ color: "rgba(255,255,255,0.32)", fontStyle: "italic" }}>adapté à chaque offre</em>
            </h1>
            <p style={{ color: "rgba(255,255,255,0.28)", fontSize: "15px", lineHeight: 1.7, maxWidth: "320px", margin: "0 auto 52px", fontFamily: "'Instrument Sans', sans-serif" }}>
              L'IA restructure votre contenu existant pour maximiser votre score ATS. Sans rien inventer.
            </p>
            <div style={{ display: "flex", gap: "28px", justifyContent: "center", borderTop: "1px solid rgba(255,255,255,0.05)", paddingTop: "28px" }}>
              {[["Analyse", "Extraction"], ["Ciblage", "Match offre"], ["Optimisation", "ATS-friendly"]].map(([t, d]) => (
                <div key={t}>
                  <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.4)", fontWeight: 500, marginBottom: "3px", fontFamily: "'Instrument Sans', sans-serif" }}>{t}</div>
                  <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.18)", fontFamily: "'Instrument Sans', sans-serif" }}>{d}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        <main style={{ maxWidth: "440px", margin: "0 auto", padding: step === "upload" ? "0 24px 80px" : "36px 24px 80px", position: "relative", zIndex: 1 }}>
          <div style={{ background: "rgba(255,255,255,0.018)", border: "1px solid rgba(255,255,255,0.065)", borderRadius: "14px", padding: "28px" }}>
            {step === "upload" && <UploadStep onUpload={(n, t) => { setCvName(n); setCvText(t); setStep("analyze"); }} />}
            {step === "analyze" && <AnalyzeStep cvText={cvText} cvName={cvName} onAnalyzed={(p) => { setProfile(p); setStep("offer"); }} />}
            {step === "offer" && <OfferStep onOffer={(o) => { setOffer(o); setStep("generate"); }} />}
            {step === "generate" && <GenerateStep profile={profile} offer={offer} cvText={cvText} onGenerated={(cv) => { setGeneratedCV(cv); setStep("result"); }} credits={credits} userId={userId} onCreditsUpdated={setCredits} />}
            {step === "result" && <ResultStep result={generatedCV} offer={offer} onReset={() => { setStep("offer"); setOffer(null); setGeneratedCV(null); }} />}
          </div>
        </main>
      </div>

      {showCredits && <CreditsModal onClose={() => setShowCredits(false)} onBuy={handleBuyCredits} />}
    </>
  );
}