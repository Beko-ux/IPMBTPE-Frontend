// src/components/InscrireEtudiantModal.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { Calendar, Upload } from "lucide-react";

/* ————— Dictionnaires ————— */
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
      ["Gestion des Ressources Humaines", "GRH"],
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
        ["Géométrie Topographe", "GTP"],
        ["Installation Sanitaire", "INS"],
      ],
      "Génie Informatique": [
        ["Génie Logiciel", "GLI"],
        ["E-Commerce et Marketing Numérique", "ECM"],
        ["Maintenance Systèmes Informatiques", "GSI"],
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

/* ————— Années académiques ————— */
function buildAcademicYears() {
  const start = 2025; // 2025-2026 = première année
  const thisYear = new Date().getFullYear();
  const end = thisYear + 6;
  const out = [];
  for (let y = start; y <= end; y++) out.push(`${y}-${y + 1}`);
  return out;
}

/* ————— Cycles → années autorisées ————— */
const CYCLE_RULES = {
  BTS: [1, 2],
  LICENCE: [3],
  MASTER: [4, 5],
  "INGÉNIEUR": [1, 2, 3, 4, 5],
};

export default function InscrireEtudiantModal({ open, onClose, onSave }) {
  const [form, setForm] = useState({
    lastName: "",
    firstName: "",
    birthDate: "",
    academicYear: "",
    filiere: "",
    specialite: "",
    specialiteCode: "",
    option: "",
    optionCode: "",
    cycle: "",
    studyYear: null,
    contact: "+237 6",
    email: "",
    classRole: "Aucune",
    schoolRole: "Aucune",
    registrationFeePaid: false, // ← nouveau champ
    photoFile: null,
    photoPreview: "",
  });
  const [errors, setErrors] = useState({});
  const overlayRef = useRef(null);
  const AY_LIST = useMemo(buildAcademicYears, []);

  const setField = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  // valeur par défaut pour l’année académique
  useEffect(() => {
    if (!form.academicYear && AY_LIST.length) setField("academicYear", AY_LIST[0]);
    // eslint-disable-next-line
  }, [AY_LIST]);

  const currentConf = useMemo(
    () => (form.filiere ? DICT[form.filiere] : null),
    [form.filiere]
  );
  const isIndus = currentConf?.type === "industriel";
  const specialites = currentConf?.specialites || [];
  const options =
    isIndus && form.specialite
      ? currentConf.optionsBySpecialite[form.specialite] || []
      : [];

  // reset dépendances sur changement de filière
  useEffect(() => {
    setForm((f) => ({
      ...f,
      specialite: "",
      specialiteCode: "",
      option: "",
      optionCode: "",
    }));
  }, [form.filiere]); // eslint-disable-line

  useEffect(() => {
    if (isIndus)
      setForm((f) => ({ ...f, option: "", optionCode: "" }));
  }, [form.specialite, isIndus]);

  if (!open) return null;

  /* ————— Téléphone CM (+237 6XXXXXXXX) ————— */
  const onPhoneChange = (e) => {
    let v = e.target.value.replace(/[^\d+ ]/g, "");
    if (!v.startsWith("+237 6"))
      v = "+237 6" + v.replace(/^\+?237?\s?6?/, "");
    const tail = v
      .replace("+237 6", "")
      .replace(/\D/g, "")
      .slice(0, 8);
    setField("contact", `+237 6${tail}`);
  };

  /* ————— Spécialité / Option codes ————— */
  const onSelectSpecialite = (value) => {
    let code = "";
    const entry = specialites.find(([label]) => label === value);
    if (entry) code = entry[1] || "";
    setForm((f) => ({
      ...f,
      specialite: value,
      specialiteCode: code,
    }));
  };
  const onSelectOption = (value) => {
    let code = "";
    const entry = options.find(([label]) => label === value);
    if (entry) code = entry[1] || "";
    setForm((f) => ({ ...f, option: value, optionCode: code }));
  };

  /* ————— Cycle / Année ————— */
  const allowedYears = form.cycle ? CYCLE_RULES[form.cycle] : [];
  const pickYear = (y) => {
    if (!allowedYears.includes(y)) return;
    setField("studyYear", y === form.studyYear ? null : y); // une seule active
  };

  /* ————— Photo ————— */
  const onPhotoChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () =>
      setForm((f) => ({
        ...f,
        photoFile: file,
        photoPreview: reader.result,
      }));
    reader.readAsDataURL(file);
  };

  /* ————— Validation ————— */
  const validate = () => {
    const err = {};
    if (!form.lastName.trim()) err.lastName = "Champ obligatoire";
    if (!form.firstName.trim()) err.firstName = "Champ obligatoire";
    if (!form.birthDate) err.birthDate = "Champ obligatoire";
    if (!form.academicYear) err.academicYear = "Champ obligatoire";
    if (!form.filiere) err.filiere = "Champ obligatoire";
    if (!form.specialite) err.specialite = "Champ obligatoire";
    if (!form.cycle) err.cycle = "Champ obligatoire";
    if (!form.studyYear) err.studyYear = "Sélectionnez une année d’étude";
    setErrors(err);
    return Object.keys(err).length === 0;
  };

  const submit = () => {
    if (!validate()) return;

    // si l’utilisateur n’a laissé que le préfixe, on envoie chaîne vide
    const tail = form.contact.replace("+237 6", "").replace(/\D/g, "");
    const contact = tail.length === 0 ? "" : form.contact;

    onSave?.({ ...form, contact });
  };

  const inputStyle = (invalid) => ({
    width: "100%",
    height: 42,
    background: "var(--bg-input)",
    border: `1px solid ${invalid ? "var(--danger)" : "var(--border)"}`,
    borderRadius: 10,
    padding: "0 .75rem",
    outline: "none",
    fontSize: ".95rem",
    color: "inherit",
    boxSizing: "border-box",
  });

  return (
    <div ref={overlayRef} style={sx.overlay}>
      <div
        style={sx.modal}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* Titre (pas de bouton X) */}
        <div style={sx.head}>
          <h3 style={sx.title}>Inscrire un nouvel étudiant</h3>
        </div>

        <div style={sx.content}>
          <p style={sx.help}>
            Remplissez les informations de l’étudiant. Le matricule
            sera généré automatiquement.
          </p>

          <div style={sx.grid}>
            <div style={sx.field}>
              <label style={sx.label}>Nom *</label>
              <input
                style={inputStyle(errors.lastName)}
                placeholder="NOM"
                value={form.lastName}
                onChange={(e) =>
                  setField("lastName", e.target.value)
                }
              />
              {errors.lastName && (
                <small style={sx.err}>{errors.lastName}</small>
              )}
            </div>

            <div style={sx.field}>
              <label style={sx.label}>Prénoms *</label>
              <input
                style={inputStyle(errors.firstName)}
                placeholder="Prénoms"
                value={form.firstName}
                onChange={(e) =>
                  setField("firstName", e.target.value)
                }
              />
              {errors.firstName && (
                <small style={sx.err}>{errors.firstName}</small>
              )}
            </div>

            <div style={sx.field}>
              <label style={sx.label}>Date de naissance *</label>
              <div style={sx.inputWrap}>
                <span style={sx.leftIcon}>
                  <Calendar size={16} />
                </span>
                <input
                  type="date"
                  style={{
                    ...inputStyle(errors.birthDate),
                    paddingLeft: 34,
                  }}
                  value={form.birthDate}
                  onChange={(e) =>
                    setField("birthDate", e.target.value)
                  }
                />
              </div>
              {errors.birthDate && (
                <small style={sx.err}>{errors.birthDate}</small>
              )}
            </div>

            <div style={sx.field}>
              <label style={sx.label}>Année académique *</label>
              <select
                style={inputStyle(errors.academicYear)}
                value={form.academicYear}
                onChange={(e) =>
                  setField("academicYear", e.target.value)
                }
              >
                {AY_LIST.map((ay) => (
                  <option key={ay} value={ay}>
                    {ay}
                  </option>
                ))}
              </select>
              {errors.academicYear && (
                <small style={sx.err}>{errors.academicYear}</small>
              )}
            </div>

            <div style={sx.field}>
              <label style={sx.label}>Filière *</label>
              <select
                style={inputStyle(errors.filiere)}
                value={form.filiere}
                onChange={(e) =>
                  setField("filiere", e.target.value)
                }
              >
                <option value="">
                  Sélectionner une filière
                </option>
                <option>Filières industrielles</option>
                <option>Filières de gestion</option>
                <option>Filières carrières juridiques</option>
              </select>
              {errors.filiere && (
                <small style={sx.err}>{errors.filiere}</small>
              )}
            </div>

            <div style={sx.field}>
              <label style={sx.label}>Spécialité *</label>
              <select
                style={inputStyle(errors.specialite)}
                value={form.specialite}
                onChange={(e) =>
                  onSelectSpecialite(e.target.value)
                }
                disabled={!currentConf}
              >
                <option value="">
                  Sélectionner une spécialité
                </option>
                {specialites.map(([label]) => (
                  <option key={label}>{label}</option>
                ))}
              </select>
              {!isIndus &&
                form.specialite &&
                form.specialiteCode && (
                  <small style={sx.hint}>
                    Abréviation : <b>{form.specialiteCode}</b>
                  </small>
                )}
              {errors.specialite && (
                <small style={sx.err}>{errors.specialite}</small>
              )}
            </div>

            {isIndus && (
              <div style={sx.field}>
                <label style={sx.label}>Option</label>
                <select
                  style={inputStyle(false)}
                  value={form.option}
                  onChange={(e) =>
                    onSelectOption(e.target.value)
                  }
                  disabled={!form.specialite}
                >
                  <option value="">
                    Sélectionner une option
                  </option>
                  {options.map(([label]) => (
                    <option key={label}>{label}</option>
                  ))}
                </select>
                {form.option && form.optionCode && (
                  <small style={sx.hint}>
                    Abréviation : <b>{form.optionCode}</b>
                  </small>
                )}
              </div>
            )}

            <div style={sx.field}>
              <label style={sx.label}>Cycle *</label>
              <select
                style={inputStyle(errors.cycle)}
                value={form.cycle}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    cycle: e.target.value,
                    studyYear: null,
                  }))
                }
              >
                <option value="">
                  Sélectionner un cycle
                </option>
                <option value="BTS">BTS</option>
                <option value="LICENCE">LICENCE</option>
                <option value="MASTER">MASTER</option>
                <option value="INGÉNIEUR">INGÉNIEUR</option>
              </select>
              {errors.cycle && (
                <small style={sx.err}>{errors.cycle}</small>
              )}
            </div>

            <div style={sx.field}>
              <label style={sx.label}>Année d’étude *</label>
              <div style={sx.yearRow}>
                {[1, 2, 3, 4, 5].map((y) => {
                  const enabled = allowedYears.includes(y);
                  const active = form.studyYear === y;
                  return (
                    <button
                      key={y}
                      type="button"
                      onClick={() => pickYear(y)}
                      disabled={!enabled}
                      style={{
                        ...sx.yearChip,
                        ...(enabled ? {} : sx.yearChipDisabled),
                        ...(active ? sx.yearChipActive : {}),
                      }}
                    >
                      {y === 1 ? "1re" : `${y}e`} Année
                    </button>
                  );
                })}
              </div>
              {errors.studyYear && (
                <small style={sx.err}>{errors.studyYear}</small>
              )}
            </div>

            <div style={sx.field}>
              <label style={sx.label}>
                Contact (Cameroun)
              </label>
              <input
                style={inputStyle(false)}
                value={form.contact}
                onChange={onPhoneChange}
                inputMode="numeric"
                placeholder="+237 6XXXXXXXX"
              />
              <small style={sx.hint}>
                Format : +237 6 suivi de 8 chiffres
              </small>
            </div>

            {/* Paiement des frais d’inscription */}
            <div style={sx.field}>
              <label style={sx.label}>
                Paiement des frais d’inscription
              </label>
              <select
                style={inputStyle(false)}
                value={
                  form.registrationFeePaid ? "yes" : "no"
                }
                onChange={(e) =>
                  setField(
                    "registrationFeePaid",
                    e.target.value === "yes"
                  )
                }
              >
                <option value="no">Non payé</option>
                <option value="yes">Payé</option>
              </select>
            </div>

            <div style={sx.field}>
              <label style={sx.label}>Email</label>
              <input
                style={inputStyle(false)}
                placeholder="prenom.nom@student.ipmbtpe"
                value={form.email}
                onChange={(e) =>
                  setField("email", e.target.value)
                }
              />
            </div>

            <div style={sx.field}>
              <label style={sx.label}>
                Responsabilité de classe
              </label>
              <select
                style={inputStyle(false)}
                value={form.classRole}
                onChange={(e) =>
                  setField("classRole", e.target.value)
                }
              >
                <option>Aucune</option>
                <option>Délégué</option>
                <option>Adjoint</option>
              </select>
            </div>

            <div style={sx.field}>
              <label style={sx.label}>
                Responsabilité de l’établissement
              </label>
              <select
                style={inputStyle(false)}
                value={form.schoolRole}
                onChange={(e) =>
                  setField("schoolRole", e.target.value)
                }
              >
                <option>Aucune</option>
                <option>PRÉSIDENT</option>
                <option>VICE-PRÉSIDENTE</option>
                <option>SECRÉTAIRE GÉNÉRALE</option>
                <option>TRÉSORIERS</option>
                <option>CENSEUR</option>
                <option>DÉLÉGUÉ DU PÔLE ÉVÉNEMENT</option>
                <option>DÉLÉGUÉ DU PÔLE COMMUNICATION</option>
                <option>
                  DÉLÉGUÉ EN CHARGE DES SPONSORINGS
                </option>
                <option>
                  DÉLÉGUÉ DES RELATIONS EXTÉRIEURES
                </option>
                <option>
                  DÉLÉGUÉ EN CHARGE DU CONTRÔLE
                  DISCIPLINAIRE ET DE L&apos;INSALUBRITÉ
                </option>
                <option>
                  DÉLÉGUÉ DES AFFAIRES SPORTIVES
                </option>
              </select>
            </div>

            <div style={{ gridColumn: "1 / -1" }}>
              <label style={sx.label}>
                Photo de l’étudiant
              </label>
              {!form.photoPreview ? (
                <label style={sx.uploadBox}>
                  <Upload
                    size={16}
                    style={{ marginRight: 8 }}
                  />
                  <span>Choisir une image</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={onPhotoChange}
                    style={{ display: "none" }}
                  />
                </label>
              ) : (
                <div style={sx.photoRow}>
                  <img
                    src={form.photoPreview}
                    alt="Aperçu"
                    style={sx.photo}
                  />
                  <button
                    type="button"
                    style={sx.linkBtn}
                    onClick={() =>
                      setForm((f) => ({
                        ...f,
                        photoFile: null,
                        photoPreview: "",
                      }))
                    }
                  >
                    Retirer la photo
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={sx.actions}>
          <button
            type="button"
            onClick={onClose}
            style={sx.btnGhost}
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={submit}
            style={sx.btnPrimary}
          >
            Enregistrer
          </button>
        </div>
      </div>
    </div>
  );
}

