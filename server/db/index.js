import sequelize from "./config.js";
import User from "./models/User.js";
import Game from "./models/Game.js";
import GamePlayer from "./models/GamePlayer.js";
import GameAction from "./models/GameAction.js";

// Establecer relaciones entre modelos

// Un Game puede tener un ganador (User)
Game.belongsTo(User, { as: "winner", foreignKey: "winnerId" });
User.hasMany(Game, { as: "wonGames", foreignKey: "winnerId" });

// Un Game tiene muchos GamePlayers
Game.hasMany(GamePlayer, {
  as: "players",
  foreignKey: "gameId",
  onDelete: "CASCADE",
});
GamePlayer.belongsTo(Game, { foreignKey: "gameId" });

// Un User puede tener muchos GamePlayers (diferentes partidas)
User.hasMany(GamePlayer, { foreignKey: "userId" });
GamePlayer.belongsTo(User, { foreignKey: "userId" });

// Un Game tiene muchas GameActions (historial)
Game.hasMany(GameAction, {
  as: "actions",
  foreignKey: "gameId",
  onDelete: "CASCADE",
});
GameAction.belongsTo(Game, { foreignKey: "gameId" });

// Un GamePlayer puede tener muchas GameActions
GamePlayer.hasMany(GameAction, { foreignKey: "gamePlayerId" });
GameAction.belongsTo(GamePlayer, { foreignKey: "gamePlayerId" });

/**
 * Conecta a la base de datos y sincroniza los modelos
 * @returns {Promise<boolean>} true si la conexión fue exitosa
 */
export async function connectDatabase() {
  try {
    await sequelize.authenticate();
    console.log("✅ Conexión a PostgreSQL establecida correctamente");

    // Sincronizar modelos (solo en desarrollo)
    // ⚠️ En producción usar migraciones
    if (process.env.NODE_ENV !== "production") {
      await sequelize.sync({ alter: true });
      console.log("✅ Modelos sincronizados con la base de datos");
    }

    return true;
  } catch (error) {
    console.error("❌ Error conectando a PostgreSQL:", error);
    console.error(
      "   Verifica que PostgreSQL esté corriendo y las credenciales en .env"
    );
    return false;
  }
}

export { sequelize, User, Game, GamePlayer, GameAction };
