export function ConfirmDialog({ title, message, confirmLabel = "Confirm", dangerous = false, onConfirm, onCancel }: {
  title: string; message: string; confirmLabel?: string; dangerous?: boolean; onConfirm: () => void; onCancel: () => void;
}) {
  return <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onCancel()}>
    <div className="dialog" role="alertdialog" aria-modal="true" aria-labelledby="confirm-title">
      <div className={`dialog-icon ${dangerous ? "danger" : ""}`}>{dangerous ? "!" : "✓"}</div>
      <h2 id="confirm-title">{title}</h2><p>{message}</p>
      <div className="dialog-actions"><button className="button ghost" onClick={onCancel}>Cancel</button><button className={`button ${dangerous ? "danger" : "primary"}`} onClick={onConfirm}>{confirmLabel}</button></div>
    </div>
  </div>;
}
