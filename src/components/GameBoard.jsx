import SuitIcon from "../SuitIcon";
import {
  SUIT_META,
  VALUE_NAMES,
  VALUE_SIGNS,
} from "../constants/gameConstants";
import "./GameBoard.css";

function getCardTilt(cardId) {
  const hash = String(cardId)
    .split("")
    .reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return (hash % 9) - 4;
}

function getCardGrainAngle(cardId) {
  const hash = String(cardId)
    .split("")
    .reduce((acc, char) => acc * 31 + char.charCodeAt(0), 0);
  return hash % 360;
}

function describeCard(card) {
  if (!card) return "";
  const valueName = VALUE_NAMES[card.value] ?? card.value;
  const suit = SUIT_META.find((item) => item.id === card.suit);
  return `${valueName} de ${suit?.label ?? card.suit}`;
}

export default function GameBoard({
  gameState,
  lastActionKey,
  canDraw,
  canDeclareLastCard,
  jodeteTargets,
  onDraw,
  onDeclareLastCard,
  onCallJodete,
  children,
}) {
  return (
    <section className="panel board-panel" style={{ "--panel-delay": "120ms" }}>
      <header className="panel-header">
        <h2>Tablero</h2>
        {gameState?.lastAction && (
          <span key={lastActionKey} className="last-action">
            {gameState.lastAction}
          </span>
        )}
      </header>

      <div className="board-state">
        <div className="board-info">
          <div>
            <span className="label">Palo actual</span>
            <span className="value">
              {gameState?.currentSuit
                ? SUIT_META.find((item) => item.id === gameState.currentSuit)
                    ?.label ?? gameState.currentSuit
                : "Libre"}
            </span>
          </div>
          <div>
            <span className="label">Sentido</span>
            <span className="value">
              {gameState?.direction === -1 ? "↺ Reversa" : "↻ Normal"}
            </span>
          </div>
          <div>
            <span className="label">Mazo</span>
            <span className="value">{gameState?.deckCount ?? 0}</span>
          </div>
          <div>
            <span className="label">Descartes</span>
            <span className="value">{gameState?.discardCount ?? 0}</span>
          </div>
          {gameState?.pendingDraw ? (
            <div className="pending">
              {`Próximo roba ${gameState.pendingDraw} carta(s)`}
            </div>
          ) : null}
          <button
            type="button"
            className="primary"
            onClick={onDraw}
            disabled={!canDraw}
          >
            Robar carta
          </button>
          <button
            type="button"
            className="ghost"
            onClick={onDeclareLastCard}
            disabled={!canDeclareLastCard}
          >
            Última carta
          </button>
          <div className="jodete-targets">
            {jodeteTargets.map((player, index) => (
              <button
                key={player.id}
                type="button"
                className="ghost"
                onClick={() => onCallJodete(player.id)}
                disabled={gameState?.phase !== "playing"}
                style={{ animationDelay: `${index * 80}ms` }}
              >
                ¡Jodete {player.name}!
              </button>
            ))}
          </div>
        </div>
        <div className="top-card">
          <span className="label">Carta superior</span>
          {gameState?.topCard ? (
            (() => {
              const suit = SUIT_META.find(
                (item) => item.id === gameState.topCard.suit
              );
              const valueName =
                VALUE_NAMES[gameState.topCard.value] ?? gameState.topCard.value;
              const valueSign =
                VALUE_SIGNS[gameState.topCard.value] ?? gameState.topCard.value;
              const cardId = gameState.topCard.id ?? "top-card";
              const cardStyle = {
                "--card-tilt": `${getCardTilt(cardId)}deg`,
                "--grain-angle": `${getCardGrainAngle(cardId)}deg`,
              };
              return (
                <div
                  className={`card-tile card-tile--large ${suit?.tone ?? ""}`}
                  aria-label={describeCard(gameState.topCard)}
                  style={cardStyle}
                >
                  <div className="card-face card-face--large">
                    <span className="card-corner card-corner--top">
                      <span className="card-corner-value">{valueSign}</span>
                      <span className="card-corner-suit">
                        <SuitIcon suit={suit?.id} />
                      </span>
                    </span>
                    <div className="card-illustration">
                      <div
                        className="card-ornament-row card-ornament-row--top"
                        aria-hidden="true"
                      >
                        <span className="card-ornament card-ornament--dot">
                          ✶
                        </span>
                        <span className="card-ornament card-ornament--suit">
                          <SuitIcon suit={suit?.id} />
                        </span>
                        <span className="card-ornament card-ornament--dot">
                          ✶
                        </span>
                      </div>
                      <span className="card-icon">
                        <SuitIcon suit={suit?.id} />
                      </span>
                      <div
                        className="card-ornament-row card-ornament-row--bottom"
                        aria-hidden="true"
                      >
                        <span className="card-ornament card-ornament--dot">
                          ✶
                        </span>
                        <span className="card-ornament card-ornament--suit">
                          <SuitIcon suit={suit?.id} />
                        </span>
                        <span className="card-ornament card-ornament--dot">
                          ✶
                        </span>
                      </div>
                      <span className="card-ribbon">{valueName}</span>
                    </div>
                    <span className="card-corner card-corner--bottom">
                      <span className="card-corner-value">{valueSign}</span>
                      <span className="card-corner-suit">
                        <SuitIcon suit={suit?.id} />
                      </span>
                    </span>
                  </div>
                </div>
              );
            })()
          ) : (
            <div className="card-placeholder">Mazo preparado</div>
          )}
        </div>
      </div>
      {children}
    </section>
  );
}
