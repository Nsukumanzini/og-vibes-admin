export function Toast({ message, tone = "success", onClose }: { message: string; tone?: "success" | "error"; onClose: () => void }) {
  return <div className={`toast ${tone}`} role="status"><span>{tone === "success" ? "✓" : "!"}</span><p>{message}</p><button onClick={onClose} aria-label="Dismiss">×</button></div>;
}
