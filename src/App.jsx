// // src/App.jsx
// import { useState } from "react";
// import EtudiantsPage from "./pages/EtudiantsPage";
// import ClassesPage from "./pages/ClassesPage";
// import DocumentsPage from "./pages/DocumentsPage";
// import TableauDeBordPage from "./pages/TableauDeBordPage";
// import PresencesPage from "./pages/PresencesPage";
// import NotesPage from "./pages/NotesPage";
// import "./styles/tokens.css";

// export default function App() {
//   const [section, setSection] = useState("dashboard");

//   const renderSection = () => {
//     switch (section) {
//       case "etudiants":
//         return (
//           <EtudiantsPage currentSection="etudiants" onNavigate={setSection} />
//         );
//       case "classes":
//         return (
//           <ClassesPage currentSection="classes" onNavigate={setSection} />
//         );
//       case "documents":
//         return (
//           <DocumentsPage currentSection="documents" onNavigate={setSection} />
//         );
//       case "presences":
//         return (
//           <PresencesPage currentSection="presences" onNavigate={setSection} />
//         );
//       case "notes":
//         return <NotesPage currentSection="notes" onNavigate={setSection} />;
//       case "dashboard":
//       default:
//         return (
//           <TableauDeBordPage
//             currentSection="dashboard"
//             onNavigate={setSection}
//           />
//         );
//     }
//   };

//   return renderSection();
// }



// src/App.jsx
import { useState } from "react";
import EtudiantsPage from "./pages/EtudiantsPage";
import ClassesPage from "./pages/ClassesPage";
import DocumentsPage from "./pages/DocumentsPage";
import TableauDeBordPage from "./pages/TableauDeBordPage";
import PresencesPage from "./pages/PresencesPage";
import NotesPage from "./pages/NotesPage";
import MatieresPage from "./pages/MatieresPage"; // 👉 NOUVELLE PAGE
import "./styles/tokens.css";

export default function App() {
  const [section, setSection] = useState("dashboard");

  const renderSection = () => {
    switch (section) {
      case "etudiants":
        return (
          <EtudiantsPage currentSection="etudiants" onNavigate={setSection} />
        );
      case "classes":
        return (
          <ClassesPage currentSection="classes" onNavigate={setSection} />
        );
      case "documents":
        return (
          <DocumentsPage currentSection="documents" onNavigate={setSection} />
        );
      case "presences":
        return (
          <PresencesPage currentSection="presences" onNavigate={setSection} />
        );
      case "notes":
        return <NotesPage currentSection="notes" onNavigate={setSection} />;
      case "matieres":
        return (
          <MatieresPage currentSection="matieres" onNavigate={setSection} />
        );
      case "dashboard":
      default:
        return (
          <TableauDeBordPage
            currentSection="dashboard"
            onNavigate={setSection}
          />
        );
    }
  };

  return renderSection();
}
