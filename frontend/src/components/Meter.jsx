export function LinearMeter({ value, max, label }) {
  if (value == null) {
    return (
      <div className="meter-cell">
        <span className="meter-value">—</span>
      </div>
    );
  }
  const widthPercent = Math.max(0, Math.min(1, value / max)) * 100;
  return (
    <div className="meter-cell">
      <span className="meter-value">{label}</span>
      <div className="meter-track">
        <div className="meter-fill" style={{ left: 0, width: `${widthPercent}%` }} />
      </div>
    </div>
  );
}

export function DivergingMeter({ value, cap, label }) {
  if (value == null) {
    return (
      <div className="meter-cell">
        <span className="meter-value">—</span>
      </div>
    );
  }
  const clamped = Math.max(-cap, Math.min(cap, value));
  const halfWidthPercent = (Math.abs(clamped) / cap) * 50;
  const positive = clamped >= 0;
  return (
    <div className="meter-cell">
      <span className={`meter-value ${positive ? "positive" : "negative"}`}>{label}</span>
      <div className="meter-track diverging">
        <div
          className={`meter-fill ${positive ? "positive" : "negative"}`}
          style={{
            left: positive ? "50%" : `${50 - halfWidthPercent}%`,
            width: `${halfWidthPercent}%`,
          }}
        />
      </div>
    </div>
  );
}
