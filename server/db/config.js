import { Sequelize } from "sequelize";
import process from "node:process";

let sequelize;

// Detectar si estamos en Render (producción) o local con DATABASE_URL
const isProduction =
  process.env.NODE_ENV === "production" ||
  process.env.RENDER === "true" ||
  (process.env.DATABASE_URL && process.env.DATABASE_URL.includes("render"));

// Si existe DATABASE_URL (producción o conexión a Render desde local), usarla directamente
if (process.env.DATABASE_URL) {
  sequelize = new Sequelize(process.env.DATABASE_URL, {
    dialect: "postgres",
    logging: isProduction ? false : console.log,
    dialectOptions: {
      ssl: isProduction ? { require: true, rejectUnauthorized: false } : false,
    },
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000,
    },
  });
} else {
  // Configuración para desarrollo local
  const dbConfig = {
    host: process.env.DB_HOST || "localhost",
    port: parseInt(process.env.DB_PORT) || 5432,
    database: process.env.DB_NAME || "jodete_online",
    username: process.env.DB_USER || "postgres",
    password: process.env.DB_PASSWORD || "postgres",
    dialect: "postgres",
    logging: process.env.NODE_ENV === "production" ? false : console.log,
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000,
    },
  };

  // Validar que la contraseña esté definida
  if (!dbConfig.password || typeof dbConfig.password !== "string") {
    console.error(
      "❌ ERROR: DB_PASSWORD no está configurado correctamente en .env"
    );
    console.error(
      "   Por favor verifica tu archivo .env y reinicia el servidor"
    );
  }

  sequelize = new Sequelize(dbConfig);
}

export default sequelize;
