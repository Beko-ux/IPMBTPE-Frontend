// src/pages/DocumentsPage.jsx
import { useState } from "react";
import VerticalNavBar from "../components/VerticalNavBar.jsx";
import HorizontalNavBar from "../components/HorizontalNavBar.jsx";
import {
  Search,
  FileText,
  Download,
  Image as ImageIcon,
  IdCard,
  Users, // icône pour la classe
} from "lucide-react";
import { colors } from "../styles/theme";
import StudentBadgeSheet from "../components/documents/StudentBadgeSheet.jsx";
import ClassNotesBlankSheet from "../components/documents/ClassNotesBlankSheet.jsx";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:4000";

export default function DocumentsPage({
  currentSection = "documents",
  onNavigate,
}) {
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [loading, setLoading] = useState(false);

  // sélection multi-étudiants (illimitée)
  const [badgeSelection, setBadgeSelection] = useState([]);
  const [showBadgeModal, setShowBadgeModal] = useState(false);

  // fiche de report de notes (classe)
  const [showNotesSheetModal, setShowNotesSheetModal] = useState(false);

  // liste complète (chargée seulement quand on clique “Ajouter sa classe”)
  const [allStudents, setAllStudents] = useState([]);
  const [allStudentsLoading, setAllStudentsLoading] = useState(false);

  const handleSearch = async () => {
    const q = query.trim();
    if (!q) {
      setSearchResults([]);
      setSelectedStudent(null);
      setBadgeSelection([]);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(
        `${API_BASE}/students?q=${encodeURIComponent(q)}`
      );
      const data = await res.json();
      const arr = Array.isArray(data) ? data : [];
      setSearchResults(arr);

      if (arr.length === 1) {
        setSelectedStudent(arr[0]);
        setBadgeSelection([arr[0]]);
      } else {
        setSelectedStudent(null);
        setBadgeSelection([]);
      }
    } catch (e) {
      console.error(e);
      setSearchResults([]);
      setSelectedStudent(null);
      setBadgeSelection([]);
    } finally {
      setLoading(false);
    }
  };

  const toggleBadgeStudent = (student) => {
    setBadgeSelection((prev) => {
      const exists = prev.find((s) => s.id === student.id);
      if (exists) return prev.filter((s) => s.id !== student.id);
      return [...prev, student];
    });
  };

  // Charge /students une fois si pas encore fait
  const ensureAllStudentsLoaded = async () => {
    if (allStudents.length > 0 || allStudentsLoading) return allStudents;
    setAllStudentsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/students`);
      const data = await res.json();
      const arr = Array.isArray(data) ? data : [];
      setAllStudents(arr);
      return arr;
    } catch (e) {
      console.error(e);
      setAllStudents([]);
      return [];
    } finally {
      setAllStudentsLoading(false);
    }
  };

  // Une “classe” = même option/specialité + cycle + niveau (studyYear)
  const getClassKey = (s) => {
    if (!s) return "";
    const code = s.optionCode || s.specialiteCode || s.filiere || "";
    const cycle = (s.cycle || "").toString().toLowerCase();
    const level = (s.studyYear || "").toString().toLowerCase();
    return `${code}::${cycle}::${level}`;
  };

  const addSelectedStudentClass = async () => {
    const base = selectedStudent || badgeSelection[0];
    if (!base) {
      alert("Sélectionnez d'abord un étudiant.");
      return;
    }

    const list = await ensureAllStudentsLoaded();
    if (!list.length) {
      alert("Impossible de charger la liste complète des étudiants.");
      return;
    }

    const classKey = getClassKey(base);
    if (!classKey) {
      alert("Classe non identifiable pour cet étudiant.");
      return;
    }

    const classmates = list.filter((s) => getClassKey(s) === classKey);

    if (classmates.length === 0) {
      alert("Aucun autre membre de classe trouvé.");
      return;
    }

    setBadgeSelection((prev) => {
      const ids = new Set(prev.map((p) => p.id));
      classmates.forEach((c) => ids.add(c.id));
      return list.filter((s) => ids.has(s.id));
    });
  };

  const openDocument = (type) => {
    if (!selectedStudent && badgeSelection.length === 0) {
      alert("Veuillez d’abord sélectionner un étudiant.");
      return;
    }

    const targetStudent = selectedStudent || badgeSelection[0];
    const id = targetStudent.id;

    if (type === "badge") {
      if (badgeSelection.length === 0) {
        setBadgeSelection([targetStudent]);
      }
      setShowBadgeModal(true);
      return;
    }

    let url = "";
    switch (type) {
      case "certificate":
        url = `${API_BASE}/documents/${id}/certificate`;
        break;
      case "card":
        url = `${API_BASE}/documents/${id}/card`;
        break;
      default:
        return;
    }
    window.open(url, "_blank", "noopener");
  };

  const isStudentSelected = !!selectedStudent || badgeSelection.length > 0;

  const selectedLabel =
    badgeSelection.length > 0
      ? `${badgeSelection.length} étudiant(s) sélectionné(s)`
      : selectedStudent
      ? `${getFullName(selectedStudent)} · ${
          selectedStudent.matricule || "Sans matricule"
        }`
      : "Aucun étudiant sélectionné";

  return (
    <div style={styles.layout}>
      {/* Colonne gauche */}
      <aside style={styles.left}>
        <VerticalNavBar
          currentSection={currentSection}
          onNavigate={onNavigate}
        />
      </aside>

      {/* Colonne droite */}
      <main style={styles.right}>
        <HorizontalNavBar />

        <div style={styles.pageBody}>
          <div style={styles.container}>
            <header style={{ marginBottom: "1.25rem" }}>
              <h1 style={styles.title}>Génération de documents</h1>
              <p style={styles.subtitle}>
                Certificats, relevés, cartes et fiches de notes.
              </p>
            </header>

            {/* Recherche étudiant */}
            <section style={styles.card}>
              <div style={styles.cardHeader}>
                <h2 style={styles.cardTitle}>Rechercher un étudiant</h2>
                <div style={styles.selectedChip}>{selectedLabel}</div>
              </div>

              <p style={styles.cardHint}>
                Entrez le nom, les prénoms ou le matricule.
                <br />
                Pour les badges, vous pouvez sélectionner autant d&apos;étudiants
                que nécessaire (pagination auto par 4 badges).
              </p>

              <div style={styles.searchRow}>
                <div style={styles.searchInputWrap}>
                  <span style={styles.searchIcon}>
                    <Search size={16} />
                  </span>
                  <input
                    type="text"
                    placeholder="Rechercher..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    style={styles.searchInput}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSearch();
                    }}
                  />
                </div>
                <button
                  type="button"
                  onClick={handleSearch}
                  style={styles.searchButton}
                  disabled={loading}
                >
                  {loading ? "Recherche..." : "Rechercher"}
                </button>

                {/* Ajouter la classe */}
                <button
                  type="button"
                  onClick={addSelectedStudentClass}
                  style={styles.addClassBtn}
                  disabled={!selectedStudent && badgeSelection.length === 0}
                  title="Ajouter tous les membres de la classe de l'étudiant sélectionné"
                >
                  <Users size={14} />
                  {allStudentsLoading ? "Chargement..." : "Ajouter sa classe"}
                </button>
              </div>

              {searchResults.length > 0 && (
                <div style={styles.resultsList}>
                  {searchResults.map((s) => {
                    const active = selectedStudent?.id === s.id;
                    const inBadges = !!badgeSelection.find(
                      (b) => b.id === s.id
                    );
                    return (
                      <div
                        key={s.id}
                        style={{
                          ...styles.resultRow,
                          ...(active ? styles.resultItemActive : {}),
                        }}
                      >
                        <button
                          type="button"
                          style={{
                            ...styles.resultItem,
                            border: "none",
                            background: "transparent",
                          }}
                          onClick={() => setSelectedStudent(s)}
                        >
                          <div style={{ fontWeight: 600, fontSize: ".9rem" }}>
                            {getFullName(s)}
                          </div>
                          <div
                            style={{
                              fontSize: ".8rem",
                              color: "var(--ip-gray)",
                            }}
                          >
                            {s.matricule || "Sans matricule"} · {s.filiere || ""}{" "}
                            {s.optionCode || s.specialiteCode
                              ? ` · ${s.optionCode || s.specialiteCode}`
                              : ""}
                            {s.cycle ? ` · ${s.cycle}` : ""}
                            {s.studyYear ? ` ${s.studyYear}` : ""}
                          </div>
                        </button>

                        <button
                          type="button"
                          style={{
                            ...styles.badgeSelectBtn,
                            backgroundColor: inBadges
                              ? "#059669"
                              : "#F3F4F6",
                            color: inBadges ? "#ffffff" : "#374151",
                          }}
                          onClick={() => toggleBadgeStudent(s)}
                        >
                          {inBadges ? "Retirer" : "Ajouter au badge"}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            {/* Types de documents */}
            <section style={styles.card}>
              <h2 style={styles.cardTitle}>Types de documents disponibles</h2>

              <div style={styles.docGrid}>
                <DocumentTile
                  icon={<FileText size={20} color={colors.teal} />}
                  title="Certificat de scolarité"
                  description={
                    isStudentSelected
                      ? "Document officiel attestant de l’inscription de l’étudiant."
                      : "Sélectionnez un étudiant pour continuer."
                  }
                  disabled={!isStudentSelected}
                  onClick={() => openDocument("certificate")}
                  accent="teal"
                />

                <DocumentTile
                  icon={<Download size={20} color="#9CA3AF" />}
                  title="Relevé de notes"
                  description="Relevé semestriel ou final (à venir)."
                  disabled={true}
                  onClick={() => {}}
                  accent="teal"
                />

                <DocumentTile
                  icon={<ImageIcon size={20} color="#F59E0B" />}
                  title="Carte d’étudiant"
                  description={
                    isStudentSelected
                      ? "Carte format ID-1 (85,6×54mm) avec photo."
                      : "Sélectionnez un étudiant pour continuer."
                  }
                  disabled={!isStudentSelected}
                  onClick={() => openDocument("card")}
                  accent="orange"
                />

                <DocumentTile
                  icon={<IdCard size={20} color="#F59E0B" />}
                  title="Badge étudiant (A6)"
                  description={
                    badgeSelection.length > 0
                      ? `${badgeSelection.length} étudiant(s) sélectionné(s). ${
                          badgeSelection.length <= 4
                            ? "1 page A4"
                            : `${Math.ceil(badgeSelection.length / 4)} pages A4`
                        }`
                      : isStudentSelected
                      ? "Utilisez la liste au-dessus pour ajouter des étudiants."
                      : "Recherchez des étudiants puis ajoutez-les aux badges."
                  }
                  disabled={!isStudentSelected}
                  onClick={() => openDocument("badge")}
                  accent="orange"
                />

                {/* NOUVELLE CARTE : FICHE DE REPORT DE NOTES */}
                <DocumentTile
                  icon={<FileText size={20} color="#2563EB" />}
                  title="Fiche de report de notes (classe)"
                  description="Générer une fiche vierge par classe pour CC / 20 et SN / 20."
                  disabled={false}
                  onClick={() => setShowNotesSheetModal(true)}
                  accent="teal"
                />
              </div>

              {!isStudentSelected && (
                <p style={styles.infoText}>
                  Pour les documents individuels (certificat, carte, badge),
                  sélectionnez d&apos;abord un étudiant. La fiche de report de
                  notes fonctionne par classe.
                </p>
              )}
            </section>
          </div>
        </div>
      </main>

      {showBadgeModal && (
        <StudentBadgeSheet
          students={badgeSelection.length ? badgeSelection : [selectedStudent]}
          onClose={() => setShowBadgeModal(false)}
        />
      )}

      {showNotesSheetModal && (
        <ClassNotesBlankSheet
          onClose={() => setShowNotesSheetModal(false)}
        />
      )}
    </div>
  );
}

function DocumentTile({ icon, title, description, disabled, onClick, accent }) {
  const baseBg = accent === "orange" ? "#FFF7EE" : "#ECF9F6";
  const baseBorder = accent === "orange" ? "#FFD6A0" : "#B4E1D6";

  return (
    <button
      type="button"
      onClick={disabled ? undefined : onClick}
      style={{
        ...styles.docTile,
        backgroundColor: disabled ? "#f5f5f5" : "#ffffff",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.6 : 1,
      }}
    >
      <div
        style={{
          ...styles.docIconWrap,
          backgroundColor: disabled ? "#e4e4e4" : baseBg,
          borderColor: disabled ? "#d0d0d0" : baseBorder,
        }}
      >
        {icon}
      </div>
      <div>
        <p style={styles.docTitle}>{title}</p>
        <p style={styles.docDesc}>{description}</p>
      </div>
    </button>
  );
}

function getFullName(s) {
  const last = (s.lastName || "").toUpperCase();
  const first = s.firstName || "";
  return `${last} ${first}`.trim();
}

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
    borderRight: "1px solid var(--border)",
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
  title: {
    margin: 0,
    fontSize: "1.4rem",
    fontWeight: 700,
  },
  subtitle: {
    margin: 0,
    marginTop: 4,
    fontSize: ".9rem",
    color: "var(--ip-gray)",
  },
  card: {
    background: "#ffffff",
    borderRadius: 12,
    border: "1px solid var(--border)",
    padding: "1rem 1.25rem 1.25rem",
    boxShadow: "0 4px 10px rgba(0,0,0,.02)",
  },
  cardHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "0.75rem",
    marginBottom: 6,
  },
  cardTitle: { margin: 0, fontSize: "1rem", fontWeight: 600 },
  cardHint: {
    margin: 0,
    marginBottom: 8,
    fontSize: ".8rem",
    color: "var(--ip-gray)",
  },
  selectedChip: {
    fontSize: ".75rem",
    borderRadius: 999,
    padding: "0.2rem 0.8rem",
    background: "#f5f5f5",
    color: "#555",
    whiteSpace: "nowrap",
  },
  searchRow: {
    display: "flex",
    gap: "0.5rem",
    alignItems: "center",
    marginTop: 4,
  },
  searchInputWrap: { position: "relative", flex: 1 },
  searchIcon: {
    position: "absolute",
    left: 10,
    top: "50%",
    transform: "translateY(-50%)",
    color: "var(--ip-gray)",
  },
  searchInput: {
    width: "100%",
    height: 44,
    borderRadius: 999,
    border: "1px solid var(--border)",
    padding: "0 1rem 0 34px",
    fontSize: ".9rem",
    outline: "none",
    background: "var(--bg-input)",
  },
  searchButton: {
    height: 44,
    padding: "0 1.4rem",
    borderRadius: 999,
    border: "none",
    background: "var(--ip-teal)",
    color: "var(--on-color)",
    fontSize: ".9rem",
    fontWeight: 600,
    cursor: "pointer",
    whiteSpace: "nowrap",
  },
  addClassBtn: {
    height: 44,
    padding: "0 0.9rem",
    borderRadius: 999,
    border: "1px solid #D1D5DB",
    background: "#ffffff",
    color: "#111827",
    fontSize: ".82rem",
    fontWeight: 600,
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    whiteSpace: "nowrap",
  },
  resultsList: {
    marginTop: 10,
    borderRadius: 10,
    overflow: "hidden",
    border: "1px solid var(--border)",
  },
  resultRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "0.4rem 0.6rem",
    borderBottom: "1px solid #f0f0f0",
    background: "#ffffff",
  },
  resultItem: {
    textAlign: "left",
    cursor: "pointer",
    flex: 1,
  },
  resultItemActive: {
    background: "rgba(0, 160, 130, .06)",
  },
  badgeSelectBtn: {
    borderRadius: 999,
    border: "1px solid #D1D5DB",
    padding: "0.25rem 0.7rem",
    fontSize: ".75rem",
    cursor: "pointer",
    whiteSpace: "nowrap",
  },
  docGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
    gap: "0.75rem",
    marginTop: 8,
  },
  docTile: {
    display: "flex",
    alignItems: "flex-start",
    gap: "0.75rem",
    padding: "0.8rem 0.9rem",
    borderRadius: 12,
    border: "1px solid var(--border)",
    textAlign: "left",
  },
  docIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    borderWidth: 1,
    borderStyle: "solid",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  docTitle: {
    margin: 0,
    fontSize: ".9rem",
    fontWeight: 600,
  },
  docDesc: {
    margin: 0,
    marginTop: 2,
    fontSize: ".78rem",
    color: "var(--ip-gray)",
  },
  infoText: {
    marginTop: 12,
    fontSize: ".8rem",
    color: "var(--ip-gray)",
  },
};
