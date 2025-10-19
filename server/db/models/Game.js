import { DataTypes } from "sequelize";
import sequelize from "../config.js";

const Game = sequelize.define(
  "Game",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    roomId: {
      type: DataTypes.STRING,
      unique: true,
      allowNull: false,
    },
    phase: {
      type: DataTypes.ENUM("lobby", "playing", "finished", "abandoned"),
      defaultValue: "lobby",
      allowNull: false,
    },
    winnerId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: "users",
        key: "id",
      },
    },
    cardsPerPlayer: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    totalTurns: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    gameState: {
      type: DataTypes.JSONB,
      allowNull: true,
      comment: "Estado completo del juego serializado",
    },
    startedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    finishedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    duration: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: "Duración en segundos",
    },
  },
  {
    tableName: "games",
    timestamps: true,
  }
);

export default Game;
