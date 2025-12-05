// src/components/documents/StudentBadgeSheet.jsx
import { useRef, useState } from "react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

/**
 * students: tableau d'étudiants (>=1)
 * { lastName, firstName, matricule, photoUrl, specialiteCode, optionCode, cycle, studyYear, academicYear }
 * onClose: fonction pour fermer la modale
 */
export default function StudentBadgeSheet({ students = [], onClose }) {
  const pageRefs = useRef([]);
  const [busy, setBusy] = useState(false);

  const chunks = chunkStudents(students, 4);
  const pages = chunks.length ? chunks : [[]];

  // attendre chargement images + polices avant capture
  const waitForAssets = async (rootEl) => {
    try {
      if (document?.fonts?.ready) {
        await document.fonts.ready;
      }
    } catch (_) {}

    if (!rootEl) return;

    const imgs = Array.from(rootEl.querySelectorAll("img"));
    await Promise.all(
      imgs.map(
        (img) =>
          new Promise((resolve) => {
            if (img.complete && img.naturalWidth > 0) return resolve();
            const done = () => resolve();
            img.addEventListener("load", done, { once: true });
            img.addEventListener("error", done, { once: true });
          })
      )
    );
  };

  // ---- helpers anti-oklch / anti-CORS ----
  const isSameOrigin = (src) => {
    try {
      const u = new URL(src, window.location.href);
      return u.origin === window.location.origin;
    } catch {
      return true; // data: / blob: / relative => ok
    }
  };

  const sanitizeCloneForCapture = (root) => {
    if (!root) return;

    const all = [root, ...root.querySelectorAll("*")];

    all.forEach((el) => {
      const cs = window.getComputedStyle(el);

      // Si une couleur calculée contient oklch(), on force une valeur sûre.
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

      // Anti-CORS : on cache les images externes (non same-origin) uniquement pour la capture
      if (el.tagName === "IMG") {
        const src = el.getAttribute("src") || "";
        const isData = src.startsWith("data:") || src.startsWith("blob:");

        if (!isData && src.startsWith("http") && !isSameOrigin(src)) {
          el.style.display = "none"; // empêche le canvas d'être tainté
        }
      }
    });
  };

  const capturePage = async (pageEl, captureId) => {
    await waitForAssets(pageEl);

    const canvas = await html2canvas(pageEl, {
      scale: 2,
      useCORS: true,
      backgroundColor: "#ffffff",
      logging: false,
      onclone: (clonedDoc) => {
        const clonedPage = clonedDoc.querySelector(
          `[data-capture-id="${captureId}"]`
        );
        sanitizeCloneForCapture(clonedPage);
      },
    });

    return canvas;
  };

  const handleDownloadPdf = async () => {
    if (busy) return;
    setBusy(true);

    try {
      const pdf = new jsPDF("p", "mm", "a4");

      for (let i = 0; i < pages.length; i++) {
        const pageEl = pageRefs.current[i];
        if (!pageEl) continue;

        const captureId = String(i);
        pageEl.setAttribute("data-capture-id", captureId);

        const canvas = await capturePage(pageEl, captureId);
        const imgData = canvas.toDataURL("image/png");

        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();
        const imgWidth = pageWidth;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        const y = (pageHeight - imgHeight) / 2;

        if (i > 0) pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, y, imgWidth, imgHeight);
      }

      const d = new Date().toISOString().slice(0, 10);
      pdf.save(`badges-etudiants-${d}.pdf`);
    } catch (err) {
      console.error(err);
      alert(
        "Impossible de générer le PDF. Si certaines photos viennent d'un domaine externe sans CORS, elles seront ignorées dans le PDF."
      );
    } finally {
      setBusy(false);
    }
  };

  const handlePrint = async () => {
    if (busy) return;
    setBusy(true);

    // IMPORTANT: ouvrir fenêtre AVANT les await pour éviter popup blocker
    const win = window.open("", "_blank");
    if (!win) {
      setBusy(false);
      alert("La fenêtre d'impression a été bloquée par le navigateur.");
      return;
    }

    win.document.write(`
      <html>
        <head>
          <title>Impression badges</title>
          <style>
            body { margin:0; padding:0; }
            .page { page-break-after: always; }
            img { width:100%; display:block; }
          </style>
        </head>
        <body>
          <p style="font-family:system-ui;padding:12px;">Préparation de l'impression...</p>
        </body>
      </html>
    `);
    win.document.close();

    try {
      const images = [];

      for (let i = 0; i < pages.length; i++) {
        const pageEl = pageRefs.current[i];
        if (!pageEl) continue;

        const captureId = String(i);
        pageEl.setAttribute("data-capture-id", captureId);

        const canvas = await capturePage(pageEl, captureId);
        images.push(canvas.toDataURL("image/png"));
      }

      win.document.open();
      win.document.write(`
        <html>
          <head>
            <title>Impression badges</title>
            <style>
              body { margin:0; padding:0; }
              .page { page-break-after: always; }
              img { width:100%; display:block; }
            </style>
          </head>
          <body>
            ${images
              .map((src, idx) => `<div class="page"><img src="${src}" /></div>`)
              .join("")}
          </body>
        </html>
      `);
      win.document.close();

      // attendre chargement des images dans l’onglet d’impression
      await new Promise((resolve) => {
        const imgs = Array.from(win.document.images || []);
        if (!imgs.length) return resolve();
        let done = 0;
        const tick = () => {
          done++;
          if (done >= imgs.length) resolve();
        };
        imgs.forEach((im) => {
          if (im.complete) tick();
          else {
            im.onload = tick;
            im.onerror = tick;
          }
        });
      });

      win.focus();
      win.print();
    } catch (err) {
      console.error(err);
      win.close();
      alert(
        "Impossible d'imprimer. Si certaines photos viennent d'un domaine externe sans CORS, elles seront ignorées à l’impression."
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <header style={styles.modalHeader}>
          <div>
            <h2 style={styles.modalTitle}>Prévisualisation des badges</h2>
            <p style={styles.modalSubtitle}>
              Feuille(s) A4 · Badges étudiant (format A6)
              {students.length > 0
                ? ` · ${students.length} badge(s) · ${pages.length} page(s)`
                : ""}
            </p>
          </div>
          <button type="button" style={styles.closeBtn} onClick={onClose}>
            ✕
          </button>
        </header>

        {/* Zone capturée par html2canvas : plusieurs pages */}
        <div style={styles.previewWrapper}>
          <div style={styles.pagesContainer}>
            {pages.map((pageStudents, pageIndex) => {
              const filled = fillToFour(pageStudents);

              return (
                <div
                  key={pageIndex}
                  ref={(el) => (pageRefs.current[pageIndex] = el)}
                  style={styles.sheet}
                >
                  {filled.map((student, idx) => (
                    <div key={idx} style={styles.badge}>
                      <BadgeContent student={student} />
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </div>

        <footer style={styles.footer}>
          <button type="button" style={styles.secondaryBtn} onClick={onClose}>
            Fermer
          </button>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button
              type="button"
              style={{
                ...styles.outlineBtn,
                opacity: busy ? 0.6 : 1,
                cursor: busy ? "not-allowed" : "pointer",
              }}
              onClick={handlePrint}
              disabled={busy}
            >
              {busy ? "Préparation..." : "Imprimer"}
            </button>
            <button
              type="button"
              style={{
                ...styles.primaryBtn,
                opacity: busy ? 0.6 : 1,
                cursor: busy ? "not-allowed" : "pointer",
              }}
              onClick={handleDownloadPdf}
              disabled={busy}
            >
              {busy ? "Génération..." : "Générer en PDF"}
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}

function BadgeContent({ student }) {
  const logoHeaderSrc = "/assets/ipmbtpe-header.png"; // public/assets

  if (!student) {
    return (
      <div style={styles.badgeEmpty}>
        <span style={{ fontSize: "0.8rem", color: "#9CA3AF" }}>
          Slot badge vide
        </span>
      </div>
    );
  }

  const fullName = getFullName(student);
  const academicYear = student.academicYear || "2025-2026";
  const code = student.optionCode || student.specialiteCode || "";
  const levelLabel = `${code || ""}${
    student.cycle
      ? "-" +
        student.cycle.toUpperCase() +
        (student.studyYear || "")
      : ""
  }`.replace("--", "-");

  return (
    <div style={styles.badgeInner}>
      {/* Bandeau titre */}
      <div style={styles.badgeTitleBar}>BADGE ÉTUDIANT</div>

      {/* En-tête avec logo */}
      <div style={styles.badgeHeader}>
        <img
          src={logoHeaderSrc}
          alt="IPMBTPE"
          crossOrigin="anonymous"
          style={{ width: "100%", height: "auto", display: "block" }}
          onError={(e) => {
            e.currentTarget.style.display = "none";
          }}
        />
      </div>

      {/* Corps layout: Photo à gauche + infos à droite */}
      <div style={styles.badgeBody}>
        <div style={styles.photoCol}>
          <div style={styles.photoFrame}>
            {student.photoUrl ? (
              <img
                src={student.photoUrl}
                alt={fullName}
                crossOrigin="anonymous"
                style={styles.photo}
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                }}
              />
            ) : (
              <div style={styles.photoPlaceholder}>PHOTO</div>
            )}
          </div>

          <div style={styles.matriculeChip}>
            {student.matricule || "—"}
          </div>
        </div>

        <div style={styles.infoCol}>
          <div style={styles.nameBlock}>{fullName}</div>

          <div style={styles.infoRow}>
            <span style={styles.infoLabel}>Classe :</span>
            <span style={styles.infoValue}>{levelLabel || "—"}</span>
          </div>

          <div style={styles.infoRow}>
            <span style={styles.infoLabel}>Année :</span>
            <span style={styles.infoValue}>{academicYear}</span>
          </div>

          {student.filiere && (
            <div style={styles.infoRow}>
              <span style={styles.infoLabel}>Filière :</span>
              <span style={styles.infoValue}>{student.filiere}</span>
            </div>
          )}

          <div style={styles.footerSlogan}>Votre carrière commence ici</div>
        </div>
      </div>
    </div>
  );
}

function getFullName(s) {
  const last = (s.lastName || "").toUpperCase();
  const first = s.firstName || "";
  return `${last} ${first}`.trim();
}

function chunkStudents(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) {
    out.push(arr.slice(i, i + size));
  }
  return out;
}

function fillToFour(arr) {
  const filled = [...arr];
  while (filled.length < 4) filled.push(null);
  return filled;
}

const styles = {
  // modale
  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,.35)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2000,
  },
  modal: {
    width: "90vw",
    maxWidth: "1200px",
    maxHeight: "95vh",
    background: "#ffffff",
    borderRadius: 12,
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
  },
  modalHeader: {
    padding: "0.75rem 1.25rem",
    borderBottom: "1px solid #E5E7EB",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "0.75rem",
  },
  modalTitle: {
    margin: 0,
    fontSize: "1rem",
    fontWeight: 700,
  },
  modalSubtitle: {
    margin: 0,
    marginTop: 2,
    fontSize: ".8rem",
    color: "#6B7280",
  },
  closeBtn: {
    border: "none",
    background: "transparent",
    fontSize: "1rem",
    cursor: "pointer",
  },
  previewWrapper: {
    flex: 1,
    padding: "1rem",
    overflow: "auto",
    background: "#F3F4F6",
    display: "flex",
    justifyContent: "center",
  },

  // plusieurs pages empilées
  pagesContainer: {
    display: "flex",
    flexDirection: "column",
    gap: "14px",
  },

  // feuille A4 (ratio)
  sheet: {
    width: "794px", // ~ A4 à 96dpi
    height: "1123px",
    background: "#ffffff",
    boxShadow: "0 0 0 1px #E5E7EB",
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gridTemplateRows: "1fr 1fr",
    padding: "10px",
    boxSizing: "border-box",
    gap: "10px",
    color: "#111827", // ✅ force une couleur sûre (évite héritage oklch)
  },

  badge: {
    border: "2px solid #03A992",
    borderRadius: 10,
    padding: "6px",
    boxSizing: "border-box",
    display: "flex",
    background: "linear-gradient(180deg,#ffffff 0%, #f8fafc 100%)",
  },
  badgeEmpty: {
    flex: 1,
    borderRadius: 8,
    border: "1px dashed #D1D5DB",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  badgeInner: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    borderRadius: 8,
    overflow: "hidden",
    border: "1px solid #E5E7EB",
    background: "#fff",
    color: "#111827", // ✅ safe
  },
  badgeTitleBar: {
    background: "#FFA53C",
    color: "#ffffff",
    fontWeight: 800,
    textAlign: "center",
    padding: "4px 0",
    fontSize: ".9rem",
    letterSpacing: 0.4,
  },
  badgeHeader: {
    borderBottom: "1px solid #E5E7EB",
    position: "relative",
    minHeight: 32,
  },

  badgeBody: {
    flex: 1,
    padding: "8px",
    display: "flex",
    gap: "8px",
    fontSize: ".78rem",
  },

  photoCol: {
    width: 92,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 6,
  },
  photoFrame: {
    width: 82,
    height: 100,
    borderRadius: 6,
    border: "2px dashed #D1D5DB",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#fff",
    overflow: "hidden",
  },
  photo: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
  },
  photoPlaceholder: {
    fontWeight: 700,
    fontSize: ".75rem",
    color: "#9CA3AF",
  },
  matriculeChip: {
    background: "#ECFDF3",
    color: "#047857",
    fontWeight: 800,
    fontSize: ".75rem",
    padding: "3px 8px",
    borderRadius: 999,
    border: "1px solid #A7F3D0",
    textAlign: "center",
    width: "100%",
  },

  infoCol: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    gap: 6,
  },
  nameBlock: {
    fontWeight: 800,
    fontSize: ".95rem",
    color: "#111827",
    background: "#F0FDF9",
    border: "1px solid #B4E1D6",
    padding: "4px 6px",
    borderRadius: 6,
    textAlign: "center",
  },
  infoRow: {
    display: "flex",
    gap: 6,
    alignItems: "baseline",
  },
  infoLabel: {
    fontWeight: 700,
    color: "#374151",
    minWidth: 70,
  },
  infoValue: {
    fontWeight: 600,
    color: "#111827",
  },

  footerSlogan: {
    marginTop: "auto",
    textAlign: "center",
    fontWeight: 800,
    color: "#F97316",
    fontSize: ".8rem",
    paddingTop: 6,
    borderTop: "1px dashed #E5E7EB",
  },

  footer: {
    padding: "0.75rem 1.25rem",
    borderTop: "1px solid #E5E7EB",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "0.75rem",
  },
  secondaryBtn: {
    borderRadius: 999,
    border: "1px solid #D1D5DB",
    background: "#ffffff",
    padding: "0.45rem 1.1rem",
    fontSize: ".85rem",
    cursor: "pointer",
  },
  outlineBtn: {
    borderRadius: 999,
    border: "1px solid #059669",
    background: "#ffffff",
    color: "#059669",
    padding: "0.45rem 1.1rem",
    fontSize: ".85rem",
    cursor: "pointer",
    fontWeight: 600,
  },
  primaryBtn: {
    borderRadius: 999,
    border: "none",
    background: "#059669",
    color: "#ffffff",
    padding: "0.45rem 1.1rem",
    fontSize: ".85rem",
    cursor: "pointer",
    fontWeight: 700,
  },
};
