import { useMemo, useRef, useState } from "react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { Printer, FileDown, X } from "lucide-react";

export default function PresenceSheetModal({ open, onClose, students = [], meta = {} }) {
  const pageRefs = useRef([]);
  const [busy, setBusy] = useState(false);

  if (!open) return null;

  const days = useMemo(() => {
    const c = (meta.cycle || "").toUpperCase();
    // BTS + INGENIEUR => 5 jours ; LICENCE + MASTER => 6 jours
    if (c === "LICENCE" || c === "MASTER") {
      return ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];
    }
    return ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi"];
  }, [meta.cycle]);

  const pages = useMemo(() => chunkStudents(students, 24), [students]); // ~24 lignes/page paysage

  // ----- helpers anti-oklch / anti-CORS ----
  const isSameOrigin = (src) => {
    try {
      const u = new URL(src, window.location.href);
      return u.origin === window.location.origin;
    } catch {
      return true;
    }
  };

  const sanitizeCloneForCapture = (root) => {
    if (!root) return;
    const all = [root, ...root.querySelectorAll("*")];

    all.forEach((el) => {
      const cs = window.getComputedStyle(el);

      const fixIfOklch = (prop, fallback) => {
        const v = cs[prop];
        if (v && typeof v === "string" && v.includes("oklch(")) {
          el.style[prop] = fallback;
        }
      };

      fixIfOklch("color", "#111827");
      fixIfOklch("backgroundColor", "#ffffff");
      fixIfOklch("borderTopColor", "#000000");
      fixIfOklch("borderRightColor", "#000000");
      fixIfOklch("borderBottomColor", "#000000");
      fixIfOklch("borderLeftColor", "#000000");

      if (el.tagName === "IMG") {
        const src = el.getAttribute("src") || "";
        const isData = src.startsWith("data:") || src.startsWith("blob:");
        if (!isData && src.startsWith("http") && !isSameOrigin(src)) {
          el.style.display = "none";
        }
      }
    });
  };

  const capturePage = async (pageEl, captureId) => {
    const canvas = await html2canvas(pageEl, {
      scale: 2,
      useCORS: true,
      backgroundColor: "#ffffff",
      logging: false,
      onclone: (doc) => {
        const clonedPage = doc.querySelector(`[data-capture-id="${captureId}"]`);
        sanitizeCloneForCapture(clonedPage);
      },
    });
    return canvas;
  };

  const handlePdf = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const pdf = new jsPDF("l", "mm", "a4"); // paysage

      for (let i = 0; i < pages.length; i++) {
        const el = pageRefs.current[i];
        if (!el) continue;
        const id = String(i);
        el.setAttribute("data-capture-id", id);

        const canvas = await capturePage(el, id);
        const imgData = canvas.toDataURL("image/png");

        const pw = pdf.internal.pageSize.getWidth();
        const ph = pdf.internal.pageSize.getHeight();
        const iw = pw;
        const ih = (canvas.height * iw) / canvas.width;
        const y = (ph - ih) / 2;

        if (i > 0) pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, y, iw, ih);
      }

      const d = new Date().toISOString().slice(0, 10);
      pdf.save(`liste-presence-${meta.classLabel || "classe"}-${d}.pdf`);
    } catch (e) {
      console.error(e);
      alert("Impossible de générer le PDF.");
    } finally {
      setBusy(false);
    }
  };

  const handlePrint = async () => {
    if (busy) return;
    setBusy(true);

    const win = window.open("", "_blank");
    if (!win) {
      setBusy(false);
      alert("Fenêtre d'impression bloquée.");
      return;
    }

    try {
      const images = [];
      for (let i = 0; i < pages.length; i++) {
        const el = pageRefs.current[i];
        if (!el) continue;
        const id = String(i);
        el.setAttribute("data-capture-id", id);

        const canvas = await capturePage(el, id);
        images.push(canvas.toDataURL("image/png"));
      }

      win.document.write(`
        <html>
          <head>
            <title>Liste de présence</title>
            <style>
              body{ margin:0; padding:0; }
              .page{ page-break-after:always; }
              img{ width:100%; display:block; }
            </style>
          </head>
          <body>
            ${images.map(src => `<div class="page"><img src="${src}" /></div>`).join("")}
          </body>
        </html>
      `);
      win.document.close();
      win.focus();
      win.print();
    } catch (e) {
      console.error(e);
      win.close();
      alert("Impossible d'imprimer.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={sx.overlay}>
      <div style={sx.modal}>
        <header style={sx.head}>
          <div>
            <h3 style={sx.title}>Prévisualisation — Liste de présence</h3>
            <p style={sx.sub}>
              A4 paysage · {students.length} étudiant(s) · {pages.length} page(s)
            </p>
          </div>

          <button onClick={onClose} style={sx.closeBtn}>
            <X size={18} />
          </button>
        </header>

        <div style={sx.previewWrap}>
          <div style={sx.pagesCol}>
            {pages.map((chunk, pageIndex) => (
              <div
                key={pageIndex}
                ref={(el) => (pageRefs.current[pageIndex] = el)}
                style={sx.sheet}
              >
                <PresenceSheetPage
                  students={chunk}
                  days={days}
                  meta={meta}
                  pageIndex={pageIndex}
                  totalPages={pages.length}
                />
              </div>
            ))}
          </div>
        </div>

        <footer style={sx.footer}>
          <button onClick={onClose} style={sx.secondaryBtn}>Fermer</button>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={handlePrint} disabled={busy} style={sx.outlineBtn}>
              <Printer size={16} />
              {busy ? "Préparation..." : "Imprimer"}
            </button>
            <button onClick={handlePdf} disabled={busy} style={sx.primaryBtn}>
              <FileDown size={16} />
              {busy ? "Génération..." : "Générer en PDF"}
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}

function PresenceSheetPage({ students, days, meta, pageIndex, totalPages }) {
  const logoHeaderSrc = "/assets/ipmbtpe-header.png";

  return (
    <div style={pg.page}>
      {/* En-tête */}
      <div style={pg.header}>
        <div style={pg.logoBox}>
          <img src={logoHeaderSrc} alt="IPMBTPE" style={{ width: "100%" }} />
        </div>

        <div style={pg.headerText}>
          <div style={pg.headerTitle}>LISTE DE PRÉSENCE</div>
          <div style={pg.metaRow}>
            <span><b>Classe :</b> {meta.classLabel || "—"}</span>
            <span><b>Filière :</b> {meta.filiere || "—"}</span>
            <span><b>Année académique :</b> {meta.academicYear || "—"}</span>
            <span><b>Cycle :</b> {meta.cycle || "—"} {meta.studyYear ? `(${meta.studyYear})` : ""}</span>
          </div>
        </div>

        <div style={pg.pageInfo}>
          Page {pageIndex + 1}/{totalPages}
        </div>
      </div>

      {/* Tableau */}
      <table style={pg.table}>
        <thead>
          <tr>
            <th style={pg.thNum}>#</th>
            <th style={pg.thName}>Noms et prénoms</th>
            {days.map((d) => (
              <th key={d} style={pg.thDay}>{d}</th>
            ))}
          </tr>
        </thead>

        <tbody>
          {students.map((s, i) => (
            <tr key={s.id || i}>
              <td style={pg.tdNum}>{pageIndex * 24 + i + 1}</td>
              <td style={pg.tdName}>
                {(s.lastName || "").toUpperCase()} {s.firstName || ""}
              </td>
              {days.map((d) => (
                <td key={d} style={pg.tdDay}></td>
              ))}
            </tr>
          ))}

          {/* lignes vides pour aérer la page */}
          {Array.from({ length: Math.max(0, 24 - students.length) }).map((_, k) => (
            <tr key={`empty-${k}`}>
              <td style={pg.tdNum}> </td>
              <td style={pg.tdName}> </td>
              {days.map((d) => (
                <td key={d} style={pg.tdDay}></td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      <div style={pg.footerNote}>
        Signature enseignant / responsable : ____________________________
      </div>
    </div>
  );
}

function chunkStudents(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

const sx = {
  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,.35)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "1rem",
    zIndex: 2000,
  },
  modal: {
    width: "min(1200px, 98vw)",
    maxHeight: "95vh",
    background: "#fff",
    borderRadius: 12,
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
  },
  head: {
    padding: "0.75rem 1rem",
    borderBottom: "1px solid #E5E7EB",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
  },
  title: { margin: 0, fontWeight: 800, fontSize: "1rem" },
  sub: { margin: 0, fontSize: ".8rem", color: "#6B7280", marginTop: 2 },
  closeBtn: {
    border: "none",
    background: "transparent",
    cursor: "pointer",
  },

  previewWrap: {
    flex: 1,
    padding: "1rem",
    overflow: "auto",
    background: "#F3F4F6",
  },
  pagesCol: {
    display: "flex",
    flexDirection: "column",
    gap: 12,
    alignItems: "center",
  },

  // A4 paysage ~ 1123x794 à 96dpi
  sheet: {
    width: "1123px",
    height: "794px",
    background: "#fff",
    boxShadow: "0 0 0 1px #E5E7EB",
    padding: "14px",
    boxSizing: "border-box",
    color: "#111827",
  },

  footer: {
    padding: "0.75rem 1rem",
    borderTop: "1px solid #E5E7EB",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  secondaryBtn: {
    borderRadius: 999,
    border: "1px solid #D1D5DB",
    background: "#fff",
    padding: "0.4rem 1rem",
    fontWeight: 700,
    cursor: "pointer",
  },
  outlineBtn: {
    borderRadius: 999,
    border: "1px solid #059669",
    background: "#fff",
    color: "#059669",
    padding: "0.45rem 1rem",
    display: "flex",
    gap: 6,
    alignItems: "center",
    fontWeight: 800,
    cursor: "pointer",
  },
  primaryBtn: {
    borderRadius: 999,
    border: "none",
    background: "#059669",
    color: "#fff",
    padding: "0.45rem 1rem",
    display: "flex",
    gap: 6,
    alignItems: "center",
    fontWeight: 900,
    cursor: "pointer",
  },
};

const pg = {
  page: { width: "100%", height: "100%", display: "flex", flexDirection: "column" },

  header: {
    display: "grid",
    gridTemplateColumns: "220px 1fr 120px",
    gap: 10,
    alignItems: "center",
    paddingBottom: 10,
    borderBottom: "2px solid #111827",
  },
  logoBox: { width: 220 },
  headerText: { display: "flex", flexDirection: "column", gap: 6 },
  headerTitle: {
    fontSize: "1.2rem",
    fontWeight: 900,
    letterSpacing: 0.6,
    textAlign: "center",
  },
  metaRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: 10,
    fontSize: ".85rem",
    justifyContent: "center",
  },
  pageInfo: {
    fontSize: ".85rem",
    fontWeight: 800,
    textAlign: "right",
  },

  table: {
    width: "100%",
    borderCollapse: "collapse",
    marginTop: 10,
    fontSize: ".9rem",
  },
  thNum: {
    width: 36,
    border: "1px solid #111827",
    padding: "6px 4px",
    background: "#F3F4F6",
    fontWeight: 900,
    textAlign: "center",
  },
  thName: {
    width: 340,
    border: "1px solid #111827",
    padding: "6px 8px",
    background: "#F3F4F6",
    fontWeight: 900,
  },
  thDay: {
    border: "1px solid #111827",
    padding: "6px 4px",
    background: "#F3F4F6",
    fontWeight: 900,
    textAlign: "center",
  },

  tdNum: {
    border: "1px solid #111827",
    padding: "6px 4px",
    textAlign: "center",
    fontWeight: 800,
  },
  tdName: {
    border: "1px solid #111827",
    padding: "6px 8px",
    fontWeight: 700,
  },
  tdDay: {
    border: "1px solid #111827",
    height: 26,
  },

  footerNote: {
    marginTop: "auto",
    paddingTop: 8,
    fontSize: ".9rem",
    fontWeight: 700,
  },
};
