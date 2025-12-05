const BASE = import.meta.env.VITE_API_URL || "http://localhost:4000";

export async function createStudent(payload) {
  const res = await fetch(`${BASE}/students`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Erreur d’enregistrement");
  return data; // { id, matricule }
}
