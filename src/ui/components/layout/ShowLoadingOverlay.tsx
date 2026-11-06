export function ShowLoadingOverlay() {
    return (
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-[var(--app-bg)]/75 p-6 backdrop-blur-sm"
            role="status"
            aria-live="polite"
            aria-label="Se încarcă emisiunea selectată"
        >
            <div className="flex max-w-sm flex-col items-center gap-4 rounded-xl border border-[var(--panel-border)] bg-[var(--panel-bg)] px-8 py-7 text-center text-[var(--text-primary)] shadow-xl">
                <svg className="h-12 w-12 animate-spin text-[var(--accent)] motion-reduce:animate-none" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity=".2" strokeWidth="3" />
                    <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeLinecap="round" strokeWidth="3" />
                </svg>
                <div>
                    <p className="text-base font-semibold">Se încarcă emisiunea</p>
                    <p className="mt-1 text-sm text-[var(--text-secondary)]">Pregătim proiectul și datele de lucru. Te rugăm să aștepți.</p>
                </div>
            </div>
        </div>
    )
}
