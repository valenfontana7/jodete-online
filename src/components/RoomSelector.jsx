import "./RoomSelector.css";

function describeRoomPhase(phase) {
  switch (phase) {
    case "lobby":
      return "En lobby";
    case "playing":
      return "En juego";
    case "finished":
      return "Finalizada";
    default:
      return "Desconocido";
  }
}

export default function RoomSelector({
  rooms,
  roomsLoaded,
  joinableRooms,
  selectedRoomId,
  nameInput,
  socketConnected,
  pendingJoin,
  pendingLeave,
  error,
  onNameInputChange,
  onRoomSelect,
  onJoinSubmit,
}) {
  return (
    <section className="panel join-panel" style={{ "--panel-delay": "40ms" }}>
      <h2>Sumate a la mesa</h2>
      <p className="panel-subtitle">
        Ingresá tu nombre y elegí una sala o creá una nueva.
      </p>
      <form className="join-form" onSubmit={onJoinSubmit}>
        <input
          className="text-input"
          placeholder="Tu nombre o apodo"
          maxLength={32}
          value={nameInput}
          onChange={(event) => onNameInputChange(event.target.value)}
          disabled={
            !socketConnected || pendingJoin || pendingLeave || !roomsLoaded
          }
        />
        <button
          type="submit"
          className="primary"
          disabled={
            !socketConnected || pendingJoin || pendingLeave || !roomsLoaded
          }
        >
          {pendingJoin
            ? "Conectando..."
            : !roomsLoaded
            ? "Sincronizando..."
            : selectedRoomId
            ? "Unirme a sala"
            : "Crear sala nueva"}
        </button>
      </form>
      {!roomsLoaded ? (
        <p className="hint">Sincronizando salas disponibles...</p>
      ) : rooms.length > 0 ? (
        <div className="rooms-panel">
          <p className="hint">
            {joinableRooms.length
              ? selectedRoomId
                ? "Seleccionaste una sala. Presioná 'Unirme' o elegí 'Crear sala nueva' deseleccionando."
                : "Salas disponibles (hacé click para unirte) o creá una nueva:"
              : "Solo hay partidas finalizadas. Creá una sala nueva."}
          </p>
          <div className="rooms-list">
            {rooms.map((room) => {
              const isSelected = selectedRoomId === room.id;
              const phaseKey = room.phase ?? "lobby";
              const isJoinable = room.phase !== "finished";
              const cardClass = `room-card${
                isSelected ? " room-card--active" : ""
              }${isJoinable ? "" : " room-card--disabled"}`;
              return (
                <button
                  type="button"
                  key={room.id}
                  className={cardClass}
                  onClick={() => onRoomSelect(isSelected ? null : room.id)}
                  disabled={!isJoinable || pendingJoin || pendingLeave}
                >
                  <div className="room-card__info">
                    <span className="room-name">{room.name}</span>
                    {room.hostName && (
                      <span className="room-host">👑 {room.hostName}</span>
                    )}
                    <div className="room-card__people">
                      {room.players.map((player) => (
                        <span
                          key={player.id}
                          className={`room-player-chip${
                            player.connected ? "" : " room-player-chip--away"
                          }`}
                        >
                          {player.name}
                        </span>
                      ))}
                      {!room.players.length && (
                        <span className="room-player-chip room-player-chip--empty">
                          Sala vacía
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="room-card__meta">
                    <span className={`room-phase room-phase--${phaseKey}`}>
                      {describeRoomPhase(phaseKey)}
                    </span>
                    <span className="room-card__players">
                      👥 {room.playerCount}
                    </span>
                    {room.phase === "finished" && (
                      <span className="room-note">Finalizada</span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        <p className="hint">
          No hay salas activas. Se creará una nueva sala cuando te unas.
        </p>
      )}
      {error && <p className="error-banner">{error}</p>}
      {joinableRooms.length > 0 && (
        <p className="hint hint--tip">
          💡 Tip: Hacé click en una sala para unirte, o dejala sin seleccionar
          para crear una nueva.
        </p>
      )}
      <p className="hint">
        Compartí la URL de esta página para invitar a otros jugadores.
      </p>
    </section>
  );
}
