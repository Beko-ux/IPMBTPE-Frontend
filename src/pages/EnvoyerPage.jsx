// src/pages/EnvoyerPage.jsx
import { useEffect, useMemo, useState } from "react";
import {
  Upload,
  Search,
  Plus,
  Send,
  Mail,
  ChevronRight,
  FileText,
  Users,
  X,
  Check,
  Bell,
  Layers,
} from "lucide-react";
import { colors } from "../styles/theme";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:4000";

function useWindowWidth() {
  const [w, setW] = useState(
    typeof window !== "undefined" ? window.innerWidth : 1200
  );
  useEffect(() => {
    const onResize = () => setW(window.innerWidth);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  return w;
}

function safeStr(x) {
  return (x ?? "").toString();
}
function norm(x) {
  return safeStr(x).trim().toLowerCase();
}
function pickPhone(stu) {
  return (
    safeStr(stu?.phone) ||
    safeStr(stu?.telephone) ||
    safeStr(stu?.tel) ||
    safeStr(stu?.mobile) ||
    safeStr(stu?.phoneNumber) ||
    ""
  ).trim();
}
function pickEmail(stu) {
  return (safeStr(stu?.email) || safeStr(stu?.mail) || "").trim();
}
function pickName(stu) {
  return (
    safeStr(stu?.fullName) ||
    `${safeStr(stu?.firstName)} ${safeStr(stu?.lastName)}`.trim() ||
    safeStr(stu?.name) ||
    ""
  ).trim();
}
function pickMatricule(stu) {
  return (
    safeStr(stu?.matricule) ||
    safeStr(stu?.registrationNumber) ||
    safeStr(stu?.matriculation) ||
    ""
  ).trim();
}

export default function EnvoyerPage({ academicYear = "2025-2026", onNavigate }) {
  const width = useWindowWidth();
  const isMobile = width < 980;

  const [query, setQuery] = useState("");
  const [selectedTarget, setSelectedTarget] = useState(null);
  const [dragOver, setDragOver] = useState(false);

  const [targetMode, setTargetMode] = useState("person"); // person | class
  const [composerOpen, setComposerOpen] = useState(false);

  // message
  const [title, setTitle] = useState("Message");
  const [body, setBody] = useState("");
  const [templateMode, setTemplateMode] = useState(true);
  const [sendPush, setSendPush] = useState(true);

  const [sending, setSending] = useState(false);
  const [lastResult, setLastResult] = useState(null);

  // PERSONS placeholder
  const persons = useMemo(
    () => [
      {
        id: "daac",
        name: "DAAC",
        role: "Directeur des affaires académiques",
        hint: "Diffusion officielle",
        type: "person",
        parentId: "daac",
      },
      {
        id: "p01",
        name: "Mme Ndzié Carine",
        role: "Parent",
        hint: "+237 6xx xxx xxx",
        type: "person",
        parentId: "p01",
      },
      {
        id: "s01",
        name: "Tchuenkam Deguy Joël",
        role: "Étudiant",
        hint: "25IPGLI0005",
        type: "person",
        studentId: "s01",
      },
    ],
    []
  );

  // CLASSES from backend (using academicYear prop)
  const [classes, setClasses] = useState([]);
  const [loadingClasses, setLoadingClasses] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoadingClasses(true);
      try {
        const res = await fetch(
          `${API_BASE}/classes?year=${encodeURIComponent(academicYear)}`
        );
        const data = await res.json();
        setClasses(Array.isArray(data) ? data : []);
      } catch (e) {
        console.error("Erreur chargement classes:", e);
        setClasses([]);
      } finally {
        setLoadingClasses(false);
      }
    };
    load();
  }, [academicYear]);

  const classesAsTargets = useMemo(() => {
    return classes.map((c) => {
      const students = Array.isArray(c.students) ? c.students : [];
      return {
        id: c.id,
        type: "class",
        classId: c.id,
        name: c.title || c.abbrev || c.id,
        hint: `${c.academicYear || academicYear}${
          students.length ? ` • ${students.length} étudiant(s)` : ""
        }`,
        raw: c,
      };
    });
  }, [classes, academicYear]);

  const selectedClass = useMemo(() => {
    if (!selectedTarget || selectedTarget.type !== "class") return null;
    return (
      classes.find((c) => c.id === selectedTarget.classId) ||
      selectedTarget.raw ||
      null
    );
  }, [selectedTarget, classes]);

  const classStudents = useMemo(() => {
    const st = Array.isArray(selectedClass?.students)
      ? selectedClass.students
      : [];
    return [...st].sort((a, b) => {
      const A = norm(pickName(a));
      const B = norm(pickName(b));
      if (A < B) return -1;
      if (A > B) return 1;
      return norm(pickMatricule(a)).localeCompare(norm(pickMatricule(b)));
    });
  }, [selectedClass]);

  const classContactStats = useMemo(() => {
    const total = classStudents.length;
    let withPhone = 0;
    let withEmail = 0;
    for (const s of classStudents) {
      if (pickPhone(s)) withPhone++;
      if (pickEmail(s)) withEmail++;
    }
    return { total, withPhone, withEmail };
  }, [classStudents]);

  // RECENT placeholder
  const recent = useMemo(
    () => [
      {
        id: "r1",
        name: "DAAC",
        role: "Officiel",
        hint: "Rapport notes — CGE BTS1",
        when: "Aujourd’hui",
      },
      {
        id: "r2",
        name: "Classe BTS1",
        role: "Classe",
        hint: "Message — Devoir SN",
        when: "Hier",
      },
    ],
    []
  );

  // filtering
  const filteredTargets = useMemo(() => {
    const q = norm(query);
    const list = targetMode === "person" ? persons : classesAsTargets;
    if (!q) return list;
    return list.filter((t) => {
      const hay = `${t.name} ${t.role || ""} ${t.hint || ""}`.toLowerCase();
      return hay.includes(q);
    });
  }, [query, persons, classesAsTargets, targetMode]);

  // actions
  const onDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    alert(
      "Fichier reçu (placeholder). Plus tard: upload Storage + attacher au message."
    );
  };

  const onPickTarget = (t) => setSelectedTarget(t);

  const actionCreateRecipient = () =>
    alert("Créer destinataire (placeholder modal).");
  const actionInviteRecipient = () =>
    alert("Inviter destinataire (placeholder modal).");

  const openComposer = () => {
    if (!selectedTarget) return;
    setComposerOpen(true);
    setLastResult(null);
    if (!body) {
      if (targetMode === "class") {
        setBody(
          "Bonjour {{firstName}},\n\nVoici votre information.\n\nCordialement."
        );
      } else {
        setBody("Bonjour,\n\nVoici votre information.\n\nCordialement.");
      }
    }
  };

  const closeComposer = () => setComposerOpen(false);

  async function sendNow() {
    if (!selectedTarget) return;
    if (!body.trim()) {
      alert("Le contenu du message est vide.");
      return;
    }

    setSending(true);
    setLastResult(null);

    try {
      const payload =
        targetMode === "person"
          ? {
              mode: "person",
              target: {
                studentId: selectedTarget.studentId || null,
                parentId: selectedTarget.parentId || null,
              },
              message: { title, body, templateMode: false },
              options: { push: sendPush },
            }
          : {
              mode: "class",
              target: { classId: selectedTarget.classId },
              message: { title, body, templateMode: templateMode },
              options: { push: sendPush },
            };

      const res = await fetch(`${API_BASE}/messages/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur d’envoi");

      setLastResult(data);
    } catch (e) {
      alert(e.message || "Erreur d’envoi");
    } finally {
      setSending(false);
    }
  }

  const gridStyle = isMobile
    ? { ...pageStyles.grid, gridTemplateColumns: "1fr" }
    : pageStyles.grid;

  return (
    <div style={{ maxWidth: "1600px", margin: "0 auto" }}>
      {/* TOP BAR */}
      <div style={pageStyles.topbar}>
        <div>
          <div style={pageStyles.kicker}>Communication</div>
          <h1 style={pageStyles.h1}>Envoyer</h1>
          <p style={pageStyles.sub}>
            Envoi via <b>Inbox Firestore</b> + (optionnel){" "}
            <b>Notifications Push (FCM)</b>.
          </p>
        </div>

        <button
          type="button"
          style={{
            ...pageStyles.primaryBtn,
            opacity: selectedTarget ? 1 : 0.6,
            cursor: selectedTarget ? "pointer" : "not-allowed",
          }}
          onClick={openComposer}
          disabled={!selectedTarget}
        >
          <Send size={16} />
          <span>Composer</span>
        </button>
      </div>

      {/* GRID */}
      <div style={gridStyle}>
        {/* LEFT */}
        <section style={cardStyles.card}>
          <div style={cardStyles.cardHeader}>
            <div style={cardStyles.cardTitle}>Choisir une cible</div>
            <div style={cardStyles.cardHint}>Personne ou Classe.</div>
          </div>

          {/* Tabs */}
          <div style={tabsStyles.wrap}>
            <button
              type="button"
              onClick={() => {
                setTargetMode("person");
                setSelectedTarget(null);
                setQuery("");
              }}
              style={{
                ...tabsStyles.tab,
                ...(targetMode === "person" ? tabsStyles.tabActive : null),
              }}
            >
              <Users size={16} />
              <span>Personne</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setTargetMode("class");
                setSelectedTarget(null);
                setQuery("");
              }}
              style={{
                ...tabsStyles.tab,
                ...(targetMode === "class" ? tabsStyles.tabActive : null),
              }}
            >
              <Layers size={16} />
              <span>Classe</span>
            </button>
          </div>

          {/* Upload */}
          <div style={cardStyles.block}>
            <div style={cardStyles.blockTitle}>
              Téléverser un document (optionnel)
            </div>
            <div style={cardStyles.blockSub}>
              Plus tard : upload Firebase Storage + joindre au message.
            </div>

            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={onDrop}
              style={{
                ...uploadStyles.dropzone,
                borderColor: dragOver ? colors.teal : colors.border,
                background: dragOver
                  ? "rgba(20, 184, 166, .06)"
                  : "var(--bg)",
              }}
            >
              <div style={uploadStyles.iconBox}>
                <Upload size={18} />
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <div style={uploadStyles.dropTitle}>
                  Glisser-déposer ici ou{" "}
                  <span style={uploadStyles.dropLink}>
                    cliquer pour téléverser
                  </span>
                </div>
                <div style={uploadStyles.dropHint}>
                  PDF, PNG ou JPG — placeholder
                </div>
              </div>
            </div>
          </div>

          <div style={cardStyles.orRow}>
            <div style={cardStyles.orLine} />
            <div style={cardStyles.orText}>OU</div>
            <div style={cardStyles.orLine} />
          </div>

          {/* Search */}
          <div style={cardStyles.block}>
            <div style={cardStyles.blockTitle}>
              {targetMode === "person"
                ? "Choisir une personne"
                : "Choisir une classe"}
            </div>
            <div style={cardStyles.blockSub}>
              {targetMode === "class"
                ? "Après sélection, les étudiants s’affichent dans Aperçu (à droite)."
                : "Recherche par nom, matricule, téléphone…"}
            </div>

            <div style={searchStyles.searchWrap}>
              <Search size={16} color={colors.gray} />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={
                  targetMode === "person"
                    ? "Rechercher une personne"
                    : "Rechercher une classe"
                }
                style={searchStyles.input}
              />
            </div>

            {targetMode === "person" && (
              <div style={searchStyles.quickActions}>
                <button
                  type="button"
                  style={searchStyles.softBtn}
                  onClick={actionCreateRecipient}
                >
                  <Plus size={16} />
                  <span>Créer</span>
                </button>

                <button
                  type="button"
                  style={searchStyles.softBtn}
                  onClick={actionInviteRecipient}
                >
                  <Mail size={16} />
                  <span>Inviter</span>
                </button>
              </div>
            )}

            {/* LIST */}
            <div style={listStyles.list}>
              {targetMode === "class" && loadingClasses && (
                <div style={hintBoxStyles.box}>Chargement des classes…</div>
              )}

              {filteredTargets.slice(0, 12).map((t) => {
                const active = selectedTarget?.id === t.id;
                const isClass = t.type === "class";
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => onPickTarget(t)}
                    style={{
                      ...listStyles.row,
                      borderColor: active ? colors.teal : colors.border,
                      background: active ? "rgba(20,184,166,.06)" : "#fff",
                    }}
                  >
                    <div style={listStyles.avatar}>
                      {isClass ? <Users size={16} /> : <FileText size={16} />}
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={listStyles.nameRow}>
                        <span style={listStyles.name}>{t.name}</span>
                        <span style={listStyles.role}>
                          {t.role || (isClass ? "Classe" : "")}
                        </span>
                      </div>
                      <div style={listStyles.hint}>{t.hint}</div>
                    </div>

                    <ChevronRight size={16} color={colors.gray} />
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        {/* RIGHT */}
        <section style={cardStyles.card}>
          <div style={cardStyles.cardHeader}>
            <div style={cardStyles.cardTitle}>Aperçu</div>
            <div style={cardStyles.cardHint}>
              L’envoi crée un message dans l’Inbox Firestore + option Push FCM.
            </div>
          </div>

          <div style={previewStyles.panel}>
            <div style={previewStyles.badge}>Étape suivante</div>

            {!selectedTarget ? (
              <div style={previewStyles.empty}>
                <div style={previewStyles.emptyTitle}>Sélectionne une cible</div>
                <div style={previewStyles.emptyText}>
                  Ensuite tu composeras ton message et tu choisis si tu veux le
                  Push.
                </div>
              </div>
            ) : (
              <div style={previewStyles.selected}>
                <div style={previewStyles.selTop}>
                  <div style={previewStyles.selAvatar}>
                    {selectedTarget.type === "class" ? (
                      <Users size={18} />
                    ) : (
                      <FileText size={18} />
                    )}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={previewStyles.selName}>
                      {selectedTarget.name}
                    </div>
                    <div style={previewStyles.selMeta}>
                      {(selectedTarget.role || "Classe")} •{" "}
                      {selectedTarget.hint}
                    </div>
                  </div>
                </div>

                <div style={previewStyles.actions}>
                  <button
                    type="button"
                    style={previewStyles.primary}
                    onClick={openComposer}
                  >
                    <Send size={16} />
                    <span>Composer & envoyer</span>
                  </button>

                  <button
                    type="button"
                    style={previewStyles.secondary}
                    onClick={() => alert("Joindre document (placeholder)")}
                  >
                    <FileText size={16} />
                    <span>Joindre un fichier</span>
                  </button>
                </div>

                <div style={previewStyles.note}>
                  ✅ <b>Inbox Firestore</b> = message lisible dans l’app. <br />
                  ✅ <b>Push FCM</b> = notification “Nouveau message”.
                </div>
              </div>
            )}
          </div>

          {/* ✅ SHOW STUDENTS when class selected */}
          {targetMode === "class" && selectedClass && (
            <div style={{ marginTop: 14 }}>
              <div style={studentsCardStyles.header}>
                <div>
                  <div style={studentsCardStyles.title}>
                    Destinataires (classe)
                  </div>
                  <div style={studentsCardStyles.sub}>
                    {classContactStats.total} étudiant(s) •{" "}
                    {classContactStats.withPhone} avec téléphone •{" "}
                    {classContactStats.withEmail} avec email
                  </div>
                </div>
                <div style={studentsCardStyles.badge}>
                  {selectedClass.title || selectedClass.id}
                </div>
              </div>

              <div style={studentsCardStyles.tableWrap}>
                <table style={studentsCardStyles.table}>
                  <thead>
                    <tr>
                      <th style={studentsCardStyles.thNum}>#</th>
                      <th style={studentsCardStyles.th}>Matricule</th>
                      <th style={studentsCardStyles.th}>Nom complet</th>
                      <th style={studentsCardStyles.th}>Téléphone</th>
                      <th style={studentsCardStyles.th}>Email</th>
                    </tr>
                  </thead>
                  <tbody>
                    {classStudents.length === 0 ? (
                      <tr>
                        <td colSpan={5} style={studentsCardStyles.empty}>
                          Aucun étudiant dans cette classe.
                        </td>
                      </tr>
                    ) : (
                      classStudents.map((stu, idx) => {
                        const phone = pickPhone(stu);
                        const email = pickEmail(stu);
                        return (
                          <tr key={stu.id || `${idx}-${pickMatricule(stu)}`}>
                            <td style={studentsCardStyles.tdNum}>
                              {idx + 1}
                            </td>
                            <td style={studentsCardStyles.tdMono}>
                              {pickMatricule(stu)}
                            </td>
                            <td style={studentsCardStyles.tdName}>
                              {pickName(stu)}
                            </td>
                            <td style={studentsCardStyles.td}>
                              {phone || ""}
                            </td>
                            <td style={studentsCardStyles.td}>
                              {email || ""}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              <div style={studentsCardStyles.note}>
                (Si téléphone/email n’existe pas, c’est laissé vide comme tu as
                demandé.)
              </div>
            </div>
          )}

          {/* RECENT */}
          <div style={{ marginTop: 14 }}>
            <div style={recentStyles.title}>Récemment envoyé</div>
            <div style={recentStyles.list}>
              {recent.map((r) => (
                <div key={r.id} style={recentStyles.item}>
                  <div style={recentStyles.dot} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={recentStyles.row1}>
                      <span style={recentStyles.name}>{r.name}</span>
                      <span style={recentStyles.when}>{r.when}</span>
                    </div>
                    <div style={recentStyles.meta}>
                      {r.role} • {r.hint}
                    </div>
                  </div>
                  <ChevronRight size={16} color={colors.gray} />
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>

      {/* COMPOSER MODAL */}
      {composerOpen && (
        <div style={modalStyles.backdrop} onMouseDown={closeComposer}>
          <div
            style={modalStyles.modal}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div style={modalStyles.header}>
              <div>
                <div style={modalStyles.titleRow}>
                  <div style={modalStyles.title}>Composer un message</div>
                  <div style={modalStyles.targetPill}>
                    {selectedTarget?.type === "class" ? (
                      <Users size={14} />
                    ) : (
                      <FileText size={14} />
                    )}
                    <span style={{ fontWeight: 900 }}>
                      {selectedTarget?.name}
                    </span>
                  </div>
                </div>
                <div style={modalStyles.subtitle}>
                  Envoi : Inbox Firestore {sendPush ? "+ Push FCM" : "(sans push)"}
                </div>
              </div>

              <button
                type="button"
                style={modalStyles.closeBtn}
                onClick={closeComposer}
              >
                <X size={18} />
              </button>
            </div>

            <div style={modalStyles.body}>
              <div style={formStyles.row}>
                <label style={formStyles.label}>Titre</label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  style={formStyles.input}
                  placeholder="Ex: Résultats S1"
                />
              </div>

              <div style={formStyles.row}>
                <label style={formStyles.label}>Message</label>
                <textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  style={formStyles.textarea}
                  placeholder="Écris ton message ici…"
                />
                {selectedTarget?.type === "class" && (
                  <div style={formStyles.help}>
                    Template (optionnel) : <b>{"{{firstName}}"}</b>,{" "}
                    <b>{"{{lastName}}"}</b>, <b>{"{{matricule}}"}</b>
                  </div>
                )}
              </div>

              <div style={formStyles.switchRow}>
                <button
                  type="button"
                  onClick={() => setSendPush((v) => !v)}
                  style={{
                    ...formStyles.switchBtn,
                    borderColor: sendPush ? colors.teal : colors.border,
                    background: sendPush ? "rgba(20,184,166,.08)" : "#fff",
                  }}
                >
                  <Bell
                    size={16}
                    color={sendPush ? colors.teal : colors.gray}
                  />
                  <span style={{ fontWeight: 900 }}>
                    {sendPush ? "Push activé" : "Push désactivé"}
                  </span>
                </button>

                {selectedTarget?.type === "class" && (
                  <button
                    type="button"
                    onClick={() => setTemplateMode((v) => !v)}
                    style={{
                      ...formStyles.switchBtn,
                      borderColor: templateMode ? colors.teal : colors.border,
                      background: templateMode
                        ? "rgba(20,184,166,.08)"
                        : "#fff",
                    }}
                  >
                    <Check
                      size={16}
                      color={templateMode ? colors.teal : colors.gray}
                    />
                    <span style={{ fontWeight: 900 }}>
                      {templateMode ? "Template ON" : "Template OFF"}
                    </span>
                  </button>
                )}
              </div>

              {lastResult && (
                <div style={resultStyles.box}>
                  <div style={resultStyles.title}>✅ Envoi réussi</div>
                  <pre style={resultStyles.pre}>
                    {JSON.stringify(lastResult, null, 2)}
                  </pre>
                </div>
              )}
            </div>

            <div style={modalStyles.footer}>
              <button
                type="button"
                style={modalStyles.secondaryBtn}
                onClick={closeComposer}
                disabled={sending}
              >
                Annuler
              </button>
              <button
                type="button"
                style={modalStyles.primaryBtn}
                onClick={sendNow}
                disabled={sending}
              >
                {sending ? "Envoi..." : "Envoyer"}
                <Send size={16} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ----------------- styles ----------------- */

const pageStyles = {
  topbar: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: "1rem",
    marginBottom: "1rem",
    flexWrap: "wrap",
  },
  kicker: {
    fontSize: ".72rem",
    color: colors.gray,
    fontWeight: 700,
    letterSpacing: ".02em",
  },
  h1: { margin: 0, fontSize: "1.3rem", fontWeight: 900 },
  sub: {
    margin: "6px 0 0",
    fontSize: ".9rem",
    color: colors.gray,
    maxWidth: 760,
    lineHeight: 1.35,
  },
  primaryBtn: {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    border: "none",
    borderRadius: 999,
    padding: "0.55rem 1rem",
    background: colors.teal,
    color: "#fff",
    fontWeight: 900,
    cursor: "pointer",
    boxShadow: "0 8px 20px rgba(0,0,0,.08)",
    whiteSpace: "nowrap",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "minmax(420px, 560px) 1fr",
    gap: "1rem",
    alignItems: "start",
  },
};

const cardStyles = {
  card: {
    background: "#fff",
    border: `1px solid ${colors.border}`,
    borderRadius: 16,
    boxShadow: "0 10px 30px rgba(0,0,0,.05)",
    padding: "1rem",
    minWidth: 0,
  },
  cardHeader: { marginBottom: 10 },
  cardTitle: { fontSize: ".95rem", fontWeight: 900, margin: 0 },
  cardHint: { marginTop: 4, fontSize: ".82rem", color: colors.gray },
  block: { marginTop: 12 },
  blockTitle: { fontSize: ".85rem", fontWeight: 900, marginBottom: 4 },
  blockSub: { fontSize: ".8rem", color: colors.gray, lineHeight: 1.35 },
  orRow: { display: "flex", alignItems: "center", gap: 10, margin: "14px 0 8px" },
  orLine: { height: 1, background: colors.border, flex: 1 },
  orText: { fontSize: ".72rem", fontWeight: 900, color: colors.gray },
};

const tabsStyles = {
  wrap: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 10,
    marginTop: 12,
  },
  tab: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: "0.55rem 0.8rem",
    borderRadius: 999,
    border: `1px solid ${colors.border}`,
    background: "var(--bg)",
    cursor: "pointer",
    fontWeight: 900,
  },
  tabActive: { borderColor: colors.teal, background: "rgba(20,184,166,.08)" },
};

const uploadStyles = {
  dropzone: {
    marginTop: 10,
    border: `1px dashed ${colors.border}`,
    borderRadius: 14,
    padding: "0.9rem",
    display: "flex",
    gap: 12,
    alignItems: "center",
    cursor: "pointer",
    userSelect: "none",
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 12,
    display: "grid",
    placeItems: "center",
    background: "var(--bg-sidebar-hi)",
    border: `1px solid ${colors.border}`,
  },
  dropTitle: { fontSize: ".86rem", fontWeight: 800 },
  dropLink: { color: colors.teal, textDecoration: "underline" },
  dropHint: { fontSize: ".78rem", color: colors.gray },
};

const searchStyles = {
  searchWrap: {
    marginTop: 10,
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "0.6rem 0.75rem",
    borderRadius: 999,
    border: `1px solid ${colors.border}`,
    background: "#fff",
  },
  input: {
    border: "none",
    outline: "none",
    fontSize: ".86rem",
    width: "100%",
    background: "transparent",
  },
  quickActions: { display: "flex", gap: 10, marginTop: 10 },
  softBtn: {
    flex: 1,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 999,
    border: `1px solid ${colors.border}`,
    background: "var(--bg)",
    padding: "0.5rem 0.8rem",
    fontWeight: 800,
    cursor: "pointer",
  },
};

const listStyles = {
  list: { marginTop: 10, display: "flex", flexDirection: "column", gap: 8 },
  row: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "0.65rem 0.7rem",
    borderRadius: 14,
    border: `1px solid ${colors.border}`,
    cursor: "pointer",
    textAlign: "left",
    background: "#fff",
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 999,
    display: "grid",
    placeItems: "center",
    background: "var(--bg-sidebar-hi)",
    border: `1px solid ${colors.border}`,
    flexShrink: 0,
  },
  nameRow: { display: "flex", gap: 8, alignItems: "baseline", minWidth: 0 },
  name: {
    fontWeight: 900,
    fontSize: ".86rem",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  role: { fontSize: ".78rem", color: colors.gray, whiteSpace: "nowrap" },
  hint: {
    fontSize: ".78rem",
    color: colors.gray,
    marginTop: 2,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
};

const previewStyles = {
  panel: {
    border: `1px solid ${colors.border}`,
    borderRadius: 16,
    padding: "1rem",
    background:
      "linear-gradient(180deg, rgba(20,184,166,.06), rgba(255,255,255,1))",
  },
  badge: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    fontSize: ".72rem",
    fontWeight: 900,
    color: colors.teal,
    border: `1px solid ${colors.teal}`,
    padding: "0.25rem 0.6rem",
    borderRadius: 999,
    background: "#fff",
    marginBottom: 10,
  },
  empty: { padding: "0.75rem 0" },
  emptyTitle: { fontWeight: 900, fontSize: ".95rem" },
  emptyText: {
    marginTop: 6,
    color: colors.gray,
    fontSize: ".85rem",
    lineHeight: 1.35,
  },
  selected: {},
  selTop: { display: "flex", gap: 10, alignItems: "center" },
  selAvatar: {
    width: 44,
    height: 44,
    borderRadius: 16,
    display: "grid",
    placeItems: "center",
    background: "#fff",
    border: `1px solid ${colors.border}`,
  },
  selName: {
    fontWeight: 900,
    fontSize: "1rem",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  selMeta: {
    marginTop: 2,
    fontSize: ".82rem",
    color: colors.gray,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  actions: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 10,
    marginTop: 12,
  },
  primary: {
    border: "none",
    borderRadius: 14,
    padding: "0.7rem 0.9rem",
    background: colors.teal,
    color: "#fff",
    fontWeight: 900,
    cursor: "pointer",
    display: "inline-flex",
    gap: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  secondary: {
    border: `1px solid ${colors.border}`,
    borderRadius: 14,
    padding: "0.7rem 0.9rem",
    background: "#fff",
    fontWeight: 900,
    cursor: "pointer",
    display: "inline-flex",
    gap: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  note: { marginTop: 12, fontSize: ".82rem", color: colors.gray, lineHeight: 1.35 },
};

const studentsCardStyles = {
  header: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 10,
  },
  title: { fontSize: ".95rem", fontWeight: 900, margin: 0 },
  sub: { marginTop: 4, fontSize: ".82rem", color: colors.gray, fontWeight: 700 },
  badge: {
    border: `1px solid ${colors.teal}`,
    color: colors.teal,
    background: "#fff",
    borderRadius: 999,
    padding: "0.25rem 0.6rem",
    fontWeight: 900,
    fontSize: ".75rem",
    whiteSpace: "nowrap",
  },
  tableWrap: {
    overflow: "auto",
    borderRadius: 14,
    border: `1px solid ${colors.border}`,
    background: "#fff",
  },
  table: { width: "100%", borderCollapse: "collapse", minWidth: 760 },
  thNum: { textAlign: "left", padding: "10px", fontSize: ".78rem", color: colors.gray, borderBottom: `1px solid ${colors.border}`, width: 40 },
  th: { textAlign: "left", padding: "10px", fontSize: ".78rem", color: colors.gray, borderBottom: `1px solid ${colors.border}` },
  tdNum: { padding: "10px", borderBottom: `1px solid ${colors.border}`, fontWeight: 900, color: colors.gray },
  tdMono: { padding: "10px", borderBottom: `1px solid ${colors.border}`, fontFamily: '"Courier New", monospace', fontSize: ".82rem" },
  tdName: { padding: "10px", borderBottom: `1px solid ${colors.border}`, fontWeight: 900, fontSize: ".85rem" },
  td: { padding: "10px", borderBottom: `1px solid ${colors.border}`, fontSize: ".85rem" },
  empty: { padding: "12px 10px", color: colors.gray, fontStyle: "italic" },
  note: { marginTop: 10, fontSize: ".8rem", color: colors.gray, lineHeight: 1.35 },
};

const recentStyles = {
  title: { fontSize: ".9rem", fontWeight: 900, marginBottom: 8 },
  list: { display: "flex", flexDirection: "column", gap: 8 },
  item: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "0.75rem",
    borderRadius: 16,
    border: `1px solid ${colors.border}`,
    background: "#fff",
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 999,
    background: colors.teal,
    boxShadow: "0 0 0 4px rgba(20,184,166,.12)",
  },
  row1: { display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 10 },
  name: { fontWeight: 900, fontSize: ".9rem" },
  when: { fontSize: ".78rem", color: colors.gray, fontWeight: 800 },
  meta: { marginTop: 2, fontSize: ".8rem", color: colors.gray, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },
};

const hintBoxStyles = {
  box: {
    border: `1px solid ${colors.border}`,
    borderRadius: 14,
    padding: "0.7rem 0.8rem",
    background: "var(--bg)",
    color: colors.gray,
    fontWeight: 800,
    fontSize: ".82rem",
  },
};

const modalStyles = {
  backdrop: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,.35)",
    display: "grid",
    placeItems: "center",
    padding: "1rem",
    zIndex: 50,
  },
  modal: {
    width: "min(820px, 96vw)",
    background: "#fff",
    borderRadius: 18,
    border: `1px solid ${colors.border}`,
    boxShadow: "0 20px 60px rgba(0,0,0,.25)",
    overflow: "hidden",
  },
  header: {
    padding: "0.9rem 1rem",
    borderBottom: `1px solid ${colors.border}`,
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  titleRow: { display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" },
  title: { fontWeight: 900, fontSize: "1rem" },
  subtitle: { marginTop: 4, fontSize: ".82rem", color: colors.gray, fontWeight: 700 },
  targetPill: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    borderRadius: 999,
    padding: "0.25rem 0.6rem",
    border: `1px solid ${colors.border}`,
    background: "var(--bg)",
  },
  closeBtn: {
    border: `1px solid ${colors.border}`,
    background: "#fff",
    borderRadius: 12,
    width: 40,
    height: 40,
    display: "grid",
    placeItems: "center",
    cursor: "pointer",
  },
  body: { padding: "1rem" },
  footer: {
    padding: "0.9rem 1rem",
    borderTop: `1px solid ${colors.border}`,
    display: "flex",
    justifyContent: "flex-end",
    gap: 10,
  },
  primaryBtn: {
    border: "none",
    borderRadius: 14,
    padding: "0.7rem 0.95rem",
    background: colors.teal,
    color: "#fff",
    fontWeight: 900,
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
  },
  secondaryBtn: {
    border: `1px solid ${colors.border}`,
    borderRadius: 14,
    padding: "0.7rem 0.95rem",
    background: "#fff",
    fontWeight: 900,
    cursor: "pointer",
  },
};

const formStyles = {
  row: { display: "flex", flexDirection: "column", gap: 6, marginBottom: 12 },
  label: { fontSize: ".82rem", fontWeight: 900, color: "var(--fg)" },
  input: {
    border: `1px solid ${colors.border}`,
    borderRadius: 14,
    padding: "0.65rem 0.8rem",
    fontSize: ".9rem",
    outline: "none",
  },
  textarea: {
    border: `1px solid ${colors.border}`,
    borderRadius: 14,
    padding: "0.65rem 0.8rem",
    fontSize: ".9rem",
    outline: "none",
    minHeight: 160,
    resize: "vertical",
  },
  help: { fontSize: ".78rem", color: colors.gray, fontWeight: 700 },
  switchRow: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 },
  switchBtn: {
    border: `1px solid ${colors.border}`,
    borderRadius: 14,
    background: "#fff",
    padding: "0.7rem 0.8rem",
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    justifyContent: "center",
  },
};

const resultStyles = {
  box: {
    marginTop: 14,
    border: `1px solid ${colors.border}`,
    borderRadius: 14,
    background: "var(--bg)",
    padding: "0.75rem",
  },
  title: { fontWeight: 900, marginBottom: 6 },
  pre: {
    margin: 0,
    fontSize: ".78rem",
    color: colors.gray,
    whiteSpace: "pre-wrap",
    wordBreak: "break-word",
  },
};