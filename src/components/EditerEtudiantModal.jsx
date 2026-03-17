// src/components/EditerEtudiantModal.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { Calendar } from "lucide-react";

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

/* ————— Régions du Cameroun → départements ————— */
const CM_REGIONS = {
  Adamaoua: ["Djérem", "Faro-et-Déo", "Mayo-Banyo", "Mbéré", "Vina"],
  Centre: [
    "Haute-Sanaga",
    "Lekié",
    "Mbam-et-Inoubou",
    "Mbam-et-Kim",
    "Méfou-et-Afamba",
    "Méfou-et-Akono",
    "Mfoundi",
    "Nyong-et-Kellé",
    "Nyong-et-Mfoumou",
    "Nyong-et-So’o",
  ],
  Est: ["Boumba-et-Ngoko", "Haut-Nyong", "Kadey", "Lom-et-Djérem"],
  "Extrême-Nord": [
    "Diamaré",
    "Logone-et-Chari",
    "Mayo-Danay",
    "Mayo-Kani",
    "Mayo-Sava",
    "Mayo-Tsanaga",
  ],
  Littoral: ["Moungo", "Nkam", "Sanaga-Maritime", "Wouri"],
  Nord: ["Bénoué", "Faro", "Mayo-Louti", "Mayo-Rey"],
  "Nord-Ouest": [
    "Boyo",
    "Bui",
    "Donga-Mantung",
    "Mezam",
    "Momo",
    "Ngoketunjia",
    "Menchum",
  ],
  Ouest: [
    "Bamboutos",
    "Haut-Nkam",
    "Hauts-Plateaux",
    "Koung-Khi",
    "Menoua",
    "Mifi",
    "Ndé",
    "Noun",
  ],
  Sud: ["Dja-et-Lobo", "Mvila", "Océan", "Vallée-du-Ntem"],
  "Sud-Ouest": [
    "Fako",
    "Koupé-Manengouba",
    "Lebialem",
    "Manyu",
    "Meme",
    "Ndian",
  ],
};

/* ————— Diplômes possibles selon le cycle ————— */
const DIPLOMA_OPTIONS = {
  BTS: [
    "BEPC",
    "Probatoire",
    "Baccalauréat",
    "GCE O-Level",
    "GCE A-Level",
    "BT",
    "CAP",
  ],
  LICENCE: ["Baccalauréat / GCE A-Level", "BTS", "HND", "DUT"],
  MASTER: ["Licence", "Bachelor", "Maîtrise"],
  "INGÉNIEUR": [
    "Baccalauréat / GCE A-Level",
    "BTS",
    "HND",
    "DUT",
    "Licence",
  ],
};

function buildAcademicYears() {
  const start = 2025;
  const thisYear = new Date().getFullYear();
  const end = thisYear + 6;
  const out = [];
  for (let y = start; y <= end; y++) out.push(`${y}-${y + 1}`);
  return out;
}

const CYCLE_RULES = {
  BTS: [1, 2],
  LICENCE: [3],
  MASTER: [4, 5],
  "INGÉNIEUR": [1, 2, 3, 4, 5],
};

/* =========================================================
   Helper: reconstruire specialite/option depuis les codes
   ========================================================= */
