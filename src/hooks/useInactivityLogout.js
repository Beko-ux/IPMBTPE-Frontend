// src/hooks/useInactivityLogout.js
import { useEffect, useRef } from "react";
import useAuthStore from "../store/useAuthStore";

const INACTIVITY_TIMEOUT = 30 * 60 * 1000; // 30 minutes

export function useInactivityLogout() {
  const { logout } = useAuthStore();
  const timerRef = useRef(null);

  useEffect(() => {
    const resetTimer = () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        logout();
        // Optionnel : rediriger vers la page de connexion ou afficher un message
        window.location.reload(); // Force un rechargement pour nettoyer l'état
      }, INACTIVITY_TIMEOUT);
    };

    // Événements à surveiller
    const events = ["mousemove", "keydown", "click", "scroll", "touchstart"];

    events.forEach((event) => window.addEventListener(event, resetTimer));

    // Initialisation du timer
    resetTimer();

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      events.forEach((event) => window.removeEventListener(event, resetTimer));
    };
  }, [logout]);
}