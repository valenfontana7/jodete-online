import SuitIcon from "../SuitIcon";
import {
  SUIT_META,
  VALUE_NAMES,
  VALUE_SIGNS,
} from "../constants/gameConstants";
import "./PlayerHand.css";

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

export default function PlayerHand({
  hand,
  sortedHand,
  playableCards,
  isMyTurn,
  onPlayCard,
}) {
  return (
    <section className="hand-section">
      <header className="panel-header">
        <h3>Tu mano ({hand?.length ?? 0})</h3>
        {isMyTurn ? (
          <span className="tag tag--turn">Tu turno</span>
        ) : (
          <span className="tag">Esperando</span>
        )}
      </header>
      <div className="hand-grid">
        {sortedHand.map((card, index) => {
          const suit = SUIT_META.find((item) => item.id === card.suit);
          const playable = playableCards.has(card.id) && isMyTurn;
          const valueName = VALUE_NAMES[card.value] ?? card.value;
          const valueSign = VALUE_SIGNS[card.value] ?? card.value;
          const tileStyle = {
            "--item-delay": `${index * 40}ms`,
            "--grain-angle": `${getCardGrainAngle(card.id)}deg`,
          };
          return (
            <button
              type="button"
              key={card.id}
              className={`card-tile ${suit?.tone ?? ""} ${
                playable ? "card-tile--playable" : "card-tile--blocked"
              }`}
              onClick={() => onPlayCard(card)}
              disabled={!playable}
              title={describeCard(card)}
              aria-label={describeCard(card)}
              style={tileStyle}
            >
              <div className="card-face">
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
                    <span className="card-ornament card-ornament--dot">✶</span>
                    <span className="card-ornament card-ornament--suit">
                      <SuitIcon suit={suit?.id} />
                    </span>
                    <span className="card-ornament card-ornament--dot">✶</span>
                  </div>
                  <span className="card-icon">
                    <SuitIcon suit={suit?.id} />
                  </span>
                  <div
                    className="card-ornament-row card-ornament-row--bottom"
                    aria-hidden="true"
                  >
                    <span className="card-ornament card-ornament--dot">✶</span>
                    <span className="card-ornament card-ornament--suit">
                      <SuitIcon suit={suit?.id} />
                    </span>
                    <span className="card-ornament card-ornament--dot">✶</span>
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
            </button>
          );
        })}
        {!sortedHand.length && (
          <p className="empty-hint">Sin cartas en mano.</p>
        )}
      </div>
    </section>
  );
}
