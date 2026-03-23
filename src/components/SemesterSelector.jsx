// src/components/SemesterSelector.jsx
// ✅ Sélecteur de semestre réutilisable
// Affiche les bons semestres selon le studyYear de la classe sélectionnée
//
// Usage :
//   <SemesterSelector
//     studyYear={1}
//     value="S1"
//     onChange={(val) => setSemester(val)}
//     cycle="BTS"
//     includeAll={false}   // ajoute "Tous les semestres"
//     style={{}}
//   />

import { getFullSemesterOptions } from "../utils/semesters";

export default function SemesterSelector({
  studyYear,
  value,
  onChange,
  cycle = "",
  includeAll = false,
  disabled = false,
  style = {},
  placeholder = "Sélectionner un semestre",
}) {
  const options = studyYear
    ? getFullSemesterOptions(studyYear, cycle)
    : [];

  return (
    <select
      value={value || ""}
      onChange={(e) => onChange?.(e.target.value)}
      disabled={disabled || !studyYear}
      style={{
        height: 38,
        borderRadius: 10,
        border: "1px solid var(--border)",
        padding: "0 0.75rem",
        fontSize: "0.875rem",
        background: disabled ? "var(--bg-muted)" : "var(--bg)",
        color: "var(--fg)",
        cursor: disabled ? "not-allowed" : "pointer",
        outline: "none",
        minWidth: 160,
        ...style,
      }}
    >
      {/* Placeholder */}
      {!value && (
        <option value="" disabled>
          {studyYear ? placeholder : "— Sélectionner d'abord une classe —"}
        </option>
      )}

      {/* Option "tous" */}
      {includeAll && studyYear && (
        <option value="">Tous les semestres</option>
      )}

      {/* Options dynamiques selon studyYear */}
      {options.map((opt) => (
        <option key={opt.value} value={opt.value} title={opt.description}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}

/* ─────────────────────────────────────────────
   Variante compact (pills cliquables)
   Usage :
     <SemesterPills studyYear={2} value="S3" onChange={setSemester} />
───────────────────────────────────────────── */
export function SemesterPills({
  studyYear,
  value,
  onChange,
  cycle = "",
  includeAll = false,
}) {
  const options = studyYear ? getFullSemesterOptions(studyYear, cycle) : [];

  if (!studyYear) {
    return (
      <div style={pillSx.empty}>
        Sélectionner une classe pour voir les semestres
      </div>
    );
  }

  return (
    <div style={pillSx.row}>
      {includeAll && (
        <button
          type="button"
          onClick={() => onChange?.("")}
          style={{ ...pillSx.pill, ...(value === "" ? pillSx.active : {}) }}
        >
          Tous
        </button>
      )}
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange?.(opt.value)}
          title={opt.description}
          style={{
            ...pillSx.pill,
            ...(value === opt.value ? pillSx.active : {}),
          }}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

const pillSx = {
  row: {
    display: "flex",
    gap: 8,
    flexWrap: "wrap",
    alignItems: "center",
  },
  pill: {
    height: 34,
    padding: "0 14px",
    borderRadius: 9999,
    border: "1px solid var(--border)",
    background: "var(--bg)",
    color: "var(--fg)",
    fontSize: "0.82rem",
    fontWeight: 700,
    cursor: "pointer",
    whiteSpace: "nowrap",
    transition: "all 0.15s",
  },
  active: {
    background: "var(--bg-sidebar-hi)",
    borderColor: "var(--ip-teal)",
    color: "var(--ip-teal)",
    fontWeight: 900,
  },
  empty: {
    fontSize: "0.8rem",
    color: "var(--ip-gray)",
    fontStyle: "italic",
    padding: "6px 0",
  },
};