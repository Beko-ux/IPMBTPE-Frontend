// src/pages/EtudiantsPage.jsx
import { useEffect, useMemo, useState } from "react";
import VerticalNavBar from "../components/VerticalNavBar.jsx";
import HorizontalNavBar from "../components/HorizontalNavBar.jsx";
import GestionDesEtudiantsHeader from "../components/GestionDesEtudiantsHeader.jsx";
import ListesDesEtudiantsSection from "../components/ListesDesEtudiantsSection.jsx";
import InscrireEtudiantModal from "../components/InscrireEtudiantModal.jsx";
import EtudiantDetailModal from "../components/EtudiantDetailModal.jsx";
import EditerEtudiantModal from "../components/EditerEtudiantModal.jsx";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:4000";

export default function EtudiantsPage({
  currentSection = "etudiants",
  onNavigate,
}) {
  const [students, setStudents] = useState([]);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all"); // "all" | "inscrits" | "non"
  const [openAdd, setOpenAdd] = useState(false);

  // détail
  const [openDetail, setOpenDetail] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);

  // édition
  const [openEdit, setOpenEdit] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);

  const loadStudents = async (search = "") => {
    try {
      const res = await fetch(
        `${API_BASE}/students${search ? `?q=${encodeURIComponent(search)}` : ""}`
      );
      const data = await res.json();
      setStudents(Array.isArray(data) ? data : []);
    } catch {
      setStudents([]);
    }
  };

  useEffect(() => {
    loadStudents();
    // eslint-disable-next-line
  }, []);

  const { totalCount, inscritCount, nonInscritCount } = useMemo(() => {
    const total = students.length;
    const ins = students.filter((s) => !!s.registrationFeePaid).length;
    return {
      totalCount: total,
      inscritCount: ins,
      nonInscritCount: total - ins,
    };
  }, [students]);

  const visibleStudents = useMemo(() => {
    if (filter === "inscrits") {
      return students.filter((s) => !!s.registrationFeePaid);
    }
    if (filter === "non") {
      return students.filter((s) => !s.registrationFeePaid);
    }
    return students;
  }, [students, filter]);

  /* ————— CRÉATION ————— */
  const handleSaveNew = async (payload) => {
    const body = {
      lastName: payload.lastName,
      firstName: payload.firstName,
      birthDate: payload.birthDate,
      contact: payload.contact || null,
      email: payload.email || null,

      academicYear: payload.academicYear,
      cycle: payload.cycle,
      studyYear: Number(payload.studyYear),

      filiere: payload.filiere,
      specialite: payload.specialite || null,
      specialiteCode: payload.specialiteCode || null,
      option: payload.option || null,
      optionCode: payload.optionCode || null,

      classRole: payload.classRole || "Aucune",
      schoolRole: payload.schoolRole || "Aucune",

      registrationFeePaid: payload.registrationFeePaid === true,

      // ✅ AJOUT: photoUrl si fourni
      photoUrl: payload.photoUrl || null,

      // champs fiche
      livingLanguage: payload.livingLanguage || null,
      bacSerie: payload.bacSerie || null,
      birthPlace: payload.birthPlace || null,
      quartierHabitation: payload.quartierHabitation || null,
      regionOrigine: payload.regionOrigine || null,
      departementOrigine: payload.departementOrigine || null,
      canal: payload.canal || null,
      hasJob: payload.hasJob === true,
      jobDetail: payload.jobDetail || null,
      hasDisease: payload.hasDisease === true,
      diseaseDetail: payload.diseaseDetail || null,
      emergencyName: payload.emergencyName || null,
      emergencyAddress: payload.emergencyAddress || null,
      emergencyPhone: payload.emergencyPhone || null,
      emergencyProfession: payload.emergencyProfession || null,
      emergencyRelation: payload.emergencyRelation || null,
      lastSchool: payload.lastSchool || null,
      lastDiplomaYear: payload.lastDiplomaYear || null,
      diplomaPresented: payload.diplomaPresented || null,
    };

    try {
      const res = await fetch(`${API_BASE}/students`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur d’enregistrement");

      setOpenAdd(false);
      await loadStudents(query);

      if (data.matricule) {
        alert(`Étudiant créé.\nMatricule: ${data.matricule}`);
      } else {
        alert(
          "Étudiant créé.\nMatricule non généré (frais d’inscription non payés)."
        );
      }
    } catch (e) {
      alert(e.message || "Échec de l’enregistrement");
    }
  };

  /* ————— DÉTAILS ————— */
  const handleShowDetail = (student) => {
    setSelectedStudent(student);
    setOpenDetail(true);
  };

  /* ————— ÉDITION ————— */
  const handleEditStudent = (student) => {
    setEditingStudent(student);
    setOpenEdit(true);
  };

  const handleSaveEdit = async (payload) => {
    if (!payload.id) {
      alert("Identifiant étudiant manquant.");
      return;
    }

    const body = {
      lastName: payload.lastName,
      firstName: payload.firstName,
      birthDate: payload.birthDate,
      academicYear: payload.academicYear,

      contact: payload.contact || null,
      email: payload.email || null,

      cycle: payload.cycle,
      studyYear: Number(payload.studyYear),

      filiere: payload.filiere,
      specialite: payload.specialite || null,
      specialiteCode: payload.specialiteCode || null,
      option: payload.option || null,
      optionCode: payload.optionCode || null,

      classRole: payload.classRole || "Aucune",
      schoolRole: payload.schoolRole || "Aucune",

      registrationFeePaid: payload.registrationFeePaid === true,

      // ✅ AJOUT: photoUrl modifiable
      photoUrl: payload.photoUrl || null,

      livingLanguage: payload.livingLanguage || null,
      bacSerie: payload.bacSerie || null,
      birthPlace: payload.birthPlace || null,
      quartierHabitation: payload.quartierHabitation || null,
      regionOrigine: payload.regionOrigine || null,
      departementOrigine: payload.departementOrigine || null,
      canal: payload.canal || null,
      hasJob: payload.hasJob === true,
      jobDetail: payload.jobDetail || null,
      hasDisease: payload.hasDisease === true,
      diseaseDetail: payload.diseaseDetail || null,
      emergencyName: payload.emergencyName || null,
      emergencyAddress: payload.emergencyAddress || null,
      emergencyPhone: payload.emergencyPhone || null,
      emergencyProfession: payload.emergencyProfession || null,
      emergencyRelation: payload.emergencyRelation || null,
      lastSchool: payload.lastSchool || null,
      lastDiplomaYear: payload.lastDiplomaYear || null,
      diplomaPresented: payload.diplomaPresented || null,
    };

    try {
      const res = await fetch(`${API_BASE}/students/${payload.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur de mise à jour");

      setOpenEdit(false);
      setEditingStudent(null);
      await loadStudents(query);
      alert("Informations de l’étudiant mises à jour.");
    } catch (e) {
      alert(e.message || "Échec de la mise à jour");
    }
  };

  const handlePrintCertificat = (student) => {
    console.log("Certificat de scolarité pour :", student);
    alert("Génération du certificat de scolarité (à implémenter).");
  };

  const handlePrintCarte = (student) => {
    console.log("Carte d'étudiant pour :", student);
    alert("Génération de la carte d'étudiant (à implémenter).");
  };

  const handlePrintReleve = (student) => {
    console.log("Relevé de notes pour :", student);
    alert("Génération du relevé de notes (à implémenter).");
  };

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
            <GestionDesEtudiantsHeader
              total={totalCount}
              query={query}
              onQueryChange={setQuery}
              onSearch={() => loadStudents(query)}
              onAddNew={() => setOpenAdd(true)}
              filter={filter}
              counts={{
                all: totalCount,
                inscrits: inscritCount,
                non: nonInscritCount,
              }}
              onFilterChange={setFilter}
            />

            <ListesDesEtudiantsSection
              students={visibleStudents}
              onShowDetail={handleShowDetail}
              onPrintCertificat={handlePrintCertificat}
              onPrintCarte={handlePrintCarte}
              onEdit={handleEditStudent}
            />
          </div>
        </div>
      </main>

      <InscrireEtudiantModal
        open={openAdd}
        onClose={() => setOpenAdd(false)}
        onSave={handleSaveNew}
      />

      <EtudiantDetailModal
        open={openDetail}
        student={selectedStudent}
        onClose={() => setOpenDetail(false)}
        onEdit={handleEditStudent}
        onPrintCertificat={handlePrintCertificat}
        onPrintCarte={handlePrintCarte}
        onPrintReleve={handlePrintReleve}
      />

      <EditerEtudiantModal
        open={openEdit}
        student={editingStudent}
        onClose={() => setOpenEdit(false)}
        onSave={handleSaveEdit}
      />
    </div>
  );
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
};
