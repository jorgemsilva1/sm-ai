# Meta (Instagram + Facebook) — OAuth & App Review

## 1) Criar app no Meta for Developers
- Portal: Meta for Developers → My Apps → Create App
- Tipo recomendado: **Business**
- Adiciona o produto **Facebook Login** (OAuth) e, se aplicável, **Instagram Graph API**.

## 2) Configurar OAuth (Redirect URI)
Na app, em **Facebook Login → Settings**:
- **Valid OAuth Redirect URIs**:
  - `https://<TEU_DOMINIO>/api/oauth/instagram/callback`
  - `https://<TEU_DOMINIO>/api/oauth/facebook/callback`
- Em dev local (opcional):
  - `http://localhost:3000/api/oauth/instagram/callback`
  - `http://localhost:3000/api/oauth/facebook/callback`

## 3) Credenciais (env vars na tua plataforma)
Define na tua app:
- `META_APP_ID`
- `META_APP_SECRET`

## 4) Scopes/permissões recomendadas
### Instagram (Graph API)
Normalmente precisas de:
- `instagram_basic`
- `instagram_manage_insights` (insights)
- `pages_show_list` (listar páginas)
- `pages_read_engagement`

### Facebook Pages
Normalmente precisas de:
- `pages_show_list`
- `pages_read_engagement`

> Nota: para publicar em IG/FB, vais precisar de permissões adicionais (ex.: publishing), e isto costuma exigir **App Review** mais exigente.

## 5) App Review (pedido de permissões)
Checklist típico:
- **Business Verification** (muito comum ser obrigatório para permissões “sensíveis”)
- **Privacy Policy URL** e **Terms URL** públicas
- **Data Deletion Instructions URL** (Meta exige)
- Screencast mostrando:
  - Login
  - Seleção da conta/página
  - Onde e porquê pedes cada permissão
- Justificação clara por permissão:
  - “Precisamos de `pages_show_list` para o utilizador escolher a página/conta IG associada…”

## 6) Pós-auth (o que normalmente falta implementar)
OAuth devolve um user access token, mas para Instagram Graph normalmente ainda precisas de:
- listar páginas do utilizador
- obter IG Business Account ligada à página
- guardar page_id / ig_user_id
- opcional: trocar por long-lived token

