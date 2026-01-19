# Setup inicial

## Variáveis de ambiente

Copia `supabase/env.example` para `.env.local` e preenche:

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_URL=...
SUPABASE_ANON_KEY=...
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=...
OPENAI_API_KEY=...
OPENAI_MODEL=...
OPENAI_IMAGE_MODEL=...

# OAuth social integrations (opcional, só se fores ligar contas)
META_APP_ID=...
META_APP_SECRET=...
TIKTOK_CLIENT_KEY=...
TIKTOK_CLIENT_SECRET=...
LINKEDIN_CLIENT_ID=...
LINKEDIN_CLIENT_SECRET=...
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
X_CLIENT_ID=...
X_CLIENT_SECRET=...
```

Notas:
- O ficheiro `.env.local` deve estar na raiz do projeto.
- Reinicia o `npm run dev` depois de adicionares/alterares as variáveis.

## Supabase (SQL)

No Supabase SQL Editor, corre os scripts por ordem:

1. `supabase/scripts/00_clients.sql`
2. `supabase/scripts/01_business_tags.sql`
3. `supabase/scripts/02_clients_description_photo.sql`
4. `supabase/scripts/03_client_personas.sql`
5. `supabase/scripts/04_persona_visual_fields.sql`
6. `supabase/scripts/05_reference_groups.sql`
7. `supabase/scripts/06_reference_items.sql`
8. `supabase/scripts/07_reference_item_thumbnails.sql`
9. `supabase/scripts/08_reference_groups_parent.sql`
10. `supabase/scripts/09_storage_reference_assets.sql`
11. `supabase/scripts/10_reference_item_comments.sql`
12. `supabase/scripts/11_client_strategies.sql`
13. `supabase/scripts/12_persona_social_fields.sql`
14. `supabase/scripts/13_client_competitors.sql`
15. `supabase/scripts/14_client_strategies_links.sql`
16. `supabase/scripts/15_client_schedule_drafts.sql`
17. `supabase/scripts/16_client_schedule_items.sql`
18. `supabase/scripts/17_clients_country_code.sql`
19. `supabase/scripts/18_schedule_drafts_persona_id.sql`
20. `supabase/scripts/19_client_strategies_persona_id.sql`
21. `supabase/scripts/20_client_strategies_celebrations.sql`
22. `supabase/scripts/21_client_social_accounts.sql`
23. `supabase/scripts/22_client_oauth_states.sql`
24. `supabase/scripts/23_clients_timezone_default_locale.sql`
25. `supabase/seeds/01_business_tags.sql`

## Supabase (Storage)

Cria um bucket público chamado `reference-assets` para uploads de imagens e vídeos.

## Auth (redirect)

Em Auth > URL Configuration, adiciona o redirect:

```
http://localhost:3000/update-password
```

## Arranque local

```
npm run dev
```
