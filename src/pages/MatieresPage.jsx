// src/pages/MatieresPage.jsx
import { useEffect, useMemo, useState } from "react";
import VerticalNavBar from "../components/VerticalNavBar.jsx";
import HorizontalNavBar from "../components/HorizontalNavBar.jsx";
import { BookOpen, Plus, Edit, Trash2 } from "lucide-react";
import { colors } from "../styles/theme";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:4000";

/* ───────── Dictionnaires ───────── */
const DICT = {
  "Filières de gestion": {
    type: "gestion",
    specialites: [
      ["Comptabilité et Gestion des Entreprises", "CGE"],
      ["Administration des Collectivités Territoriales", "ACT"],
      ["Gestion des ONG", "ONG"],
      ["Gestion de Projets", "GPR"],
      ["Gestion des Ressources Humaines", "GRH"],
      ["Assistant Manager", "AMA"],
      ["Banque et Finance", "BAF"],
      ["Marketing – Commerce – Vente", "MCV"],
      ["Commerce International", "CIN"],
      ["Gestion Logistique et Transport", "GLT"],
      ["Statistiques", "STA"],
      ["Douane et Transit", "DTR"],
      ["Comptabilité – Contrôle – Audit", "CCA"],
      ["Finance – Comptabilité", "FIC"],
      ["Banque – Finance et Assurance", "BFA"],
      ["Marketing et Communication Digitale", "MCD"],
      ["Marketing – Management Opérationnel", "MMO"],
      ["Management des Organisations", "MOR"],
      ["Management de la Qualité", "MAQ"],
      ["Management des Projets", "MPR"],
    ],
  },
  "Filières carrières juridiques": {
    type: "juridique",
    specialites: [
      ["Droit Foncier et Domanial", "DFD"],
      ["Professions Immobilières", "PRI"],
      ["Douane et Transit", "DTR"],
      ["Droit des Affaires et de l’Entreprise", "DAE"],
    ],
  },
  "Filières industrielles": {
    type: "industriel",
    specialites: [
      ["Génie Civil", ""],
      ["Génie Informatique", ""],
      ["Télécommunication", ""],
      ["Génie Mécanique", ""],
      ["Génie Thermique", ""],
      ["Génie Électrique", ""],
    ],
    optionsBySpecialite: {
      "Génie Civil": [
        ["Bâtiment", "BAT"],
        ["Travaux Publics", "TPU"],
        ["Géomètre Topographe", "GTP"],
        ["Installation Sanitaire", "INS"],
      ],
      "Génie Informatique": [
        ["Génie Logiciel", "GLI"],
        ["E-Commerce et Marketing Numérique", "ECM"],
        ["Gestion des Systèmes Informatiques", "GSI"],
        ["Informatique Industrielle et Automatisme", "IIA"],
      ],
      Télécommunication: [
        ["Télécommunication", "TEL"],
        ["Réseau et Sécurité", "RES"],
      ],
      "Génie Mécanique": [
        ["Chaudronnerie et Soudure", "CHS"],
        ["Fabrication Mécanique", "FBM"],
        ["Mécatronique", "MEC"],
        ["Maintenance Systèmes Industriels", "MSI"],
        ["Électromécanique", "ELM"],
      ],
      "Génie Thermique": [
        ["Énergies Renouvelables", "ENR"],
        ["Froid et Climatisation", "FRC"],
      ],
      "Génie Électrique": [
        ["Maintenance Appareils Biomédicaux", "MAB"],
        ["Électrotechnique", "ELT"],
      ],
    },
  },
};

const CYCLE_RULES = {
  BTS: [1, 2],
  LICENCE: [3],
  MASTER: [4, 5],
  "INGÉNIEUR": [1, 2, 3, 4, 5],
};

const getUELabel = (s) => (s?.ueLabel || s?.label || s?.name || "").toString();

