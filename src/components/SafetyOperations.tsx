export default function SafetyOperations({
  onNotify: _onNotify,
}: {
  onNotify: (message: string, error?: boolean) => void;
}) {
  return (
    <section className="workspace-panel safety-centre">
      <header className="section-head">
        <div>
          <p className="eyebrow">Campus safety</p>
          <h1>SOS response centre</h1>
          <p>
            The student and administrator safety workflow is being prepared for
            a future OG Vibes release.
          </p>
        </div>
      </header>

      <div className="empty-state safety-coming-soon">
        <span>✚</span>
        <p className="eyebrow">COMING SOON</p>
        <h2>A safer, verified response workflow</h2>
        <p>
          We will enable this workspace after campus responders, emergency
          contacts, notification devices and response procedures have been
          tested and approved.
        </p>
        <small>Powered by OG Technologies</small>
      </div>
    </section>
  );
}
