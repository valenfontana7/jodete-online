import jwt from "jsonwebtoken";

const JWT_SECRET =
  process.env.JWT_SECRET || "default-secret-change-in-production";
const JWT_EXPIRES_IN = "7d"; // Token válido por 7 días

/**
 * Genera un JWT token para un usuario
 * @param {Object} user - Objeto de usuario de la base de datos
 * @returns {string} JWT token
 */
export function generateToken(user) {
  const payload = {
    userId: user.id, // ← Cambiado de 'id' a 'userId' para consistencia
    email: user.email,
    name: user.name,
    avatar: user.avatar,
  };

  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  });
}

/**
 * Verifica y decodifica un JWT token
 * @param {string} token - JWT token a verificar
 * @returns {Object|null} Payload del token o null si es inválido
 */
export function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    console.error("❌ Error verificando token:", error.message);
    return null;
  }
}

/**
 * Extrae el token del header Authorization
 * @param {string} authHeader - Header Authorization completo
 * @returns {string|null} Token extraído o null
 */
export function extractToken(authHeader) {
  if (!authHeader) return null;

  // Formato esperado: "Bearer TOKEN"
  const parts = authHeader.split(" ");
  if (parts.length === 2 && parts[0] === "Bearer") {
    return parts[1];
  }

  return null;
}