function hydrateSchoolChoicesFromStudent(student) {
  const filiere = student?.filiere || "";
  const conf = DICT[filiere];

  let specialite = student?.specialite || "";
  let specialiteCode = student?.specialiteCode || "";
  let option = student?.option || "";
  let optionCode = student?.optionCode || "";

  if (!conf) {
    return { filiere, specialite, specialiteCode, option, optionCode };
  }

  if (conf.type === "gestion" || conf.type === "juridique") {
    if (!specialite && specialiteCode) {
      const found = conf.specialites.find(([, c]) => c === specialiteCode);
      if (found) specialite = found[0];
    }

    if (specialite && !specialiteCode) {
      const found = conf.specialites.find(([label]) => label === specialite);
      if (found) specialiteCode = found[1] || "";
    }

    option = "";
    optionCode = "";
  }

  if (conf.type === "industriel") {
    if ((!specialite || !option) && optionCode) {
      for (const [specName, optList] of Object.entries(
        conf.optionsBySpecialite || {}
      )) {
        const foundOpt = (optList || []).find(([, c]) => c === optionCode);
        if (foundOpt) {
          specialite = specName;
          option = foundOpt[0];
          break;
        }
      }
    }

    if (specialite && !option && optionCode) {
      const optList = conf.optionsBySpecialite[specialite] || [];
      const foundOpt = optList.find(([, c]) => c === optionCode);
      if (foundOpt) option = foundOpt[0];
    }

    if (specialite && option && !optionCode) {
      const optList = conf.optionsBySpecialite[specialite] || [];
      const foundOpt = optList.find(([label]) => label === option);
      if (foundOpt) optionCode = foundOpt[1] || "";
    }
  }

  return { filiere, specialite, specialiteCode, option, optionCode };
}

