import SuitIcon from "../SuitIcon";
import { SUIT_META } from "../constants/gameConstants";
import "./SuitSelector.css";

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

export default function SuitSelector({ onConfirm, onCancel }) {
  return (
    <div className="modal-backdrop">
      <div className="modal">
        <h3>Elegí el palo para el 10</h3>
        <div className="suit-picker">
          {SUIT_META.map((suit) => (
            <button
              key={suit.id}
              type="button"
              className={`card-tile card-tile--tall ${suit.tone}`}
              onClick={() => onConfirm(suit.id)}
              style={{
                "--card-tilt": `${getCardTilt(`picker-${suit.id}`)}deg`,
                "--grain-angle": `${getCardGrainAngle(`picker-${suit.id}`)}deg`,
              }}
            >
              <div className="card-face">
                <span className="card-corner card-corner--top">
                  <span className="card-corner-value">10</span>
                  <span className="card-corner-suit">🃏</span>
                </span>
                <div className="card-illustration">
                  <div
                    className="card-ornament-row card-ornament-row--top"
                    aria-hidden="true"
                  >
                    <span className="card-ornament card-ornament--dot">✶</span>
                    <span className="card-ornament card-ornament--suit">
                      <SuitIcon suit={suit.id} />
                    </span>
                    <span className="card-ornament card-ornament--dot">✶</span>
                  </div>
                  <span className="card-icon">
                    <SuitIcon suit={suit.id} />
                  </span>
                  <div
                    className="card-ornament-row card-ornament-row--bottom"
                    aria-hidden="true"
                  >
                    <span className="card-ornament card-ornament--dot">✶</span>
                    <span className="card-ornament card-ornament--suit">
                      <SuitIcon suit={suit.id} />
                    </span>
                    <span className="card-ornament card-ornament--dot">✶</span>
                  </div>
                  <span className="card-ribbon">{suit.label}</span>
                </div>
                <span className="card-corner card-corner--bottom">
                  <span className="card-corner-value">10</span>
                  <span className="card-corner-suit">🃏</span>
                </span>
              </div>
            </button>
          ))}
        </div>
        <button type="button" className="ghost" onClick={onCancel}>
          Cancelar
        </button>
      </div>
    </div>
  );
}
