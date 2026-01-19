# LinkedIn — OAuth & App Review

## 1) Criar app (LinkedIn Developer Portal)
- Portal: LinkedIn Developers → Create App
- Associa uma LinkedIn Page (normalmente recomendado)

## 2) OAuth Redirect URI
Configura:
- `https://<TEU_DOMINIO>/api/oauth/linkedin/callback`
- (opcional) `http://localhost:3000/api/oauth/linkedin/callback`

## 3) Credenciais (env vars)
- `LINKEDIN_CLIENT_ID`
- `LINKEDIN_CLIENT_SECRET`

## 4) Scopes recomendados
Para autenticação e perfil (OpenID):
- `openid`
- `profile`
- `email`

Para publishing/marketing, o LinkedIn costuma exigir produtos/permissões adicionais (mais complexas) e aprovação.

## 5) App Review / aprovação
Checklist típico:
- Privacy Policy e Terms
- Descrever claramente o uso (ex.: “ligar conta para obter dados do perfil e futuramente publicar/medir performance”)
- Screencast com o fluxo OAuth e onde os dados são usados

