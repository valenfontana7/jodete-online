// Script para inicializar la base de datos en producción
// Ejecutar con: node scripts/init-db.js

import "dotenv/config";
import { sequelize } from "../server/db/index.js";

async function initDatabase() {
  try {
    console.log("🔄 Conectando a la base de datos...");
    await sequelize.authenticate();
    console.log("✅ Conexión establecida");

    console.log("🔄 Creando tablas...");
    // force: true elimina y recrea todas las tablas (CUIDADO: borra datos)
    // alter: true modifica tablas existentes
    // Por defecto (sin opciones) solo crea si no existen
    await sequelize.sync({ force: false, alter: true });
    console.log("✅ Tablas creadas/actualizadas correctamente");

    // Mostrar tablas creadas
    const [results] = await sequelize.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `);

    console.log("\n📋 Tablas en la base de datos:");
    results.forEach((row) => console.log(`  - ${row.table_name}`));

    console.log("\n✅ Base de datos inicializada correctamente");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error inicializando la base de datos:", error);
    process.exit(1);
  }
}

initDatabase();
