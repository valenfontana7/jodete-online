import "./GameLog.css";

function formatTimestamp(timestamp) {
  if (!timestamp) return "";
  const date = new Date(timestamp);
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");
  return `${hours}:${minutes}:${seconds}`;
}

export default function GameLog({ messages }) {
  return (
    <section className="panel log-panel" style={{ "--panel-delay": "200ms" }}>
      <header className="panel-header">
        <h2>Historial</h2>
      </header>
      <ul className="log-list">
        {messages
          ?.slice()
          .reverse()
          .map((message) => (
            <li key={message.id}>
              <span className="log-time">
                {formatTimestamp(message.timestamp)}
              </span>
              <span className="log-text">{message.text}</span>
            </li>
          ))}
      </ul>
    </section>
  );
}
