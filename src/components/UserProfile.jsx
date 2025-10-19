import { useAuth } from "../contexts/AuthContext";

export default function UserProfile() {
  const { user, isAuthenticated } = useAuth();

  if (!isAuthenticated || !user) {
    return null;
  }

  const stats = user.stats || {};

  return (
    <div className="user-profile-card">
      <div className="profile-header">
        {user.avatar && (
          <img
            src={user.avatar}
            alt={user.name}
            className="profile-avatar"
            referrerPolicy="no-referrer"
          />
        )}
        <div className="profile-info">
          <h2>{user.name}</h2>
          {user.email && <p className="profile-email">{user.email}</p>}
        </div>
      </div>

      <div className="profile-stats">
        <h3>Estadísticas</h3>

        <div className="stat-row">
          <span className="stat-label">Partidas jugadas:</span>
          <span className="stat-value">{stats.gamesPlayed || 0}</span>
        </div>

        <div className="stat-row">
          <span className="stat-label">Partidas ganadas:</span>
          <span className="stat-value">{stats.gamesWon || 0}</span>
        </div>

        <div className="stat-row">
          <span className="stat-label">Partidas perdidas:</span>
          <span className="stat-value">{stats.gamesLost || 0}</span>
        </div>

        <div className="stat-row highlight">
          <span className="stat-label">Tasa de victoria:</span>
          <span className="stat-value">{stats.winRate || 0}%</span>
        </div>

        <h4>Cartas Especiales Jugadas</h4>

        <div className="special-cards">
          <div className="card-stat">
            <span className="card-icon">🃏 2</span>
            <span className="card-count">{stats.specialCards?.card2 || 0}</span>
          </div>
          <div className="card-stat">
            <span className="card-icon">🃏 4</span>
            <span className="card-count">{stats.specialCards?.card4 || 0}</span>
          </div>
          <div className="card-stat">
            <span className="card-icon">🃏 10</span>
            <span className="card-count">
              {stats.specialCards?.card10 || 0}
            </span>
          </div>
          <div className="card-stat">
            <span className="card-icon">🃏 J</span>
            <span className="card-count">
              {stats.specialCards?.card11 || 0}
            </span>
          </div>
          <div className="card-stat">
            <span className="card-icon">🃏 Q</span>
            <span className="card-count">
              {stats.specialCards?.card12 || 0}
            </span>
          </div>
        </div>

        <h4>¡Jódete!</h4>

        <div className="stat-row">
          <span className="stat-label">Veces que dijiste "¡Jódete!":</span>
          <span className="stat-value">{stats.jodetes?.called || 0}</span>
        </div>

        <div className="stat-row">
          <span className="stat-label">Veces que te jodieron:</span>
          <span className="stat-value">{stats.jodetes?.received || 0}</span>
        </div>

        <div className="stat-row">
          <span className="stat-label">Tiempo total jugado:</span>
          <span className="stat-value">
            {Math.floor((stats.totalPlayTime || 0) / 60)} horas{" "}
            {(stats.totalPlayTime || 0) % 60} minutos
          </span>
        </div>
      </div>

      {user.lastLogin && (
        <div className="profile-footer">
          <small>
            Último acceso:{" "}
            {new Date(user.lastLogin).toLocaleDateString("es-ES", {
              year: "numeric",
              month: "long",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </small>
        </div>
      )}
    </div>
  );
}