/* ─────────────────────────── Page ─────────────────────────── */
export default function MatieresPage({ currentSection = "matieres", onNavigate }) {
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(false);
  const [openModal, setOpenModal] = useState(false);
  const [editing, setEditing] = useState(null);

  const loadSubjects = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/subjects`);
      const data = await res.json();
      setSubjects(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error("Erreur chargement matières :", e);
      setSubjects([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSubjects();
  }, []);

  const groupedBySalle = useMemo(() => {
    const map = new Map();
    for (const s of subjects) {
      const filiere = s.filiere || "Filière non définie";
      const salleCode = s.specialiteCode || "???";
      const specLabel = s.specialite || "Spécialité ?";
      const level = s.studyYear || 1;
      const cycle = s.cycle || "";
      const key = `${filiere}::${salleCode}::${level}`;

      if (!map.has(key)) {
        map.set(key, { key, filiere, salleCode, specialite: specLabel, level, cycle, subjects: [] });
      }
      map.get(key).subjects.push(s);
    }

    return Array.from(map.values()).sort(
      (a, b) =>
        a.filiere.localeCompare(b.filiere) ||
        a.salleCode.localeCompare(b.salleCode) ||
        String(a.level).localeCompare(String(b.level))
    );
  }, [subjects]);

  const handleCreate = () => {
    setEditing(null);
    setOpenModal(true);
  };

  const handleEdit = (subject) => {
    setEditing(subject);
    setOpenModal(true);
  };

  const handleDelete = async (subject) => {
    const label = getUELabel(subject) || "sans titre";
    if (!window.confirm(`Supprimer la matière "${label}" ?`)) return;
    try {
      const res = await fetch(`${API_BASE}/subjects/${subject.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Échec de la suppression");
      await loadSubjects();
    } catch (e) {
      alert(e.message || "Erreur lors de la suppression");
    }
  };

  const handleSave = async (payload) => {
    const common = {
      filiere: payload.filiere,
      specialite: payload.specialite,
      specialiteCode: payload.specialiteCode,
      studyYear: payload.studyYear,
      cycle: payload.cycle || null,
      isOptional: payload.isOptional === true,
    };

    try {
      // EDIT (un seul)
      if (payload.id) {
        const ue = (payload.ueTitle || "").trim();

        const body = {
          ...common,
          // ✅ compat backend
          ueLabel: ue,
          name: ue,
          label: ue,

          ecTitle: payload.ecTitle || null,
          credits: payload.credits != null ? payload.credits : null,
          coefficient: payload.coefficient != null ? payload.coefficient : null,
        };

        const res = await fetch(`${API_BASE}/subjects/${payload.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Erreur d’enregistrement");

        setOpenModal(false);
        setEditing(null);
        await loadSubjects();
        return;
      }

      // CREATE BULK UE
      if (payload.mode === "bulkUE") {
        const ueTitles = (payload.ueTitles || []).map((t) => (t || "").trim()).filter(Boolean);
        if (ueTitles.length === 0) throw new Error("Ajoutez au moins une UE.");

        for (const title of ueTitles) {
          const body = {
            ...common,
            ueLabel: title,
            name: title,
            label: title,

            ecTitle: null,
            credits: null,
            coefficient: null,
          };

          const res = await fetch(`${API_BASE}/subjects`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || "Erreur d’enregistrement");
        }

        setOpenModal(false);
        setEditing(null);
        await loadSubjects();
        return;
      }

      // CREATE SINGLE
      const ue = (payload.ueTitle || "").trim();

      const body = {
        ...common,
        ueLabel: ue,
        name: ue,
        label: ue,

        ecTitle: payload.ecTitle || null,
        credits: payload.credits != null ? payload.credits : null,
        coefficient: payload.coefficient != null ? payload.coefficient : null,
      };

      const res = await fetch(`${API_BASE}/subjects`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur d’enregistrement");

      setOpenModal(false);
      setEditing(null);
      await loadSubjects();
    } catch (e) {
      alert(e.message || "Erreur lors de l’enregistrement");
    }
  };

  return (
    <div style={styles.layout}>
      <aside style={styles.left}>
        <VerticalNavBar currentSection={currentSection} onNavigate={onNavigate} />
      </aside>

      <main style={styles.right}>
        <HorizontalNavBar />
        <div style={styles.pageBody}>
          <div style={styles.container}>
            <MatieresHeader loading={loading} total={subjects.length} onAdd={handleCreate} />
            <MatieresGroupedBySalle groups={groupedBySalle} onEdit={handleEdit} onDelete={handleDelete} />
          </div>
        </div>
      </main>

      {openModal && (
        <MatiereModal
          subject={editing}
          onClose={() => {
            setOpenModal(false);
            setEditing(null);
          }}
          onSave={handleSave}
        />
      )}
    </div>
  );
}

/* ───────────────────── Header ───────────────────── */
function MatieresHeader({ loading, total, onAdd }) {
  return (
    <section style={headerStyles.card}>
      <div style={headerStyles.left}>
        <h1 style={headerStyles.title}>Gestion des matières</h1>
        <p style={headerStyles.subtitle}>
          Définissez les unités d&apos;enseignement (UE) et les éléments constitutifs (EC) par salle.
        </p>
        <p style={headerStyles.badge}>{loading ? "Chargement des matières…" : `${total} enregistrement(s)`}</p>
      </div>
      <div style={headerStyles.right}>
        <button type="button" style={headerStyles.addBtn} onClick={onAdd}>
          <Plus size={16} />
          <span>Ajouter une matière</span>
        </button>
      </div>
    </section>
  );
}

/* ───────────────── Tableau regroupé par salle ───────────────── */
function MatieresGroupedBySalle({ groups, onEdit, onDelete }) {
  if (!groups || groups.length === 0) {
    return (
      <section>
        <h2 style={sheetStyles.sectionTitle}>Matières par salle</h2>
        <div style={sheetStyles.wrapper}>
          <p style={{ fontSize: ".8rem", color: "#6B7280" }}>Aucune matière définie pour le moment.</p>
        </div>
      </section>
    );
  }

  return (
    <section>
      <div style={sheetStyles.sectionHeader}>
        <h2 style={sheetStyles.sectionTitle}>Matières par salle</h2>
        <p style={sheetStyles.sectionSubtitle}>Chaque bloc correspond à une salle (filière + spécialité + niveau).</p>
      </div>

      <div style={sheetStyles.wrapper}>
        <div style={sheetStyles.groupsGrid}>
          {groups.map((g) => {
            const visibleSubjects = (g.subjects || []).filter((s) => {
              const ue = getUELabel(s).trim();
              const hasUE = ue !== "";
              const hasEC = s.ecTitle && s.ecTitle.trim() !== "";
              const hasNum =
                (s.credits != null && s.credits !== 0) ||
                (s.coefficient != null && s.coefficient !== 0);
              const hasCycle = s.cycle && s.cycle.trim() !== "";
              const hasOption = s.isOptional;
              return hasUE || hasEC || hasNum || hasCycle || hasOption;
            });

            return (
              <article key={g.key} style={sheetStyles.groupCard}>
                <header style={sheetStyles.groupHeader}>
                  <div style={sheetStyles.groupIcon}>
                    <BookOpen size={16} />
                  </div>
                  <div>
                    <div style={sheetStyles.groupTitle}>
                      {g.salleCode} – {g.specialite}
                    </div>
                    <div style={sheetStyles.groupMeta}>
                      {g.filiere} · Niveau {g.level}
                      {g.cycle ? ` · Cycle ${g.cycle}` : ""}
                    </div>
                  </div>
                </header>

                <table style={sheetStyles.table}>
                  <thead>
                    <tr>
                      <th style={sheetStyles.thSmall}>UE (Intitulé)</th>
                      <th style={sheetStyles.th}>EC</th>
                      <th style={sheetStyles.thTiny}>Crédits</th>
                      <th style={sheetStyles.thTiny}>Coef.</th>
                      <th style={sheetStyles.thTiny}>Cycle</th>
                      <th style={sheetStyles.thSmall}>Optionnelle</th>
                      <th style={sheetStyles.thActions}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleSubjects.length === 0 ? (
                      <tr>
                        <td colSpan={7} style={{ padding: "6px 8px", fontSize: ".8rem", color: "#9CA3AF", textAlign: "center" }}>
                          Aucune matière définie pour cette salle.
                        </td>
                      </tr>
                    ) : (
                      visibleSubjects.map((s) => (
                        <tr key={s.id}>
                          <td style={sheetStyles.tdLabel}>{getUELabel(s)}</td>
                          <td style={sheetStyles.tdLabel}>
                            {s.ecTitle || <span style={{ color: "#9CA3AF" }}>—</span>}
                          </td>
                          <td style={sheetStyles.tdCenter}>{s.credits != null ? s.credits : "—"}</td>
                          <td style={sheetStyles.tdCenter}>{s.coefficient != null ? s.coefficient : "—"}</td>
                          <td style={sheetStyles.tdCenter}>{s.cycle || "—"}</td>
                          <td style={sheetStyles.tdCenter}>{s.isOptional ? "Oui" : "Non"}</td>
                          <td style={sheetStyles.tdActions}>
                            <button type="button" style={sheetStyles.iconBtn} onClick={() => onEdit(s)} title="Modifier">
                              <Edit size={14} />
                            </button>
                            <button
                              type="button"
                              style={{ ...sheetStyles.iconBtn, color: "#DC2626" }}
                              onClick={() => onDelete(s)}
                              title="Supprimer"
                            >
                              <Trash2 size={14} />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ───────────────────── Modale Ajouter / Modifier ───────────────────── */
function MatiereModal({ subject, onClose, onSave }) {
  const isEdit = !!subject;

  const [bulkUE, setBulkUE] = useState(false);
  const [ueList, setUeList] = useState(() => (subject ? [getUELabel(subject)] : [""]));

  const [ueTitle, setUeTitle] = useState(getUELabel(subject));
  const [ecTitle, setEcTitle] = useState(subject?.ecTitle || "");
  const [credits, setCredits] = useState(subject?.credits != null ? String(subject.credits) : "");
  const [coefficient, setCoefficient] = useState(subject?.coefficient != null ? String(subject.coefficient) : "");

  const [filiere, setFiliere] = useState(subject?.filiere || "");
  const [specialiteParent, setSpecialiteParent] = useState("");
  const [specialite, setSpecialite] = useState(subject?.specialite || "");
  const [specialiteCode, setSpecialiteCode] = useState(subject?.specialiteCode || "");
  const [option, setOption] = useState("");
  const [optionCode, setOptionCode] = useState("");

  const [cycle, setCycle] = useState(subject?.cycle || "");
  const [studyYear, setStudyYear] = useState(subject?.studyYear != null ? Number(subject.studyYear) : null);

  const [isOptional, setIsOptional] = useState(!!subject?.isOptional);
  const [error, setError] = useState("");

  const currentConf = useMemo(() => (filiere ? DICT[filiere] : null), [filiere]);
  const isIndus = currentConf?.type === "industriel";
  const specialites = currentConf?.specialites || [];
  const options =
    isIndus && specialiteParent ? currentConf.optionsBySpecialite[specialiteParent] || [] : [];

  useEffect(() => {
    if (!subject || subject.filiere !== "Filières industrielles") return;
    const conf = DICT["Filières industrielles"];
    if (!conf) return;

    for (const [parentLabel, opts] of Object.entries(conf.optionsBySpecialite)) {
      const found = opts.find(([label]) => label === subject.specialite);
      if (found) {
        const [optLabel, optCode] = found;
        setFiliere("Filières industrielles");
        setSpecialiteParent(parentLabel);
        setSpecialite(optLabel);
        setOption(optLabel);
        setOptionCode(optCode);
        setSpecialiteCode(optCode);
        return;
      }
    }
  }, [subject]);

  useEffect(() => {
    setSpecialiteParent("");
    setSpecialite("");
    setSpecialiteCode("");
    setOption("");
    setOptionCode("");
  }, [filiere]);

  const onSelectSpecialite = (value) => {
    if (!currentConf) return;
    if (isIndus) {
      setSpecialiteParent(value);
      setSpecialite("");
      setSpecialiteCode("");
      setOption("");
      setOptionCode("");
    } else {
      const entry = specialites.find(([label]) => label === value);
      const code = entry ? entry[1] || "" : "";
      setSpecialite(value);
      setSpecialiteCode(code);
    }
  };

  const onSelectOption = (value) => {
    if (!isIndus || !currentConf || !specialiteParent) return;
    const list = currentConf.optionsBySpecialite[specialiteParent] || [];
    const entry = list.find(([label]) => label === value);
    const code = entry ? entry[1] || "" : "";
    setOption(value);
    setOptionCode(code);
    setSpecialite(value);
    setSpecialiteCode(code);
  };

  const allowedYears = cycle ? CYCLE_RULES[cycle] || [] : [];
  const pickYear = (y) => {
    if (!allowedYears.includes(y)) return;
    setStudyYear((prev) => (prev === y ? null : y));
  };

  const addUeRow = () => setUeList((prev) => [...prev, ""]);
  const removeUeRow = (idx) =>
    setUeList((prev) => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== idx)));
  const updateUeRow = (idx, val) =>
    setUeList((prev) => prev.map((x, i) => (i === idx ? val : x)));

  const validateCommon = () => {
    if (!filiere) return setError("La filière est obligatoire."), false;
    if (!specialite) return setError("La spécialité est obligatoire."), false;
    if (!specialiteCode) return setError("Le code spécialité (salle) est obligatoire."), false;
    if (!cycle) return setError("Le cycle est obligatoire."), false;
    if (!studyYear) return setError("L’année d’étude est obligatoire."), false;
    return true;
  };

  const validate = () => {
    if (!validateCommon()) return false;

    if (bulkUE) {
      const cleaned = (ueList || []).map((x) => (x || "").trim()).filter(Boolean);
      if (cleaned.length === 0) {
        setError("Intitulé de l'UE (Unité d'enseignement) requis.");
        return false;
      }
      setError("");
      return { cleaned };
    }

    if (!ueTitle.trim()) {
      setError("Intitulé de l'UE (Unité d'enseignement) requis.");
      return false;
    }

    const coeffNum = coefficient.trim() ? Number(coefficient.replace(",", ".")) : null;
    if (coefficient.trim() && Number.isNaN(coeffNum)) return setError("Le coefficient doit être un nombre."), false;

    const creditsNum = credits.trim() ? Number(credits.replace(",", ".")) : null;
    if (credits.trim() && Number.isNaN(creditsNum)) return setError("Le crédit doit être un nombre."), false;

    setError("");
    return { coeffNum, creditsNum };
  };

  const submit = () => {
    const v = validate();
    if (!v) return;

    if (bulkUE) {
      onSave?.({
        mode: "bulkUE",
        ueTitles: v.cleaned,
        filiere,
        specialite,
        specialiteCode,
        cycle,
        studyYear,
        isOptional,
      });
      return;
    }

    onSave?.({
      id: subject?.id,
      ueTitle: ueTitle.trim(),
      ecTitle: ecTitle.trim() || null,
      coefficient: v.coeffNum,
      credits: v.creditsNum,
      filiere,
      specialite,
      specialiteCode,
      cycle,
      studyYear,
      isOptional,
    });
  };

  const inputStyle = {
    width: "100%",
    height: 38,
    borderRadius: 10,
    border: `1px solid ${colors.border}`,
    padding: "0 .7rem",
    fontSize: ".85rem",
    background: "var(--bg-input, #F9FAFB)",
    outline: "none",
    boxSizing: "border-box",
  };

  const disabledDetails = bulkUE === true;

  return (
    <div style={modalStyles.overlay} onMouseDown={onClose}>
      <div style={modalStyles.modal} onMouseDown={(e) => e.stopPropagation()}>
        <header style={modalStyles.header}>
          <h3 style={modalStyles.title}>{isEdit ? "Modifier la matière" : "Ajouter une matière"}</h3>
        </header>

        <div style={modalStyles.body}>
          <p style={modalStyles.help}>Renseignez l'UE, l'EC et la salle.</p>

          {!isEdit && (
            <label style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 10 }}>
              <input
                type="checkbox"
                checked={bulkUE}
                onChange={(e) => {
                  const checked = e.target.checked;
                  setBulkUE(checked);
                  setError("");

                  // ✅ IMPORTANT: initialiser la liste correctement
                  if (checked) {
                    const seed = ueTitle?.trim() ? [ueTitle.trim()] : ueList;
                    const cleaned = (seed || []).map((x) => (x || "").trim()).filter(Boolean);
                    setUeList(cleaned.length ? cleaned : [""]);
                  }
                }}
              />
              <span style={{ fontSize: ".85rem" }}>
                Ajouter plusieurs UE (désactive EC/Crédit/Coef pour l’instant)
              </span>
            </label>
          )}

          {error && <p style={modalStyles.error}>{error}</p>}

          <div style={modalStyles.grid}>
            {/* UE */}
            <div style={modalStyles.fieldFull}>
              <label style={modalStyles.label}>Intitulé de l&apos;UE (Unité d&apos;enseignement) *</label>

              {bulkUE ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {ueList.map((val, idx) => (
                    <div key={idx} style={{ display: "grid", gridTemplateColumns: "1fr 44px", gap: 8 }}>
                      <input
                        type="text"
                        value={val}
                        onChange={(e) => updateUeRow(idx, e.target.value)}
                        placeholder="Ex : Mathématique Générale"
                        style={inputStyle}
                      />
                      <button
                        type="button"
                        onClick={() => removeUeRow(idx)}
                        style={{
                          borderRadius: 10,
                          border: `1px solid ${colors.border}`,
                          background: "transparent",
                          cursor: "pointer",
                        }}
                        title="Supprimer"
                      >
                        –
                      </button>
                    </div>
                  ))}

                  <button
                    type="button"
                    onClick={addUeRow}
                    style={{
                      background: "transparent",
                      border: "none",
                      color: "var(--ip-teal)",
                      cursor: "pointer",
                      textAlign: "left",
                      padding: 0,
                      fontWeight: 600,
                      fontSize: ".85rem",
                    }}
                  >
                    + Ajouter une UE
                  </button>
                </div>
              ) : (
                <input
                  type="text"
                  value={ueTitle}
                  onChange={(e) => setUeTitle(e.target.value)}
                  placeholder="Ex : Résistance des matériaux I"
                  style={inputStyle}
                />
              )}
            </div>

            {/* EC + Crédits */}
            <div style={modalStyles.field}>
              <label style={modalStyles.label}>Intitulé de l&apos;EC (Élément constitutif)</label>
              <input
                type="text"
                value={ecTitle}
                onChange={(e) => setEcTitle(e.target.value)}
                placeholder="Ex : Cours magistral"
                style={{ ...inputStyle, opacity: disabledDetails ? 0.5 : 1 }}
                disabled={disabledDetails}
              />
            </div>
            <div style={modalStyles.field}>
              <label style={modalStyles.label}>Crédit</label>
              <input
                type="number"
                min="0"
                step="0.5"
                value={credits}
                onChange={(e) => setCredits(e.target.value)}
                placeholder="Ex : 3"
                style={{ ...inputStyle, opacity: disabledDetails ? 0.5 : 1 }}
                disabled={disabledDetails}
              />
            </div>

            {/* Coefficient */}
            <div style={modalStyles.field}>
              <label style={modalStyles.label}>Coefficient</label>
              <input
                type="number"
                min="0"
                step="0.5"
                value={coefficient}
                onChange={(e) => setCoefficient(e.target.value)}
                placeholder="Ex : 2"
                style={{ ...inputStyle, opacity: disabledDetails ? 0.5 : 1 }}
                disabled={disabledDetails}
              />
            </div>

            {/* Filière */}
            <div style={modalStyles.field}>
              <label style={modalStyles.label}>Filière *</label>
              <select style={inputStyle} value={filiere} onChange={(e) => setFiliere(e.target.value)}>
                <option value="">Sélectionner une filière</option>
                <option>Filières de gestion</option>
                <option>Filières industrielles</option>
                <option>Filières carrières juridiques</option>
              </select>
            </div>

            {/* Spécialité */}
            <div style={modalStyles.field}>
              <label style={modalStyles.label}>Spécialité *</label>
              <select
                style={inputStyle}
                value={isIndus ? specialiteParent : specialite}
                onChange={(e) => onSelectSpecialite(e.target.value)}
                disabled={!currentConf}
              >
                <option value="">Sélectionner une spécialité</option>
                {specialites.map(([label]) => (
                  <option key={label} value={label}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            {/* Option (indus) */}
            {isIndus && (
              <div style={modalStyles.field}>
                <label style={modalStyles.label}>Option (salle)</label>
                <select
                  style={inputStyle}
                  value={option}
                  onChange={(e) => onSelectOption(e.target.value)}
                  disabled={!specialiteParent}
                >
                  <option value="">Sélectionner une option</option>
                  {options.map(([label]) => (
                    <option key={label} value={label}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Code salle */}
            <div style={modalStyles.field}>
              <label style={modalStyles.label}>Code spécialité (salle) *</label>
              <input type="text" value={specialiteCode} readOnly placeholder="BAF, BAT, GLI…" style={{ ...inputStyle, background: "#f3f4f6" }} />
            </div>

            {/* Cycle */}
            <div style={modalStyles.field}>
              <label style={modalStyles.label}>Cycle *</label>
              <select
                style={inputStyle}
                value={cycle}
                onChange={(e) => {
                  setCycle(e.target.value);
                  setStudyYear(null);
                }}
              >
                <option value="">Sélectionner un cycle</option>
                <option value="BTS">BTS</option>
                <option value="LICENCE">LICENCE</option>
                <option value="MASTER">MASTER</option>
                <option value="INGÉNIEUR">INGÉNIEUR</option>
              </select>
            </div>

            {/* Année d’étude */}
            <div style={modalStyles.fieldFull}>
              <label style={modalStyles.label}>Année d’étude *</label>
              <div style={modalStyles.yearRow}>
                {[1, 2, 3, 4, 5].map((y) => {
                  const enabled = allowedYears.includes(y);
                  const active = studyYear === y;
                  return (
                    <button
                      key={y}
                      type="button"
                      onClick={() => pickYear(y)}
                      disabled={!enabled}
                      style={{
                        ...modalStyles.yearChip,
                        ...(enabled ? {} : modalStyles.yearChipDisabled),
                        ...(active ? modalStyles.yearChipActive : {}),
                      }}
                    >
                      {y === 1 ? "1re" : `${y}e`} Année
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Optionnelle */}
            <div style={modalStyles.fieldFull}>
              <label style={modalStyles.checkboxRow}>
                <input type="checkbox" checked={isOptional} onChange={(e) => setIsOptional(e.target.checked)} style={{ marginRight: 8 }} />
                <span>Matière optionnelle pour cette salle</span>
              </label>
            </div>
          </div>
        </div>

        <footer style={modalStyles.footer}>
          <button type="button" style={modalStyles.btnGhost} onClick={onClose}>Annuler</button>
          <button type="button" style={modalStyles.btnPrimary} onClick={submit}>
            {isEdit ? "Enregistrer les modifications" : "Enregistrer"}
          </button>
        </footer>
      </div>
    </div>
  );
}

/* ───────────────────── Styles ───────────────────── */
const styles = {
  layout: {
    display: "grid",
    gridTemplateColumns: "minmax(220px, 10%) 1fr",
    width: "100vw",
    height: "100vh",
    background: "#f5f6f8",
    overflow: "hidden",
  },
  left: {
    height: "100%",
    overflowY: "auto",
    background: "var(--bg)",
    borderRight: `1px solid ${colors.border}`,
  },
  right: {
    display: "flex",
    flexDirection: "column",
    minWidth: 0,
    height: "100%",
    overflow: "hidden",
    background: "#f5f6f8",
  },
  pageBody: { flex: 1, overflowY: "auto" },
  container: {
    maxWidth: "1600px",
    margin: "1.5rem auto",
    padding: "0 1.5rem 1.5rem",
    display: "flex",
    flexDirection: "column",
    gap: "1.5rem",
  },
};

const headerStyles = {
  card: {
    background: "var(--bg)",
    borderRadius: 12,
    border: `1px solid ${colors.border}`,
    padding: "1rem 1.25rem",
    display: "flex",
    gap: "1rem",
    alignItems: "flex-start",
  },
  left: { flex: 1, minWidth: 0 },
  right: { display: "flex", alignItems: "center", justifyContent: "flex-end", minWidth: 0 },
  title: { margin: 0, fontSize: "1.05rem", fontWeight: 700 },
  subtitle: { margin: "4px 0 0", fontSize: ".85rem", color: "var(--ip-gray)" },
  badge: {
    marginTop: 8,
    display: "inline-block",
    padding: "3px 10px",
    borderRadius: 999,
    fontSize: ".75rem",
    background: "#ECFEFF",
    color: "#0369A1",
    border: "1px solid #7DD3FC",
  },
  addBtn: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "8px 14px",
    borderRadius: 999,
    border: "none",
    background: "#00b89c",
    color: "white",
    fontSize: ".85rem",
    fontWeight: 600,
    cursor: "pointer",
  },
};

const sheetStyles = {
  sectionHeader: { marginBottom: "0.5rem" },
  sectionTitle: { margin: 0, fontSize: ".9rem", fontWeight: 600, color: "var(--ip-gray)" },
  sectionSubtitle: { margin: "4px 0 0", fontSize: ".8rem", color: "#6B7280" },
  wrapper: {
    marginTop: "0.5rem",
    padding: "0.75rem",
    background: "#E5E7EB",
    borderRadius: 12,
    overflowX: "auto",
  },
  groupsGrid: { display: "flex", flexDirection: "column", gap: 16 },
  groupCard: { background: "#fff", borderRadius: 12, border: "1px solid #D1D5DB", padding: "0.75rem 0.75rem 0.9rem" },
  groupHeader: { display: "flex", gap: 10, alignItems: "center", marginBottom: 8 },
  groupIcon: { width: 28, height: 28, borderRadius: 999, background: "#ECFEFF", display: "flex", alignItems: "center", justifyContent: "center", color: "#0F766E" },
  groupTitle: { fontSize: ".9rem", fontWeight: 600 },
  groupMeta: { fontSize: ".75rem", color: "#6B7280" },
  table: { width: "100%", borderCollapse: "collapse", marginTop: 4, fontSize: ".8rem" },
  th: { borderBottom: "1px solid #D1D5DB", padding: "4px 6px", textAlign: "left" },
  thSmall: { borderBottom: "1px solid #D1D5DB", padding: "4px 6px", textAlign: "center" },
  thTiny: { borderBottom: "1px solid #D1D5DB", padding: "4px 4px", textAlign: "center", width: 60 },
  thActions: { borderBottom: "1px solid #D1D5DB", padding: "4px 4px", textAlign: "right", width: 80 },
  tdLabel: { borderBottom: "1px solid #E5E7EB", padding: "4px 6px" },
  tdCenter: { borderBottom: "1px solid #E5E7EB", padding: "4px 4px", textAlign: "center" },
  tdActions: { borderBottom: "1px solid #E5E7EB", padding: "4px 4px", textAlign: "right", whiteSpace: "nowrap" },
  iconBtn: { border: "none", background: "transparent", cursor: "pointer", padding: 2, marginLeft: 4, color: "#4B5563" },
};

const modalStyles = {
  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,.35)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "1rem",
    zIndex: 80,
  },
  modal: {
    width: "min(780px, 100vw)",
    maxHeight: "92vh",
    background: "var(--bg)",
    color: "var(--fg)",
    borderRadius: 12,
    border: `1px solid ${colors.border}`,
    boxShadow: "0 18px 35px rgba(0,0,0,.18)",
    display: "flex",
    flexDirection: "column",
  },
  header: { padding: "14px 18px", borderBottom: `1px solid ${colors.border}` },
  title: { margin: 0, fontSize: "1.05rem", fontWeight: 600 },
  body: { padding: "10px 18px 4px", overflowY: "auto" },
  help: { margin: "0 0 10px", fontSize: ".85rem", color: "var(--ip-gray)" },
  error: { margin: "0 0 10px", fontSize: ".8rem", color: "#DC2626" },
  grid: { display: "grid", gridTemplateColumns: "1fr 1fr", columnGap: 12, rowGap: 10 },
  field: { display: "flex", flexDirection: "column", gap: 4 },
  fieldFull: { gridColumn: "1 / -1", display: "flex", flexDirection: "column", gap: 4 },
  label: { fontSize: ".8rem", fontWeight: 600 },
  footer: { padding: "10px 18px 14px", borderTop: `1px solid ${colors.border}`, display: "flex", justifyContent: "flex-end", gap: 8 },
  btnGhost: { background: "transparent", border: `1px solid ${colors.border}`, color: "inherit", borderRadius: 999, padding: ".45rem .9rem", cursor: "pointer", fontSize: ".85rem" },
  btnPrimary: { background: "#00b89c", border: "none", color: "#fff", borderRadius: 999, padding: ".45rem 1.1rem", cursor: "pointer", fontSize: ".85rem", fontWeight: 600 },
  yearRow: { display: "flex", gap: 8, flexWrap: "wrap" },
  yearChip: { height: 32, padding: "0 12px", borderRadius: 9999, background: "var(--bg-input)", border: "1px solid var(--border)", color: "inherit", cursor: "pointer", fontSize: ".8rem" },
  yearChipActive: { background: "var(--ip-teal)", color: "var(--on-color)", borderColor: "var(--ip-teal)" },
  yearChipDisabled: { opacity: 0.45, cursor: "not-allowed" },
  checkboxRow: { display: "flex", alignItems: "center", fontSize: ".85rem" },
};
