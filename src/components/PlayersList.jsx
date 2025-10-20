import "./PlayersList.css";

export default function PlayersList({
  displayPlayers,
  gameState,
  isHost,
  me,
  pendingLeave,
  handleLeaveRoom,
  handleCallJodete,
  children,
}) {
  return (
    <section className="panel players-panel" style={{ "--panel-delay": "0ms" }}>
      <header className="panel-header">
        <div className="panel-heading">
          <h2>Jugadores</h2>
          {gameState?.roomName && (
            <span className="panel-caption">
              Sala: <br />
              {gameState.roomName}
            </span>
          )}
        </div>
        <div className="panel-controls">
          {isHost && <span className="badge">Anfitrión</span>}
          <button
            type="button"
            className="ghost small leave-button"
            onClick={handleLeaveRoom}
            disabled={pendingLeave}
          >
            {pendingLeave ? "Saliendo..." : "Salir de la sala"}
          </button>
        </div>
      </header>
      <ul className="players-list">
        {displayPlayers.length ? (
          displayPlayers.map((player, index) => (
            <li
              key={player.id}
              className={`player-row${
                player.isCurrent ? " player-row--turn" : ""
              }`}
              style={{ "--item-delay": `${index * 60}ms` }}
            >
              <div className="player-main">
                <span className="player-name">{player.name}</span>
                {player.isHost && <span className="tag">👑</span>}
                {!player.connected && (
                  <span className="tag tag--disconnected">Desconectado</span>
                )}
                {player.isSummaryOnly && (
                  <span className="tag tag--summary">Sincronizando</span>
                )}
              </div>
              <div className="player-meta">
                <span className="counter" title="Cartas en mano">
                  🃏 {player.cardCount ?? "—"}
                </span>
                {player.declaredLastCard && (
                  <span className="tag tag--safe">¡Avisó!</span>
                )}
                {player.id !== me?.id &&
                  player.cardCount === 1 &&
                  !player.declaredLastCard && (
                    <button
                      type="button"
                      className="ghost small"
                      onClick={() => handleCallJodete(player.id)}
                      disabled={gameState?.phase !== "playing"}
                    >
                      ¡Jodete!
                    </button>
                  )}
              </div>
            </li>
          ))
        ) : (
          <li className="player-placeholder">
            Aún no hay jugadores en esta sala.
          </li>
        )}
      </ul>
      {children}
    </section>
  );
}
