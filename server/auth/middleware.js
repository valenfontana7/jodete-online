import { verifyToken, extractToken } from "./jwt.js";
import { User } from "../db/index.js";

/**
 * Middleware para verificar autenticación JWT
 * Protege rutas que requieren usuario autenticado
 */
export async function requireAuth(req, res, next) {
  try {
    // Intentar obtener token de varias fuentes
    let token = null;

    // 1. Del header Authorization
    if (req.headers.authorization) {
      token = extractToken(req.headers.authorization);
    }

    // 2. De las cookies
    if (!token && req.cookies && req.cookies.token) {
      token = req.cookies.token;
    }

    // 3. Del query string (útil para WebSocket)
    if (!token && req.query && req.query.token) {
      token = req.query.token;
    }

    if (!token) {
      return res.status(401).json({
        error: "No autorizado",
        message: "No se proporcionó token de autenticación",
      });
    }

    // Verificar el token
    const payload = verifyToken(token);
    if (!payload) {
      return res.status(401).json({
        error: "No autorizado",
        message: "Token inválido o expirado",
      });
    }

    // Obtener usuario de la base de datos
    // Soportar tanto tokens antiguos (id) como nuevos (userId)
    const userId = payload.userId || payload.id;
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(401).json({
        error: "No autorizado",
        message: "Usuario no encontrado",
      });
    }

    // Agregar usuario a la request para usarlo en las rutas
    req.user = user;
    req.userId = user.id;

    next();
  } catch (error) {
    console.error("❌ Error en middleware de autenticación:", error);
    return res.status(500).json({
      error: "Error del servidor",
      message: "Error al verificar autenticación",
    });
  }
}

/**
 * Middleware opcional de autenticación
 * No falla si no hay token, solo agrega el usuario si existe
 */
export async function optionalAuth(req, res, next) {
  try {
    let token = null;

    if (req.headers.authorization) {
      token = extractToken(req.headers.authorization);
    }

    if (!token && req.cookies && req.cookies.token) {
      token = req.cookies.token;
    }

    if (!token && req.query && req.query.token) {
      token = req.query.token;
    }

    if (token) {
      const payload = verifyToken(token);
      if (payload) {
        // Soportar tanto tokens antiguos (id) como nuevos (userId)
        const userId = payload.userId || payload.id;
        const user = await User.findByPk(userId);
        if (user) {
          req.user = user;
          req.userId = user.id;
        }
      }
    }

    next();
  } catch (error) {
    console.error("⚠️ Error en autenticación opcional:", error);
    // No devolver error, simplemente continuar sin usuario
    next();
  }
}
