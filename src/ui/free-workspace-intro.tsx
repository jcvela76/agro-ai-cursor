/** Shared Free self-serve copy for org onboarding (ADR-061). */
export function FreeWorkspaceIntro() {
  return (
    <div style={{ textAlign: "center", maxWidth: "28rem" }}>
      <h1 style={{ margin: "0 0 0.5rem", fontSize: "1.5rem", fontWeight: 650 }}>
        Creá tu workspace Free
      </h1>
      <p style={{ margin: "0 0 1.25rem", opacity: 0.85, lineHeight: 1.45 }}>
        Poné el nombre de tu fundo o equipo. Vas a entrar con clima por parcela
        (hasta 2 parcelas · 2 miembros).
      </p>
    </div>
  );
}
