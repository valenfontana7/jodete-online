import { useState, useEffect, useCallback } from "react";
import "./Rankings.css";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

export default function Rankings({ onClose }) {
  const [rankings, setRankings] = useState([]);
  const [stats, setStats] = useState(null);
  const [sortBy, setSortBy] = useState("wins");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadRankings = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `${API_URL}/api/rankings?sortBy=${sortBy}&limit=50`
      );
      const data = await response.json();

      if (data.success) {
        setRankings(data.rankings);
      } else {
        setError(data.error);
      }
    } catch (err) {
      console.error("Error cargando rankings:", err);
      setError("Error al cargar rankings");
    } finally {
      setLoading(false);
    }
  }, [sortBy]);

  const loadStats = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/api/rankings/stats`);
      const data = await response.json();

      if (data.success) {
        setStats(data.stats);
      }
    } catch (err) {
      console.error("Error cargando estadísticas:", err);
    }
  }, []);

  useEffect(() => {
    loadRankings();
    loadStats();
  }, [loadRankings, loadStats]);

  const formatWinRate = (rate) => {
    return `${(rate * 100).toFixed(1)}%`;
  };

  const getMedalEmoji = (position) => {
    switch (position) {
      case 1:
        return "🥇";
      case 2:
        return "🥈";
      case 3:
        return "🥉";
      default:
        return "";
    }
  };

  const handleOverlayClick = (e) => {
    if (e.target.className === "rankings-overlay") {
      onClose();
    }
  };

  if (loading) {
    return (
      <div className="rankings-overlay" onClick={handleOverlayClick}>
        <div className="rankings-modal">
          <div className="loading">Cargando rankings...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rankings-overlay" onClick={handleOverlayClick}>
        <div className="rankings-modal">
          <div className="error">Error: {error}</div>
          <button onClick={onClose}>Cerrar</button>
        </div>
      </div>
    );
  }

  const top3 = rankings.slice(0, 3);
  const rest = rankings.slice(3);

  return (
    <div className="rankings-overlay" onClick={handleOverlayClick}>
      <div className="rankings-modal">
        <button className="close-button" onClick={onClose}>
          ✕
        </button>

        <h2>🏆 Rankings</h2>

        {stats && (
          <div className="global-stats">
            <div className="stat-item">
              <span className="stat-label">Total Jugadores:</span>
              <span className="stat-value">{stats.totalPlayers}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Total Partidas:</span>
              <span className="stat-value">{stats.totalGames}</span>
            </div>
            {stats.topWinner && (
              <div className="stat-item">
                <span className="stat-label">Más Victorias:</span>
                <span className="stat-value">
                  {stats.topWinner.name} ({stats.topWinner.wins})
                </span>
              </div>
            )}
            {stats.mostActive && (
              <div className="stat-item">
                <span className="stat-label">Más Activo:</span>
                <span className="stat-value">
                  {stats.mostActive.name} ({stats.mostActive.games} partidas)
                </span>
              </div>
            )}
          </div>
        )}

        <div className="sort-tabs">
          <button
            className={sortBy === "wins" ? "active" : ""}
            onClick={() => setSortBy("wins")}
          >
            Por Victorias
          </button>
          <button
            className={sortBy === "games" ? "active" : ""}
            onClick={() => setSortBy("games")}
          >
            Por Partidas
          </button>
          <button
            className={sortBy === "winrate" ? "active" : ""}
            onClick={() => setSortBy("winrate")}
          >
            Por Win Rate
          </button>
        </div>

        {top3.length > 0 && (
          <div className="podium">
            {top3.map((player, index) => (
              <div
                key={player.id}
                className={`podium-place podium-${
                  index === 0 ? "first" : index === 1 ? "second" : "third"
                }`}
              >
                <div className="podium-medal">{getMedalEmoji(index + 1)}</div>
                {player.avatar && (
                  <img
                    src={player.avatar}
                    alt={player.name}
                    className="podium-avatar"
                  />
                )}
                <div className="podium-name">{player.name}</div>
                <div className="podium-stats">
                  <div>🎮 {player.gamesPlayed}</div>
                  <div>🏆 {player.gamesWon}</div>
                  <div>📊 {formatWinRate(player.winRate)}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {rest.length > 0 && (
          <div className="rankings-table-container">
            <table className="rankings-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Jugador</th>
                  <th>Partidas</th>
                  <th>Victorias</th>
                  <th>Win Rate</th>
                </tr>
              </thead>
              <tbody>
                {rest.map((player, index) => (
                  <tr key={player.id}>
                    <td>{index + 4}</td>
                    <td className="player-cell">
                      {player.avatar && (
                        <img
                          src={player.avatar}
                          alt={player.name}
                          className="table-avatar"
                        />
                      )}
                      <span>{player.name}</span>
                    </td>
                    <td>{player.gamesPlayed}</td>
                    <td>{player.gamesWon}</td>
                    <td>{formatWinRate(player.winRate)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {rankings.length === 0 && (
          <div className="no-data">
            No hay datos de rankings todavía. ¡Sé el primero en jugar!
          </div>
        )}
      </div>
    </div>
  );
}
