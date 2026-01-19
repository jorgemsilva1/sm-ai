# TikTok — OAuth & App Review

## 1) Criar app (TikTok for Developers)
- Portal: TikTok for Developers → My Apps → Create
- Ativa produtos conforme necessidade (ex.: “Login Kit”, “Content Posting API”, “Research API”, etc.)

## 2) OAuth Redirect URI
Configura:
- `https://<TEU_DOMINIO>/api/oauth/tiktok/callback`
- (opcional) `http://localhost:3000/api/oauth/tiktok/callback`

## 3) Credenciais (env vars)
- `TIKTOK_CLIENT_KEY`
- `TIKTOK_CLIENT_SECRET`

## 4) Scopes recomendados (mínimo)
Depende do que vais fazer. Para começar (apenas leitura/identidade):
- `user.info.basic`
- `video.list` (se precisares listar vídeos)

## 5) PKCE
TikTok OAuth 2.0 usa **PKCE** — tens de:
- gerar `code_verifier`
- gerar `code_challenge` (S256)
- enviar `code_challenge` no authorize
- enviar `code_verifier` no token exchange

## 6) App Review / aprovação
Checklist típico:
- URL de Privacy Policy e Terms
- Screencast demonstrando:
  - login
  - onde usas os dados
  - porquê cada scope
- Descrição do caso de uso (ex.: planeamento, analytics, publishing)

