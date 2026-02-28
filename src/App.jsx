// src/App.jsx
import { useState } from "react";

import EtudiantsPage from "./pages/EtudiantsPage";
import ClassesPage from "./pages/ClassesPage";
import DocumentsPage from "./pages/DocumentsPage";
import TableauDeBordPage from "./pages/TableauDeBordPage";
import PresencesPage from "./pages/PresencesPage";
import NotesPage from "./pages/NotesPage";
import MatieresPage from "./pages/MatieresPage";
import EnvoyerPage from "./pages/EnvoyerPage";
import ModulesPage from "./pages/ModulesPage";
import ScolaritePage from "./pages/ScolaritePage";

import AnonymatsPage from "./pages/AnonymatsPage"; // anonymats
import AnonymatsSessionPage from "./pages/AnonymatsSessionPage"; // evaluations

import "./styles/tokens.css";

export default function App() {
  const [section, setSection] = useState("dashboard");

  switch (section) {
    case "etudiants":
      return <EtudiantsPage currentSection="etudiants" onNavigate={setSection} />;

    case "classes":
      return <ClassesPage currentSection="classes" onNavigate={setSection} />;

    case "documents":
      return <DocumentsPage currentSection="documents" onNavigate={setSection} />;

    case "presences":
      return <PresencesPage currentSection="presences" onNavigate={setSection} />;

    case "notes":
      return <NotesPage currentSection="notes" onNavigate={setSection} />;

    case "matieres":
      return <MatieresPage currentSection="matieres" onNavigate={setSection} />;

    case "modules":
      return <ModulesPage currentSection="modules" onNavigate={setSection} />;

    case "envoyer":
      return <EnvoyerPage currentSection="envoyer" onNavigate={setSection} />;

    case "scolarite":
      return <ScolaritePage currentSection="scolarite" onNavigate={setSection} />;

    case "evaluations":
      return <AnonymatsSessionPage currentSection="evaluations" onNavigate={setSection} />;

    case "anonymats":
      return <AnonymatsPage currentSection="anonymats" onNavigate={setSection} />;

    case "dashboard":
    default:
      return <TableauDeBordPage currentSection="dashboard" onNavigate={setSection} />;
  }
}