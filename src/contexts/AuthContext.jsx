import { createContext, useContext, useState, useEffect } from "react";

const AuthContext = createContext(null);

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Verificar si hay token guardado y obtener datos del usuario
  useEffect(() => {
    const initAuth = async () => {
      try {
        // 1. Verificar si hay token en el query string (después del callback de Google)
        const urlParams = new URLSearchParams(window.location.search);
        const tokenFromUrl = urlParams.get("token");
        const errorFromUrl = urlParams.get("error");

        if (errorFromUrl) {
          setError("Error en la autenticación. Por favor, intenta de nuevo.");
          setLoading(false);
          // Limpiar URL
          window.history.replaceState(
            {},
            document.title,
            window.location.pathname
          );
          return;
        }

        if (tokenFromUrl) {
          // Guardar token en localStorage
          localStorage.setItem("authToken", tokenFromUrl);
          // Limpiar URL
          window.history.replaceState(
            {},
            document.title,
            window.location.pathname
          );
        }

        // 2. Intentar obtener token de localStorage
        const token = localStorage.getItem("authToken");

        if (!token) {
          setLoading(false);
          return;
        }

        // 3. Verificar token con el backend
        const response = await fetch(`${API_URL}/auth/me`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          setUser(data.user);
        } else {
          // Token inválido o expirado
          localStorage.removeItem("authToken");
        }
      } catch (err) {
        console.error("Error inicializando autenticación:", err);
        localStorage.removeItem("authToken");
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, []);

  const login = () => {
    // Redirigir a la ruta de autenticación de Google
    window.location.href = `${API_URL}/auth/google`;
  };

  const logout = () => {
    localStorage.removeItem("authToken");
    setUser(null);
    // Opcional: notificar al backend
    fetch(`${API_URL}/auth/logout`, { method: "POST" }).catch(console.error);
  };

  const getToken = () => {
    return localStorage.getItem("authToken");
  };

  const refreshUser = async () => {
    try {
      const token = localStorage.getItem("authToken");
      if (!token) return;

      const response = await fetch(`${API_URL}/auth/me`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
        console.log("✅ Estadísticas actualizadas:", data.user);
      }
    } catch (err) {
      console.error("Error refrescando usuario:", err);
    }
  };

  const value = {
    user,
    loading,
    error,
    isAuthenticated: !!user,
    login,
    logout,
    getToken,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth debe usarse dentro de un AuthProvider");
  }
  return context;
}
