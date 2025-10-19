import { DataTypes } from "sequelize";
import sequelize from "../config.js";

const GameAction = sequelize.define(
  "GameAction",
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
    gamePlayerId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: "game_players",
        key: "id",
      },
    },
    actionType: {
      type: DataTypes.ENUM(
        "play",
        "draw",
        "declare",
        "jodete",
        "start",
        "finish"
      ),
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    cardPlayed: {
      type: DataTypes.JSONB,
      allowNull: true,
      comment: "Detalles de la carta jugada si aplica",
    },
    turnNumber: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    timestamp: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      allowNull: false,
    },
  },
  {
    tableName: "game_actions",
    timestamps: true,
    createdAt: true,
    updatedAt: false,
  }
);

export default GameAction;
