import { DataTypes } from "sequelize";
import sequelize from "../config.js";

const GamePlayer = sequelize.define(
  "GamePlayer",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    gameId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "games",
        key: "id",
      },
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: "users",
        key: "id",
      },
    },
    playerName: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    socketId: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    connected: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    finalCardCount: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    position: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: "Orden del jugador en la partida (1, 2, 3...)",
    },
  },
  {
    tableName: "game_players",
    timestamps: true,
  }
);

export default GamePlayer;
