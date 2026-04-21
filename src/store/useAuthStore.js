// src/store/useAuthStore.js
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { auth } from "../firebase-client";
import { signInWithEmailAndPassword, signOut, onAuthStateChanged, updateProfile } from "firebase/auth";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:4000";

const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      role: null,
      loading: true,

      initialize: () => {
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
          if (firebaseUser) {
            try {
              const token = await firebaseUser.getIdToken();
              const res = await fetch(`${API_BASE}/users/me`, {
                headers: { Authorization: `Bearer ${token}` },
              });
              if (res.ok) {
                const data = await res.json();
                set({ user: firebaseUser, token, role: data.role, loading: false });
              } else {
                await signOut(auth);
                set({ user: null, token: null, role: null, loading: false });
              }
            } catch (error) {
              console.error("Erreur récupération token/rôle:", error);
              set({ loading: false });
            }
          } else {
            set({ user: null, token: null, role: null, loading: false });
          }
        });
        return unsubscribe;
      },

      login: async (email, password) => {
        set({ loading: true });
        try {
          const userCredential = await signInWithEmailAndPassword(auth, email, password);
          const token = await userCredential.user.getIdToken();

          const res = await fetch(`${API_BASE}/users/me`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (!res.ok) throw new Error("Impossible de récupérer le rôle");
          const data = await res.json();

          set({
            user: userCredential.user,
            token,
            role: data.role,
            loading: false,
          });
          return { success: true, role: data.role };
        } catch (error) {
          console.error("Erreur login:", error);
          set({ loading: false });
          return { success: false, error: error.message };
        }
      },

      logout: async () => {
        await signOut(auth);
      },

      updateUserProfile: async (updates) => {
        const currentUser = auth.currentUser;
        if (!currentUser) return;
        await updateProfile(currentUser, updates);
        set({ user: { ...get().user, ...updates } });
      },

      canAccess: (page, action = "read") => {
        const role = get().role;
        if (!role) return false;
        if (role === "super_admin") return true;

        const permissions = {
          dashboard: { read: true },
          etudiants: { read: true, write: ["cellule_informatique", "secretaire", "gestionnaire"] },
          classes: { read: true },
          matieres: { read: ["cellule_informatique"], write: ["cellule_informatique"] },
          modules: { read: ["cellule_informatique"], write: ["cellule_informatique"] },
          documents: { read: true },
          notes: { read: ["cellule_informatique"], write: ["cellule_informatique"] },
          liste_presence: { read: ["cellule_informatique", "censeur"], write: ["cellule_informatique", "censeur"] },
          evaluations: { read: ["cellule_informatique"], write: ["cellule_informatique"] },
          anonymats: { read: ["cellule_informatique"], write: ["cellule_informatique"] },
          rapports: { read: true },
          scolarite: { read: ["gestionnaire"], write: ["gestionnaire"] },
          materiel: { read: ["cellule_informatique"], write: ["cellule_informatique"] },
          admin_users: { read: ["super_admin"], write: ["super_admin"] },
          profile: { read: true },
        };

        const perm = permissions[page];
        if (!perm) return false;

        if (action === "read") {
          if (perm.read === true) return true;
          if (Array.isArray(perm.read)) return perm.read.includes(role);
        }
        if (action === "write") {
          if (perm.write === true) return true;
          if (Array.isArray(perm.write)) return perm.write.includes(role);
        }
        return false;
      },
    }),
    {
      name: "auth-storage",
      partialize: (state) => ({ user: state.user, token: state.token, role: state.role }),
    }
  )
);

export default useAuthStore;