import "./SplashScreen.css";

export default function SplashScreen({
  status = "Inicializando mesa...",
  hint,
  progress = 0,
  visible = true,
}) {
  const progressValue = Math.round(Math.min(100, Math.max(0, progress)));
  const splashClassName = visible
    ? "app-splash"
    : "app-splash app-splash--hidden";

  return (
    <div
      className={splashClassName}
      role="dialog"
      aria-modal={visible ? "true" : undefined}
      aria-hidden={visible ? undefined : "true"}
      aria-label={status}
    >
      <div className="app-splash__surface">
        <div className="app-splash__spinner" aria-hidden="true" />
        <div className="app-splash__texts">
          <h1 className="app-splash__title">Jodete Online</h1>
          <p className="app-splash__status">{status}</p>
          <div
            className="app-splash__progress"
            role="progressbar"
            aria-valuenow={progressValue}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div
              className="app-splash__progress-bar"
              style={{ width: `${progressValue}%` }}
              aria-hidden="true"
            />
            <span className="app-splash__progress-text">{progressValue}%</span>
          </div>
          <p className="app-splash__hint">
            {hint ?? "Conectando con la sala y sincronizando jugadores..."}
          </p>
        </div>
      </div>
    </div>
  );
}
