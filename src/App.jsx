// src/App.jsx
// ✅ Étape 2 — App.jsx refonte
// - La navigation et l'année académique sont centralisées dans useAppStore
// - Plus de useState local pour section / year
// - Chaque page reçoit { academicYear } depuis le store (pas en prop)

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
  // ✅ section et setSection viennent du store global
  const { section, setSection, academicYear } = useAppStore();

  // Props communes à toutes les pages
  const commonProps = {
    onNavigate: setSection,
    academicYear, // ← injecté depuis le store dans toutes les pages
  };

  switch (section) {
    case "etudiants":
      return <EtudiantsPage currentSection="etudiants" {...commonProps} />;

    case "classes":
      return <ClassesPage currentSection="classes" {...commonProps} />;

    case "documents":
      return <DocumentsPage currentSection="documents" {...commonProps} />;

    case "notes":
      return <NotesPage currentSection="notes" {...commonProps} />;

    case "liste_presence":
      return (
        <PresencesExamensPage currentSection="liste_presence" {...commonProps} />
      );

    case "matieres":
      return <MatieresPage currentSection="matieres" {...commonProps} />;

    case "modules":
      return <ModulesPage currentSection="modules" {...commonProps} />;

    case "envoyer":
      return <EnvoyerPage currentSection="envoyer" {...commonProps} />;

    case "scolarite":
      return <ScolaritePage currentSection="scolarite" {...commonProps} />;

    case "evaluations":
      return (
        <AnonymatsSessionPage currentSection="evaluations" {...commonProps} />
      );

    case "anonymats":
      return <AnonymatsPage currentSection="anonymats" {...commonProps} />;

    case "dashboard":
    default:
      return (
        <TableauDeBordPage currentSection="dashboard" {...commonProps} />
      );
      case "materiel":
  return <MaterielPage currentSection="materiel" {...commonProps} />;
  }
}