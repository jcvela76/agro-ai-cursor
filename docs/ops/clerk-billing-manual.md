# Habilitar Clerk Billing sin CLI Platform API

El error `403 Missing authorization scopes` en `clerk apps list` significa que la sesión CLI (**jcvela@gmail.com**) no tiene acceso Platform al workspace **Raw Code's projects** donde vive `agro-ai-auth`.

La app fue operada con **me@juliovela.com** (ver `docs/ops/clerk-production-keys.md`).

## Opción A — Dashboard (recomendada)

1. Abre **https://dashboard.clerk.com/** e inicia sesión con **me@juliovela.com** (no jcvela@gmail.com si no está en el team).
2. Arriba a la izquierda, elige el workspace **Raw Code's projects** (o el que liste `agro-ai-auth`).
3. Entra a la aplicación **agro-ai-auth**.
4. Arriba, selector de instancia → **Development** (no Production).
5. Menú lateral → **Billing** → **Settings**:
   - Enable Billing for **Organizations**
   - Payment gateway: **Clerk development gateway**
6. **Billing** → **Plans** → **Plans for Organizations**:
   - Features ya creadas: `weather`, `weather_plus`, `traceability`, `agronomic_review`
   - **No** crear `weather_base` ($0 no permitido en UI; free = `free_org` sin suscripción)
   - Crear planes de pago en **USD** (cada uno: **Seat-based OFF**, **Monthly base fee ON**, **Free trial ON** + 14 días):

| Key | Name | Monthly (USD) |
|-----|------|---------------|
| `weather_plus` | Weather Intelligence Plus | $29 |
| `operations` | Operations | $79 |
| `full` | Full Platform | $99 |

   - Features en plan: opcional vacío (webhook usa slug → `plan-entitlements.ts`); o adjuntar en UI
   - Marcar **Publicly available**

**Tip Cursor browser:** el campo de precio debe escribirse a mano (click → tipear → Tab) antes de Save; la automatización no dispara la validación React de Clerk.

Si no ves **Billing** en el menú: la cuenta no es admin del app o estás en el workspace equivocado.

## GitHub OAuth en browser de Cursor

El webview del agente **no soporta bien** el redirect de GitHub/Google (pantalla en blanco o spinner infinito). No uses GitHub ahí.

- **Dashboard:** abre en **Safari/Chrome** (`open https://dashboard.clerk.com/sign-in`) o usa **email + contraseña** en el browser de Cursor (no el botón GitHub).
- **CLI:** `npx clerk auth login` imprime una URL → ábrela en Safari, no en Cursor.

## Opción B — CLI con la cuenta correcta

```bash
npx clerk@latest auth logout
npx clerk@latest auth login -y
# GitHub/email → me@juliovela.com

npx clerk@latest apps list
# debe mostrar agro-ai-auth

npx clerk@latest enable billing --for orgs \
  --app app_3IThUPXYe9TeXFToApdAlaB3OC2 --instance dev --yes --no-skills
```

## Webhook stg (solo sk_test, sin CLI Platform)

```bash
chmod +x scripts/clerk-webhook-stg.sh
./scripts/clerk-webhook-stg.sh
```

Copia el `whsec_…` a Vercel Preview → `CLERK_WEBHOOK_SIGNING_SECRET`.

## Invitar jcvela@gmail.com (opcional)

Dashboard → Team / Organization settings → invitar **jcvela@gmail.com** como admin del workspace Clerk para que el CLI funcione con esa cuenta.
