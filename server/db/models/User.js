import { DataTypes } from "sequelize";
import sequelize from "../config.js";

const User = sequelize.define(
  "User",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    googleId: {
      type: DataTypes.STRING,
      unique: true,
      allowNull: true,
    },
    email: {
      type: DataTypes.STRING,
      unique: true,
      allowNull: true,
      validate: {
        isEmail: true,
      },
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    avatar: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    gamesPlayed: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    gamesWon: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    gamesLost: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    specialCards2: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    specialCards4: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    specialCards10: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    specialCards11: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    specialCards12: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    totalPlayTime: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: "En minutos",
    },
    jodetesCalled: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    jodetesReceived: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    lastLogin: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    tableName: "users",
    timestamps: true,
  }
);

// Método virtual para calcular win rate
User.prototype.getWinRate = function () {
  if (this.gamesPlayed === 0) return 0;
  return ((this.gamesWon / this.gamesPlayed) * 100).toFixed(2);
};

export default User;
