# Clientes

## Criação rápida

- A ação "Adicionar cliente" abre uma modal simples.
- Campos principais: nome, descrição, fotografia (URL) e tags de negócio.
- Campos opcionais mantidos: website.

## Tags de negócio

- As tags são pré-definidas no frontend e seedadas na base de dados.
- Script de seed: `supabase/seeds/01_business_tags.sql`.
- Relação many-to-many: `client_business_tags`.

## Página de cliente

- Layout em grelha com sidebar.
- Secções disponíveis: Configurações, Budget, Calendarização, Media e Social Media Platforms.
- Configurações inclui atualização de dados base e do perfil editorial.
- Editorial inclui Personas para definição de targets.