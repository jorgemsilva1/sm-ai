# X (Twitter) — OAuth & App Review

## 1) Criar app (X Developer Portal)
- Cria um Project + App
- Ativa OAuth 2.0

## 2) OAuth Redirect URI
Configura:
- `https://<TEU_DOMINIO>/api/oauth/x/callback`
- (opcional) `http://localhost:3000/api/oauth/x/callback`

## 3) Credenciais (env vars)
- `X_CLIENT_ID`
- `X_CLIENT_SECRET`

## 4) Scopes recomendados (mínimo)
Para identificar utilizador:
- `users.read`

Para ler tweets (opcional):
- `tweet.read`

Para refresh token:
- `offline.access`

## 5) PKCE
OAuth 2.0 na X recomenda **PKCE**:
- gerar `code_verifier`
- gerar `code_challenge` (S256)
- token exchange com `code_verifier`

## 6) Review / permissões
Dependendo do plano, X pode ter restrições por endpoint e rate limit.
Prepara:
- descrição de caso de uso
- privacy policy / terms
- screencast se pedido

