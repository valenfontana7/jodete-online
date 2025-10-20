import "./LobbyControls.css";

export default function LobbyControls({
  isHost,
  cardsPerPlayer,
  cardsPerPlayerOptions,
  canStart,
  onCardsPerPlayerChange,
  onStart,
}) {
  return (
    <div className="lobby-controls">
      <label className="control">
        <span>Cartas por jugador</span>
        <select
          value={cardsPerPlayer ?? ""}
          onChange={(event) =>
            onCardsPerPlayerChange(Number(event.target.value))
          }
          disabled={!isHost}
        >
          {(cardsPerPlayerOptions ?? []).map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </label>
      <button
        type="button"
        className="primary"
        onClick={onStart}
        disabled={!canStart}
      >
        Comenzar partida
      </button>
    </div>
  );
}