/* ————— Styles (tokens.css) ————— */
const sx = {
  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,.35)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "1rem",
    zIndex: 50,
  },
  modal: {
    width: "min(860px, 96vw)",
    maxHeight: "90vh",
    background: "var(--bg)",
    color: "var(--fg)",
    border: "1px solid var(--border)",
    borderRadius: 12,
    boxShadow: "0 10px 30px rgba(0,0,0,.15)",
    display: "flex",
    flexDirection: "column",
  },
  head: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "14px 16px",
    borderBottom: "1px solid var(--border)",
  },
  title: { margin: 0, fontWeight: 700, fontSize: "1.1rem" },

  content: { padding: "12px 16px 0", overflowY: "auto" },
  help: {
    margin: "0 0 12px",
    color: "var(--ip-gray)",
    fontSize: ".9rem",
  },

  grid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    columnGap: 12,
    rowGap: 12,
  },

  field: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
    minWidth: 0,
  },
  label: { fontSize: ".85rem", fontWeight: 600 },

  inputWrap: { position: "relative" },
  leftIcon: {
    position: "absolute",
    left: 10,
    top: "50%",
    transform: "translateY(-50%)",
    color: "var(--ip-gray)",
    pointerEvents: "none",
  },

  yearRow: { display: "flex", gap: 8, flexWrap: "wrap" },
  yearChip: {
    height: 36,
    padding: "0 12px",
    borderRadius: 9999,
    background: "var(--bg-input)",
    border: "1px solid var(--border)",
    color: "inherit",
    cursor: "pointer",
  },
  yearChipActive: {
    background: "var(--ip-teal)",
    color: "var(--on-color)",
    borderColor: "var(--ip-teal)",
  },
  yearChipDisabled: { opacity: 0.5, cursor: "not-allowed" },

  uploadBox: {
    width: "100%",
    minHeight: 140,
    borderRadius: 10,
    border: "1px dashed var(--border)",
    background: "var(--bg-muted)",
    color: "inherit",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "0 16px",
    cursor: "pointer",
    boxSizing: "border-box",
  },
  photoRow: { display: "flex", alignItems: "center", gap: 12 },
  photo: {
    width: 72,
    height: 72,
    objectFit: "cover",
    borderRadius: 12,
    border: "1px solid var(--border)",
  },
  linkBtn: {
    background: "transparent",
    border: "none",
    color: "var(--ip-teal)",
    cursor: "pointer",
    padding: 0,
    textDecoration: "underline",
  },

  hint: {
    marginTop: 4,
    fontSize: ".75rem",
    color: "var(--ip-gray)",
  },
  err: { marginTop: 4, fontSize: ".75rem", color: "var(--danger)" },

  actions: {
    padding: "12px 16px",
    borderTop: "1px solid var(--border)",
    display: "flex",
    justifyContent: "flex-end",
    gap: 8,
  },
  btnGhost: {
    background: "transparent",
    border: "1px solid var(--border)",
    color: "inherit",
    borderRadius: 10,
    padding: ".55rem 1rem",
    cursor: "pointer",
  },
  btnPrimary: {
    background: "var(--ip-teal)",
    color: "var(--on-color)",
    border: "1px solid var(--ip-teal)",
    borderRadius: 10,
    padding: ".55rem 1rem",
    fontWeight: 600,
    cursor: "pointer",
  },
};
