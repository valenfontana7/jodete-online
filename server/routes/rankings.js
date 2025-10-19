import express from "express";
import { User } from "../db/index.js";
import { Op } from "sequelize";

const router = express.Router();

/**
 * GET /api/rankings
 * Obtiene el ranking de jugadores según diferentes métricas
 *
 * Query params:
 * - sortBy: wins|games|winrate (default: wins)
 * - limit: número de jugadores a devolver (default: 50)
 */
router.get("/", async (req, res) => {
  try {
    const { sortBy = "wins", limit = 50 } = req.query;
    const limitNum = Math.min(parseInt(limit) || 50, 100); // Máximo 100

    // Base query - solo jugadores con al menos 1 partida
    const whereClause = {
      gamesPlayed: {
        [Op.gt]: 0,
      },
    };

    let orderClause;
    switch (sortBy) {
      case "games":
        orderClause = [
          ["gamesPlayed", "DESC"],
          ["gamesWon", "DESC"],
        ];
        break;
      case "winrate":
        // Para ordenar por win rate, primero obtenemos todos los usuarios
        // y luego los ordenamos en JavaScript ya que el cálculo dinámico
        // en SQL puede ser problemático con Sequelize
        orderClause = [
          ["gamesWon", "DESC"],
          ["gamesPlayed", "ASC"],
        ];
        break;
      case "wins":
      default:
        orderClause = [
          ["gamesWon", "DESC"],
          ["gamesPlayed", "DESC"],
        ];
        break;
    }

    const users = await User.findAll({
      where: whereClause,
      attributes: [
        "id",
        "name",
        "avatar",
        "gamesPlayed",
        "gamesWon",
        "specialCards2",
        "specialCards4",
        "specialCards10",
        "specialCards11",
        "specialCards12",
        "jodetesCalled",
        "jodetesReceived",
        "totalPlayTime",
        "createdAt",
      ],
      order: orderClause,
      limit: limitNum,
    });

    // Calcular win rate y formatear datos
    let rankings = users.map((user) => {
      const winRate =
        user.gamesPlayed > 0
          ? ((user.gamesWon / user.gamesPlayed) * 100).toFixed(1)
          : 0;

      const totalSpecialCards =
        user.specialCards2 +
        user.specialCards4 +
        user.specialCards10 +
        user.specialCards11 +
        user.specialCards12;

      return {
        id: user.id,
        name: user.name,
        avatar: user.avatar,
        gamesPlayed: user.gamesPlayed,
        gamesWon: user.gamesWon,
        winRate: parseFloat(winRate),
        specialCards: totalSpecialCards,
        jodetesCalled: user.jodetesCalled,
        jodetesReceived: user.jodetesReceived,
        totalPlayTime: user.totalPlayTime,
        memberSince: user.createdAt,
      };
    });

    // Si se ordena por winrate, ordenar en JavaScript
    if (sortBy === "winrate") {
      rankings.sort((a, b) => {
        if (b.winRate !== a.winRate) {
          return b.winRate - a.winRate;
        }
        return b.gamesWon - a.gamesWon;
      });
    }

    // Agregar rank después de ordenar
    rankings = rankings.map((player, index) => ({
      rank: index + 1,
      ...player,
    }));

    res.json({
      success: true,
      sortBy,
      total: rankings.length,
      rankings,
    });
  } catch (error) {
    console.error("❌ Error obteniendo rankings:", error);
    res.status(500).json({
      success: false,
      error: "Error al obtener rankings",
      message: error.message,
    });
  }
});

/**
 * GET /api/rankings/stats
 * Obtiene estadísticas globales del juego
 */
router.get("/stats", async (req, res) => {
  try {
    const totalPlayers = await User.count({
      where: {
        gamesPlayed: {
          [Op.gt]: 0,
        },
      },
    });

    const totalGames = await User.sum("gamesPlayed");

    // Jugador con más victorias
    const topWinner = await User.findOne({
      where: {
        gamesPlayed: {
          [Op.gt]: 0,
        },
      },
      order: [["gamesWon", "DESC"]],
      attributes: ["name", "gamesWon"],
    });

    // Jugador con más partidas
    const mostActive = await User.findOne({
      where: {
        gamesPlayed: {
          [Op.gt]: 0,
        },
      },
      order: [["gamesPlayed", "DESC"]],
      attributes: ["name", "gamesPlayed"],
    });

    res.json({
      success: true,
      stats: {
        totalPlayers,
        totalGames,
        topWinner: topWinner
          ? {
              name: topWinner.name,
              wins: topWinner.gamesWon,
            }
          : null,
        mostActive: mostActive
          ? {
              name: mostActive.name,
              games: mostActive.gamesPlayed,
            }
          : null,
      },
    });
  } catch (error) {
    console.error("❌ Error obteniendo estadísticas:", error);
    res.status(500).json({
      success: false,
      error: "Error al obtener estadísticas",
      message: error.message,
    });
  }
});

export default router;
