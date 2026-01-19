# Google / YouTube — OAuth & App Review

## 1) Criar projeto (Google Cloud Console)
- Cria um projeto (ou usa um existente)
- Ativa APIs:
  - **YouTube Data API v3**
- Configura o **OAuth consent screen** (External, normalmente)

## 2) OAuth Redirect URI
No OAuth client (Web application):
- `https://<TEU_DOMINIO>/api/oauth/youtube/callback`
- (opcional) `http://localhost:3000/api/oauth/youtube/callback`

## 3) Credenciais (env vars)
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`

## 4) Scopes recomendados
Mínimo para identidade:
- `openid`
- `profile`
- `email`

Para YouTube read-only:
- `https://www.googleapis.com/auth/youtube.readonly`

> Se pedires scopes “sensíveis/restritos”, pode exigir verificação e revisão mais pesada.

## 5) App Verification (Google)
Checklist típico:
- Domínio verificado
- Privacy Policy e Terms públicas
- Justificação de scopes (porquê precisas)
- Em alguns casos: Security assessment (para scopes restritos)

