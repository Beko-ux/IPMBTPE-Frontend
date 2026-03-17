// src/App.jsx
import { useEffect, useState } from "react";

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

import "./styles/tokens.css";

const STORAGE_KEY = "ipmbtpe:last_section";

export default function App() {
  const [section, setSection] = useState(() => {
    return localStorage.getItem(STORAGE_KEY) || "dashboard";
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, section);
  }, [section]);

  switch (section) {
    case "etudiants":
      return <EtudiantsPage currentSection="etudiants" onNavigate={setSection} />;

    case "classes":
      return <ClassesPage currentSection="classes" onNavigate={setSection} />;

    case "documents":
      return <DocumentsPage currentSection="documents" onNavigate={setSection} />;

    /** ✅ Notes déplacé dans "Évaluations" dans ta sidebar, mais la clé reste "notes" */
    case "notes":
      return <NotesPage currentSection="notes" onNavigate={setSection} />;

    /** ✅ NOUVEAU : Liste de présence => PresencesExamensPage */
    case "liste_presence":
      return (
        <PresencesExamensPage
          currentSection="liste_presence"
          onNavigate={setSection}
        />
      );

    case "matieres":
      return <MatieresPage currentSection="matieres" onNavigate={setSection} />;

    case "modules":
      return <ModulesPage currentSection="modules" onNavigate={setSection} />;

    case "envoyer":
      return <EnvoyerPage currentSection="envoyer" onNavigate={setSection} />;

    case "scolarite":
      return <ScolaritePage currentSection="scolarite" onNavigate={setSection} />;

    case "evaluations":
      return (
        <AnonymatsSessionPage
          currentSection="evaluations"
          onNavigate={setSection}
        />
      );

    case "anonymats":
      return <AnonymatsPage currentSection="anonymats" onNavigate={setSection} />;

    case "dashboard":
    default:
      return (
        <TableauDeBordPage
          currentSection="dashboard"
          onNavigate={setSection}
        />
      );
  }
}