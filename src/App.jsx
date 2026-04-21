// src/App.jsx
import { useEffect } from "react";
import useAuthStore from "./store/useAuthStore";
import LoginPage from "./pages/LoginPage";
import AdminUsersPage from "./pages/AdminUsersPage";
import ProfilePage from "./pages/ProfilePage";
import AuthenticatedLayout from "./components/AuthenticatedLayout";
import useAppStore from "./store/useAppStore";
import EtudiantsPage from "./pages/EtudiantsPage";
import ClassesPage from "./pages/ClassesPage";
import DocumentsPage from "./pages/DocumentsPage";
import TableauDeBordPage from "./pages/TableauDeBordPage";
import NotesPage from "./pages/NotesPage";
import MatieresPage from "./pages/MatieresPage";
import EnvoyerPage from "./pages/EnvoyerPage";
import ModulesPage from "./pages/ModulesPage";
import ScolaritePage from "./pages/ScolaritePage";
import AnonymatsPage from "./pages/AnonymatsPage";
import AnonymatsSessionPage from "./pages/AnonymatsSessionPage";
import PresencesExamensPage from "./pages/PresencesExamensPage";
import MaterielPage from "./pages/MaterielPage";
import "./styles/tokens.css";

export default function App() {
  const { user, loading, initialize } = useAuthStore();
  const { section, setSection, academicYear } = useAppStore();

  useEffect(() => {
    const unsubscribe = initialize();
    return () => { if (typeof unsubscribe === "function") unsubscribe(); };
  }, [initialize]);

  if (loading) {
    return (
      <div style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        height: "100vh",
        background: "#f5f6f8",
        fontFamily: "'Plus Jakarta Sans', sans-serif",
      }}>
        Chargement...
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  const commonProps = { onNavigate: setSection, academicYear };

  const getPageTitle = () => {
    const titles = {
      dashboard: "Tableau de bord",
      etudiants: "Étudiants",
      classes: "Classes",
      documents: "Documents",
      notes: "Notes",
      liste_presence: "Liste de présence",
      matieres: "Matières",
      modules: "UE / Modules",
      envoyer: "Envoyer",
      scolarite: "Scolarité",
      evaluations: "Évaluations",
      anonymats: "Anonymats",
      materiel: "Gestion du matériel",
      admin_users: "Administration",
      profile: "Mon profil",
    };
    return titles[section] || "Scolarité";
  };

  const renderPage = () => {
    switch (section) {
      case "profile":
        return <ProfilePage />;
      case "admin_users":
        return <AdminUsersPage />;
      case "etudiants":
        return <EtudiantsPage currentSection="etudiants" {...commonProps} />;
      case "classes":
        return <ClassesPage currentSection="classes" {...commonProps} />;
      case "documents":
        return <DocumentsPage currentSection="documents" {...commonProps} />;
      case "notes":
        return <NotesPage currentSection="notes" {...commonProps} />;
      case "liste_presence":
        return <PresencesExamensPage currentSection="liste_presence" {...commonProps} />;
      case "matieres":
        return <MatieresPage currentSection="matieres" {...commonProps} />;
      case "modules":
        return <ModulesPage currentSection="modules" {...commonProps} />;
      case "envoyer":
        return <EnvoyerPage currentSection="envoyer" {...commonProps} />;
      case "scolarite":
        return <ScolaritePage currentSection="scolarite" {...commonProps} />;
      case "evaluations":
        return <AnonymatsSessionPage currentSection="evaluations" {...commonProps} />;
      case "anonymats":
        return <AnonymatsPage currentSection="anonymats" {...commonProps} />;
      case "materiel":
        return <MaterielPage currentSection="materiel" {...commonProps} />;
      default:
        return <ProfilePage />;
    }
  };

  return (
    <AuthenticatedLayout
      currentSection={section}
      onNavigate={setSection}
      title={getPageTitle()}
      subtitle={`Année ${academicYear}`}
    >
      {renderPage()}
    </AuthenticatedLayout>
  );
}