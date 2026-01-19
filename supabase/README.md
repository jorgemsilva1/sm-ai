# Supabase SQL

Ordem recomendada para aplicar os scripts:

1. `scripts/00_clients.sql` - base de clientes e perfis.
2. `scripts/01_business_tags.sql` - tags de negócio e relação.
3. `scripts/02_clients_description_photo.sql` - campos de descrição e foto.
4. `scripts/03_client_personas.sql` - personas por cliente.
5. `scripts/04_persona_visual_fields.sql` - campos visuais de persona.
6. `scripts/05_reference_groups.sql` - grupos de referências.
7. `scripts/06_reference_items.sql` - itens de referência.
8. `scripts/07_reference_item_thumbnails.sql` - thumbnails de referências.
9. `scripts/08_reference_groups_parent.sql` - hierarquia de pastas.
10. `scripts/09_storage_reference_assets.sql` - policies de storage.
11. `scripts/10_reference_item_comments.sql` - comentários das referências.
12. `scripts/11_client_strategies.sql` - estratégias por cliente.
13. `scripts/12_persona_social_fields.sql` - campos sociais das personas.
14. `seeds/01_business_tags.sql` - seed das tags de negócio.