export default function EditerEtudiantModal({
  open,
  student,
  onClose,
  onSave,
}) {
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
    registrationFeePaid: false,
    photoUrl: "",

    livingLanguage: "",
    bacSerie: "",
    birthPlace: "",
    quartierHabitation: "",
    regionOrigine: "",
    departementOrigine: "",
    canal: "",
    hasJob: false,
    jobDetail: "",
    hasDisease: false,
    diseaseDetail: "",
    emergencyName: "",
    emergencyAddress: "",
    emergencyPhone: "",
    emergencyProfession: "",
    emergencyRelation: "",
    lastSchool: "",
    lastDiplomaYear: "",
    diplomaPresented: "",
  });

  const [errors, setErrors] = useState({});
  const AY_LIST = useMemo(buildAcademicYears, []);

  const prevFiliereRef = useRef(null);
  const prevSpecialiteRef = useRef(null);

  useEffect(() => {
    if (!open || !student) return;

    prevFiliereRef.current = null;
    prevSpecialiteRef.current = null;

    const hydrated = hydrateSchoolChoicesFromStudent(student);

    setForm({
      lastName: student.lastName || "",
      firstName: student.firstName || "",
      birthDate: student.birthDate || "",
      academicYear: student.academicYear || AY_LIST[0] || "",

      filiere: hydrated.filiere || "",
      specialite: hydrated.specialite || "",
      specialiteCode: hydrated.specialiteCode || "",
      option: hydrated.option || "",
      optionCode: hydrated.optionCode || "",

      cycle: student.cycle || "",
      studyYear: student.studyYear || null,
      contact: student.contact || "+237 6",
      email: student.email || "",
      classRole: student.classRole || "Aucune",
      schoolRole: student.schoolRole || "Aucune",
      registrationFeePaid: !!student.registrationFeePaid,
      photoUrl:
  typeof payload.photoPreview !== "undefined" ? payload.photoPreview : null,

      livingLanguage: student.livingLanguage || "",
      bacSerie: student.bacSerie || "",
      birthPlace: student.birthPlace || "",
      quartierHabitation: student.quartierHabitation || "",
      regionOrigine: student.regionOrigine || "",
      departementOrigine: student.departementOrigine || "",
      canal: student.canal || "",
      hasJob: !!student.hasJob,
      jobDetail: student.jobDetail || "",
      hasDisease: !!student.hasDisease,
      diseaseDetail: student.diseaseDetail || "",
      emergencyName: student.emergencyName || "",
      emergencyAddress: student.emergencyAddress || "",
      emergencyPhone: student.emergencyPhone || "",
      emergencyProfession: student.emergencyProfession || "",
      emergencyRelation: student.emergencyRelation || "",
      lastSchool: student.lastSchool || "",
      lastDiplomaYear: student.lastDiplomaYear || "",
      diplomaPresented: student.diplomaPresented || "",
    });

    setErrors({});
  }, [open, student, AY_LIST]);

  const setField = (k, v) => setForm((f) => ({ ...f, [k]: v }));

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

  const regionList = Object.keys(CM_REGIONS);
  const departementList = form.regionOrigine
    ? CM_REGIONS[form.regionOrigine] || []
    : [];

  const diplomaList = DIPLOMA_OPTIONS[form.cycle] || [];

  useEffect(() => {
    if (
      prevFiliereRef.current !== null &&
      prevFiliereRef.current !== form.filiere
    ) {
      setForm((f) => ({
        ...f,
        specialite: "",
        specialiteCode: "",
        option: "",
        optionCode: "",
      }));
    }
    prevFiliereRef.current = form.filiere;
  }, [form.filiere]);

  useEffect(() => {
    if (!isIndus) {
      prevSpecialiteRef.current = form.specialite;
      return;
    }

    if (
      prevSpecialiteRef.current !== null &&
      prevSpecialiteRef.current !== form.specialite
    ) {
      setForm((f) => ({
        ...f,
        option: "",
        optionCode: "",
      }));
    }

    prevSpecialiteRef.current = form.specialite;
  }, [form.specialite, isIndus]);

  useEffect(() => {
    if (!form.regionOrigine) {
      setField("departementOrigine", "");
      return;
    }
    const allowed = CM_REGIONS[form.regionOrigine] || [];
    if (!allowed.includes(form.departementOrigine)) {
      setField("departementOrigine", "");
    }
  }, [form.regionOrigine]);

  if (!open || !student) return null;

  const onPhoneChange = (e) => {
    let v = e.target.value.replace(/[^\d+ ]/g, "");
    if (!v.startsWith("+237 6")) {
      v = "+237 6" + v.replace(/^\+?237?\s?6?/, "");
    }
    const tail = v.replace("+237 6", "").replace(/\D/g, "").slice(0, 8);
    setField("contact", `+237 6${tail}`);
  };

  const onPhotoChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Veuillez sélectionner une image.");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      alert("Image trop lourde (max 2MB).");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setField("photoUrl", reader.result);
    };
    reader.readAsDataURL(file);
  };

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

    setForm((f) => ({
      ...f,
      option: value,
      optionCode: code,
    }));
  };

  const allowedYears = form.cycle ? CYCLE_RULES[form.cycle] : [];

  const pickYear = (y) => {
    if (!allowedYears.includes(y)) return;
    setField("studyYear", y === form.studyYear ? null : y);
  };

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

    const tail = form.contact.replace("+237 6", "").replace(/\D/g, "");
    const contact = tail.length === 0 ? "" : form.contact;

    onSave?.({
      id: student.id,
      ...form,
      contact,
    });
  };

  const inputStyle = (invalid, extra = {}) => ({
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
    ...extra,
  });

  const disabledNoteStyle = {
    fontSize: ".75rem",
    color: "var(--ip-gray)",
    marginTop: 4,
  };

  const alreadyPaid = !!student?.registrationFeePaid;

  return (
    <div style={sx.overlay} onMouseDown={onClose}>
      <div style={sx.modal} onMouseDown={(e) => e.stopPropagation()}>
        <div style={sx.head}>
          <div>
            <h3 style={sx.title}>Modifier les informations de l’étudiant</h3>
            <p style={sx.sub}>
              Matricule : <strong>{student.matricule || "Non généré"}</strong>
            </p>
          </div>
        </div>

        <div style={sx.content}>
          <div style={sx.sectionTitle}>Identité & scolarité</div>

          <div style={sx.grid}>
            <div style={sx.field}>
              <label style={sx.label}>Nom *</label>
              <input
                style={inputStyle(errors.lastName)}
                placeholder="NOM"
                value={form.lastName}
                disabled
                onChange={() => {}}
              />
              <small style={disabledNoteStyle}>
                Non modifiable (donnée d’identification).
              </small>
            </div>

            <div style={sx.field}>
              <label style={sx.label}>Prénoms *</label>
              <input
                style={inputStyle(errors.firstName)}
                placeholder="Prénoms"
                value={form.firstName}
                disabled
                onChange={() => {}}
              />
              <small style={disabledNoteStyle}>
                Non modifiable (donnée d’identification).
              </small>
            </div>

            <div style={sx.field}>
              <label style={sx.label}>Date de naissance *</label>
              <div style={sx.inputWrap}>
                <span style={sx.leftIcon}>
                  <Calendar size={16} />
                </span>
                <input
                  type="date"
                  style={inputStyle(errors.birthDate, { paddingLeft: 34 })}
                  value={form.birthDate}
                  disabled
                  onChange={() => {}}
                />
              </div>
              <small style={disabledNoteStyle}>
                Non modifiable (donnée d’identification).
              </small>
            </div>

            <div style={sx.field}>
              <label style={sx.label}>Année académique *</label>
              <select
                style={inputStyle(errors.academicYear)}
                value={form.academicYear}
                disabled
                onChange={() => {}}
              >
                <option value="">Sélectionner</option>
                {AY_LIST.map((ay) => (
                  <option key={ay} value={ay}>
                    {ay}
                  </option>
                ))}
              </select>
              <small style={disabledNoteStyle}>
                Non modifiable (année de l’inscription).
              </small>
            </div>

            <div style={sx.field}>
              <label style={sx.label}>Photo de l’étudiant</label>
              <div style={sx.photoRow}>
                <div style={sx.photoPreview}>
                  {form.photoUrl ? (
                    <img
                      src={form.photoUrl}
                      alt="Photo étudiant"
                      style={sx.photoImg}
                    />
                  ) : (
                    <div style={sx.photoPlaceholder}>Aucune photo</div>
                  )}
                </div>

                <div style={sx.photoActions}>
                  <input type="file" accept="image/*" onChange={onPhotoChange} />
                  {form.photoUrl && (
                    <button
                      type="button"
                      style={sx.photoRemoveBtn}
                      onClick={() => setField("photoUrl", "")}
                    >
                      Retirer
                    </button>
                  )}
                </div>
              </div>
              <small style={sx.hint}>
                Visible sur badge et carte d’étudiant.
              </small>
            </div>

            <div style={sx.field}>
              <label style={sx.label}>Filière *</label>
              <select
                style={inputStyle(errors.filiere)}
                value={form.filiere}
                onChange={(e) => setField("filiere", e.target.value)}
              >
                <option value="">Sélectionner une filière</option>
                <option>Filières industrielles</option>
                <option>Filières de gestion</option>
                <option>Filières carrières juridiques</option>
              </select>
              {errors.filiere && <small style={sx.err}>{errors.filiere}</small>}
            </div>

            <div style={sx.field}>
              <label style={sx.label}>Spécialité *</label>
              <select
                style={inputStyle(errors.specialite)}
                value={form.specialite}
                onChange={(e) => onSelectSpecialite(e.target.value)}
                disabled={!currentConf}
              >
                <option value="">Sélectionner une spécialité</option>
                {specialites.map(([label]) => (
                  <option key={label}>{label}</option>
                ))}
              </select>

              {!isIndus && form.specialite && form.specialiteCode && (
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
                  onChange={(e) => onSelectOption(e.target.value)}
                  disabled={!form.specialite}
                >
                  <option value="">Sélectionner une option</option>
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
                    diplomaPresented: "",
                  }))
                }
              >
                <option value="">Sélectionner un cycle</option>
                <option value="BTS">BTS</option>
                <option value="LICENCE">LICENCE</option>
                <option value="MASTER">MASTER</option>
                <option value="INGÉNIEUR">INGÉNIEUR</option>
              </select>
              {errors.cycle && <small style={sx.err}>{errors.cycle}</small>}
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
              <label style={sx.label}>Contact (Cameroun)</label>
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

            <div style={sx.field}>
              <label style={sx.label}>E-mail</label>
              <input
                style={inputStyle(false)}
                placeholder="prenom.nom@student.ipmbtpe"
                value={form.email}
                onChange={(e) => setField("email", e.target.value)}
              />
            </div>

            <div style={sx.field}>
              <label style={sx.label}>Paiement des frais d’inscription</label>
              <select
                style={inputStyle(false)}
                value={form.registrationFeePaid ? "yes" : "no"}
                disabled={alreadyPaid}
                onChange={(e) =>
                  setField("registrationFeePaid", e.target.value === "yes")
                }
              >
                <option value="no">Non payé</option>
                <option value="yes">Payé</option>
              </select>
              {alreadyPaid && (
                <small style={disabledNoteStyle}>
                  Déjà payé : impossible de revenir à « Non payé ».
                </small>
              )}
            </div>

            <div style={sx.field}>
              <label style={sx.label}>Responsabilité de classe</label>
              <select
                style={inputStyle(false)}
                value={form.classRole}
                onChange={(e) => setField("classRole", e.target.value)}
              >
                <option>Aucune</option>
                <option>Délégué</option>
                <option>Adjoint</option>
              </select>
            </div>

            <div style={sx.field}>
              <label style={sx.label}>Responsabilité de l’établissement</label>
              <select
                style={inputStyle(false)}
                value={form.schoolRole}
                onChange={(e) => setField("schoolRole", e.target.value)}
              >
                <option>Aucune</option>
                <option>PRÉSIDENT</option>
                <option>VICE-PRÉSIDENTE</option>
                <option>SECRÉTAIRE GÉNÉRALE</option>
                <option>TRÉSORIERS</option>
                <option>CENSEUR</option>
                <option>DÉLÉGUÉ DU PÔLE ÉVÉNEMENT</option>
                <option>DÉLÉGUÉ DU PÔLE COMMUNICATION</option>
                <option>DÉLÉGUÉ EN CHARGE DES SPONSORINGS</option>
                <option>DÉLÉGUÉ DES RELATIONS EXTÉRIEURES</option>
                <option>
                  DÉLÉGUÉ EN CHARGE DU CONTRÔLE DISCIPLINAIRE ET DE
                  L&apos;INSALUBRITÉ
                </option>
                <option>DÉLÉGUÉ DES AFFAIRES SPORTIVES</option>
              </select>
            </div>
          </div>

          <div style={sx.sectionSeparator} />
          <div style={sx.sectionTitle}>Informations personnelles</div>

          <div style={sx.grid}>
            <div style={sx.field}>
              <label style={sx.label}>Langue vivante</label>
              <select
                style={inputStyle(false)}
                value={form.livingLanguage}
                onChange={(e) => setField("livingLanguage", e.target.value)}
              >
                <option value="">Sélectionner</option>
                <option value="Français">Français</option>
                <option value="Anglais">Anglais</option>
              </select>
            </div>

            <div style={sx.field}>
              <label style={sx.label}>Série Bac / GCE</label>
              <input
                style={inputStyle(false)}
                placeholder="Ex : C, D, A/L..."
                value={form.bacSerie}
                onChange={(e) => setField("bacSerie", e.target.value)}
              />
            </div>

            <div style={sx.field}>
              <label style={sx.label}>Lieu de naissance</label>
              <input
                style={inputStyle(false)}
                value={form.birthPlace}
                onChange={(e) => setField("birthPlace", e.target.value)}
              />
            </div>

            <div style={sx.field}>
              <label style={sx.label}>Quartier d&apos;habitation</label>
              <input
                style={inputStyle(false)}
                value={form.quartierHabitation}
                onChange={(e) => setField("quartierHabitation", e.target.value)}
              />
            </div>

            <div style={sx.field}>
              <label style={sx.label}>Région d&apos;origine</label>
              <select
                style={inputStyle(false)}
                value={form.regionOrigine}
                onChange={(e) => setField("regionOrigine", e.target.value || "")}
              >
                <option value="">Sélectionner une région</option>
                {regionList.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>

            <div style={sx.field}>
              <label style={sx.label}>Département d&apos;origine</label>
              <select
                style={inputStyle(false)}
                value={form.departementOrigine}
                disabled={!form.regionOrigine}
                onChange={(e) =>
                  setField("departementOrigine", e.target.value || "")
                }
              >
                <option value="">Sélectionner un département</option>
                {departementList.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>

            <div style={sx.field}>
              <label style={sx.label}>
                Canal (comment avez-vous connu l&apos;école ?)
              </label>
              <input
                style={inputStyle(false)}
                value={form.canal}
                onChange={(e) => setField("canal", e.target.value)}
              />
            </div>

            <div style={sx.field}>
              <label style={sx.label}>
                Exercez-vous une activité professionnelle ?
              </label>
              <select
                style={inputStyle(false)}
                value={form.hasJob ? "yes" : "no"}
                onChange={(e) => {
                  const yes = e.target.value === "yes";
                  setForm((f) => ({
                    ...f,
                    hasJob: yes,
                    jobDetail: yes ? f.jobDetail : "",
                  }));
                }}
              >
                <option value="no">Non</option>
                <option value="yes">Oui</option>
              </select>
            </div>

            <div style={sx.field}>
              <label style={sx.label}>Si oui, précisez</label>
              <input
                style={inputStyle(false, {
                  background: form.hasJob
                    ? "var(--bg-input)"
                    : "var(--bg-muted)",
                })}
                value={form.jobDetail}
                onChange={(e) => setField("jobDetail", e.target.value)}
                disabled={!form.hasJob}
              />
            </div>

            <div style={sx.field}>
              <label style={sx.label}>Souffrez-vous d’un mal récurrent ?</label>
              <select
                style={inputStyle(false)}
                value={form.hasDisease ? "yes" : "no"}
                onChange={(e) => {
                  const yes = e.target.value === "yes";
                  setForm((f) => ({
                    ...f,
                    hasDisease: yes,
                    diseaseDetail: yes ? f.diseaseDetail : "",
                  }));
                }}
              >
                <option value="no">Non</option>
                <option value="yes">Oui</option>
              </select>
            </div>

            <div style={sx.field}>
              <label style={sx.label}>Si oui, précisez</label>
              <input
                style={inputStyle(false, {
                  background: form.hasDisease
                    ? "var(--bg-input)"
                    : "var(--bg-muted)",
                })}
                value={form.diseaseDetail}
                onChange={(e) => setField("diseaseDetail", e.target.value)}
                disabled={!form.hasDisease}
              />
            </div>
          </div>

          <div style={sx.sectionSeparator} />
          <div style={sx.sectionTitle}>
            Informations du tuteur / personne ressource
          </div>

          <div style={sx.grid}>
            <div style={sx.field}>
              <label style={sx.label}>
                Personne ressource à contacter (Nom et prénom)
              </label>
              <input
                style={inputStyle(false)}
                value={form.emergencyName}
                onChange={(e) => setField("emergencyName", e.target.value)}
              />
            </div>

            <div style={sx.field}>
              <label style={sx.label}>Adresse</label>
              <input
                style={inputStyle(false)}
                value={form.emergencyAddress}
                onChange={(e) => setField("emergencyAddress", e.target.value)}
              />
            </div>

            <div style={sx.field}>
              <label style={sx.label}>Téléphone</label>
              <input
                style={inputStyle(false)}
                value={form.emergencyPhone}
                onChange={(e) => setField("emergencyPhone", e.target.value)}
              />
            </div>

            <div style={sx.field}>
              <label style={sx.label}>Profession</label>
              <input
                style={inputStyle(false)}
                value={form.emergencyProfession}
                onChange={(e) =>
                  setField("emergencyProfession", e.target.value)
                }
              />
            </div>

            <div style={sx.field}>
              <label style={sx.label}>Nature de vos liens</label>
              <select
                style={inputStyle(false)}
                value={form.emergencyRelation}
                onChange={(e) => setField("emergencyRelation", e.target.value)}
              >
                <option value="">Sélectionner</option>
                <option value="Père">Père</option>
                <option value="Mère">Mère</option>
                <option value="Frère / Sœur">Frère / Sœur</option>
                <option value="Oncle / Tante">Oncle / Tante</option>
                <option value="Grand-parent">Grand-parent</option>
                <option value="Tuteur légal">Tuteur légal</option>
                <option value="Autre">Autre</option>
              </select>
            </div>
          </div>

          <div style={sx.sectionSeparator} />
          <div style={sx.sectionTitle}>Dernier établissement & diplôme</div>

          <div style={sx.grid}>
            <div style={sx.field}>
              <label style={sx.label}>Dernier établissement fréquenté</label>
              <input
                style={inputStyle(false)}
                value={form.lastSchool}
                onChange={(e) => setField("lastSchool", e.target.value)}
              />
            </div>

            <div style={sx.field}>
              <label style={sx.label}>Année d&apos;obtention</label>
              <input
                style={inputStyle(false)}
                type="number"
                min="1980"
                max="2100"
                value={form.lastDiplomaYear}
                onChange={(e) => setField("lastDiplomaYear", e.target.value)}
              />
            </div>

            <div style={sx.field}>
              <label style={sx.label}>
                Diplôme présenté pour l&apos;inscription
              </label>
              <select
                style={inputStyle(false)}
                value={form.diplomaPresented}
                disabled={!form.cycle}
                onChange={(e) => setField("diplomaPresented", e.target.value)}
              >
                <option value="">
                  {form.cycle
                    ? "Sélectionner un diplôme"
                    : "Choisissez d’abord un cycle"}
                </option>
                {diplomaList.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
                {form.cycle && <option value="Autre">Autre</option>}
              </select>
              <small style={sx.hint}>
                La liste varie selon le cycle (BTS, Licence, Master, Ingénieur).
              </small>
            </div>
          </div>
        </div>

        <div style={sx.actions}>
          <button type="button" onClick={onClose} style={sx.btnGhost}>
            Annuler
          </button>
          <button type="button" onClick={submit} style={sx.btnPrimary}>
            Enregistrer les modifications
          </button>
        </div>
      </div>
    </div>
  );
}

/* ————— Styles ————— */
const sx = {
  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,.35)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "1rem",
    zIndex: 60,
  },
  modal: {
    width: "min(900px, 96vw)",
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
  sub: {
    margin: 0,
    marginTop: 4,
    fontSize: ".85rem",
    color: "var(--ip-gray)",
  },

  content: { padding: "12px 16px 8px", overflowY: "auto" },

  sectionTitle: {
    fontWeight: 700,
    fontSize: ".9rem",
    margin: "4px 0 10px",
    color: "var(--ip-gray)",
  },
  sectionSeparator: {
    margin: "16px 0 12px",
    borderTop: "1px dashed var(--border)",
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

  hint: {
    marginTop: 4,
    fontSize: ".75rem",
    color: "var(--ip-gray)",
  },
  err: { marginTop: 4, fontSize: ".75rem", color: "var(--danger)" },

  photoRow: {
    display: "flex",
    gap: 12,
    alignItems: "center",
    flexWrap: "wrap",
  },
  photoPreview: {
    width: 110,
    height: 130,
    borderRadius: 10,
    border: "1px dashed var(--border)",
    background: "var(--bg-input)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  photoImg: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
  },
  photoPlaceholder: {
    fontSize: ".8rem",
    color: "var(--ip-gray)",
    fontWeight: 700,
  },
  photoActions: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
  },
  photoRemoveBtn: {
    height: 34,
    borderRadius: 8,
    border: "1px solid var(--border)",
    background: "#fff",
    cursor: "pointer",
    fontWeight: 600,
  },

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