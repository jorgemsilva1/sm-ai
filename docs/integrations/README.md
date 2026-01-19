# Integrações (OAuth)

Nesta pasta tens um guia por plataforma para:

- Criar a app (Developer Portal)
- Configurar OAuth (redirect URIs, PKCE quando aplicável)
- Pedir permissões/scopes e passar App Review
- Checklist do que normalmente tens de preparar (políticas, screencast, justificações)

## Onde isto é usado na app

- Página: `Dashboard → Clients → Integrations`
- Rotas OAuth:
  - `GET /api/oauth/{provider}/start?clientId=...`
  - `GET /api/oauth/{provider}/callback`

## Providers suportados no código

- Meta: `instagram`, `facebook`
- TikTok: `tiktok`
- LinkedIn: `linkedin`
- Google/YouTube: `youtube`
- X: `x`

