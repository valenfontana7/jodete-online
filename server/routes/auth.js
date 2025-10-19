import express from "express";
import passport from "../auth/passport.js";
import { generateToken } from "../auth/jwt.js";
import { requireAuth } from "../auth/middleware.js";

const router = express.Router();

const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";

/**
 * GET /auth/google
 * Inicia el flujo de autenticación con Google
 */
router.get(
  "/google",
  passport.authenticate("google", {
    scope: ["profile", "email"],
  })
);

/**
 * GET /auth/google/callback
 * Google redirige aquí después de la autenticación
 */
router.get(
  "/google/callback",
  passport.authenticate("google", {
    failureRedirect: `${FRONTEND_URL}?error=auth_failed`,
    session: false, // No usar sesiones, usaremos JWT
  }),
  (req, res) => {
    try {
      // Generar JWT token
      const token = generateToken(req.user);

      // Redirigir al frontend con el token
      // El frontend lo capturará del query string y lo guardará en localStorage
      res.redirect(`${FRONTEND_URL}?token=${token}`);
    } catch (error) {
      console.error("❌ Error generando token:", error);
      res.redirect(`${FRONTEND_URL}?error=token_generation_failed`);
    }
  }
);

/**
 * GET /auth/me
 * Obtiene información del usuario autenticado
 */
router.get("/me", requireAuth, async (req, res) => {
  try {
    res.json({
      success: true,
      user: {
        id: req.user.id,
        email: req.user.email,
        name: req.user.name,
        avatar: req.user.avatar,
        stats: {
          gamesPlayed: req.user.gamesPlayed,
          gamesWon: req.user.gamesWon,
          gamesLost: req.user.gamesLost,
          winRate: req.user.getWinRate(),
          specialCards: {
            card2: req.user.specialCards2,
            card4: req.user.specialCards4,
            card10: req.user.specialCards10,
            card11: req.user.specialCards11,
            card12: req.user.specialCards12,
          },
          jodetes: {
            called: req.user.jodetesCalled,
            received: req.user.jodetesReceived,
          },
          totalPlayTime: req.user.totalPlayTime,
        },
        lastLogin: req.user.lastLogin,
        createdAt: req.user.createdAt,
      },
    });
  } catch (error) {
    console.error("❌ Error obteniendo perfil:", error);
    res.status(500).json({
      success: false,
      error: "Error obteniendo perfil de usuario",
    });
  }
});

/**
 * POST /auth/logout
 * Cierra sesión (en cliente se debe eliminar el token)
 */
router.post("/logout", (req, res) => {
  res.json({
    success: true,
    message: "Sesión cerrada correctamente",
  });
});

/**
 * GET /auth/status
 * Verifica si hay credenciales de Google configuradas
 */
router.get("/status", (req, res) => {
  const isConfigured =
    process.env.GOOGLE_CLIENT_ID &&
    process.env.GOOGLE_CLIENT_SECRET &&
    !process.env.GOOGLE_CLIENT_ID.includes("your_client_id") &&
    !process.env.GOOGLE_CLIENT_SECRET.includes("your_client_secret");

  res.json({
    configured: isConfigured,
    message: isConfigured
      ? "Google OAuth está configurado"
      : "Google OAuth no está configurado. Agrega GOOGLE_CLIENT_ID y GOOGLE_CLIENT_SECRET en .env",
  });
});

export default router;
