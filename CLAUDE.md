# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Start development server (Next.js 16)
npm run build    # Build for production
npm start        # Start production server
npm run lint     # Run ESLint
```

There are no test scripts configured.

## Architecture Overview

**SM-AI** is a social media management platform for agencies managing multiple clients. Built with **Next.js 16 (App Router)**, **Supabase**, and **OpenAI**. The platform enables agencies to manage client profiles, generate AI-powered content calendars, analyze competitors, define strategies, and schedule posts across social platforms.

### Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16.1.3 (App Router, React 19) |
| Database & Auth | Supabase (PostgreSQL + RLS + Auth) |
| AI | OpenAI (gpt-4o-mini default) via `openai` SDK |
| Styling | Tailwind CSS v4 (PostCSS plugin) + shadcn/ui |
| Forms | React 19 `useActionState` + Server Actions |
| Calendar | react-big-calendar + react-day-picker |
| Icons | lucide-react |
| Toasts | sonner |
| i18n | Custom cookie-based (en/pt) |
| Fonts | Geist Sans + Geist Mono (Google Fonts) |

### Route Structure

Uses Next.js route groups with two areas:

```
src/app/
├── (auth)/              # Public routes (no auth required)
│   ├── login/
│   ├── signup/
│   ├── reset-password/
│   └── update-password/
├── (app)/               # Protected routes (auth enforced by middleware.ts)
│   └── dashboard/
│       ├── page.tsx          # Overview dashboard
│       ├── docs/integrations/
│       └── clients/
│           ├── page.tsx      # Client list
│           ├── new/          # New client wizard
│           └── [id]/         # Client detail (layout with sidebar)
│               ├── page.tsx              # Editorial/profile
│               ├── calendar/             # Content calendar
│               ├── competitors/          # Competitor analysis
│               │   ├── new/
│               │   └── [competitorId]/
│               ├── strategy/             # Strategy plans
│               │   ├── new/
│               │   └── [strategyId]/
│               ├── personas/             # Audience personas
│               │   ├── new/
│               │   └── [personaId]/
│               ├── references/           # Reference materials
│               ├── deep-thinking/        # AI chat assistant
│               ├── feed/                 # Social feed preview
│               ├── media/                # Media library
│               ├── budget/               # Budget planning
│               ├── audiences/            # Target audiences
│               ├── suggestions/          # AI suggestions
│               ├── social-media-platforms/
│               ├── integrations/         # Platform connections
│               ├── api-docs/             # API documentation
│               ├── logs/                 # Activity logs
│               ├── calendarizacao/       # Legacy scheduling
│               └── settings/             # Client settings
└── layout.tsx           # Root layout (dark mode, fonts, toaster)
```

### Layout Hierarchy

1. **Root Layout** (`src/app/layout.tsx`) — Sets `dark` class on `<html>`, loads Geist fonts, renders `<Toaster>`
2. **App Layout** (`src/app/(app)/layout.tsx`) — Top header bar with logo, nav links (Overview, Clients), language switcher, user avatar, sign-out
3. **Client Layout** (`src/app/(app)/dashboard/clients/[id]/layout.tsx`) — Grid layout with 240px sidebar + content area. Sidebar shows client name and section navigation

### Data Layer

**Supabase** handles auth, database, and storage. Two client variants:
- `src/lib/supabase/client.ts` — browser client (for client components)
- `src/lib/supabase/server.ts` — server client (for Server Components and Server Actions)
- `src/lib/supabase/env.ts` — environment variable resolution

Database migrations live in `supabase/scripts/` as numbered SQL files (01–30+). All tables use Row-Level Security with `owner_id = auth.uid()` policies. An `updated_at` trigger is applied to most tables.

**Server Actions** are the primary mutation mechanism:
- `src/lib/actions/auth.ts` — auth operations (signIn, signUp, signOut, resetPassword)
- `src/app/(app)/dashboard/clients/actions.ts` — all client-related mutations (large file, includes AI calls)

### AI Integration

All AI features use OpenAI via `src/lib/ai/openai.ts`. Model names come from env vars (`OPENAI_MODEL`, `OPENAI_IMAGE_MODEL`). Structured outputs use Zod schemas. Prompts are locale-aware and live in `src/lib/ai/prompts/`.

Key AI modules:
- `schedule-generator.ts` — generates content calendar posts
- `competitor-profiler.ts` + `competitor-insights.ts` — analyzes competitors via web scraping + GPT
- `trending-topics.ts` — detects trending topics per niche
- `posting-times.ts` — optimal scheduling analysis

The web crawler (`src/lib/crawler/`) scrapes competitor websites to feed competitor analysis.

### Internationalization

Cookie-based locale switching between English (`en`) and Portuguese (`pt`). All copy lives in `src/lib/i18n.ts` as a single large object with deeply nested keys. Use `getLocale()` (server — requires `cookies()`) or `getClientLocale()` (client) to get the current locale.

Pattern: `const t = copy[locale]` then access via `t.section.key`.

### Component Organization

```
src/components/
├── branding/
│   └── logo.tsx              # SM-AI logo with brand glow
├── clients/                  # Domain-specific components (~20 files)
│   ├── client-sidebar-nav.tsx    # Section navigation (3 groups)
│   ├── client-section-nav.tsx    # Tabs within sections
│   ├── client-create-modal.tsx   # Create client modal
│   ├── client-create-wizard.tsx  # Multi-step wizard
│   ├── client-info-form.tsx      # Profile form
│   ├── client-calendar.tsx       # Calendar integration
│   ├── client-competitors.tsx    # Competitor list/management
│   ├── client-strategy.tsx       # Strategy management
│   ├── client-personas.tsx       # Persona management
│   ├── client-references.tsx     # Reference materials
│   ├── client-integrations.tsx   # Platform integrations
│   ├── schedule-*.tsx            # Calendar/schedule modals
│   ├── deep-thinking-chat.tsx    # AI chat interface
│   ├── business-tag-picker.tsx   # Tag selector
│   └── calendar-tabs.tsx         # Calendar view tabs
├── form/
│   └── submit-button.tsx         # Form submit with loading state
├── i18n/
│   └── language-switcher.tsx     # EN/PT toggle
└── ui/                           # shadcn/ui primitives (DO NOT EDIT)
    ├── alert.tsx
    ├── avatar.tsx
    ├── button.tsx
    ├── card.tsx
    ├── dropdown-menu.tsx
    ├── entity-context-menu.tsx
    ├── input.tsx
    ├── label.tsx
    ├── select.tsx
    ├── separator.tsx
    ├── sonner.tsx
    └── textarea.tsx
```

## UI & Styling Guide

### Design System

The app uses a **dark-mode-only** design with an **orange/amber brand color** (oklch hue ~55). The color palette is defined via CSS custom properties in `globals.css` using the OKLCH color space.

#### CSS Custom Properties (Design Tokens)

All colors are defined in `:root` (light) and `.dark` (active) selectors in `globals.css`:

| Token | Purpose | Dark Value |
|-------|---------|------------|
| `--background` | Page background | `oklch(0.12 0.02 250)` — very dark blue-gray |
| `--foreground` | Primary text | `oklch(0.98 0.01 245)` — near white |
| `--card` | Card surfaces | `oklch(0.16 0.02 252)` — slightly lighter than bg |
| `--muted` | Muted backgrounds | `oklch(0.22 0.02 252)` |
| `--muted-foreground` | Secondary text | `oklch(0.65 0.02 250)` |
| `--brand` | Brand accent (orange) | `oklch(0.74 0.19 55)` |
| `--brand-muted` | Lighter brand | `oklch(0.7 0.13 55)` |
| `--brand-strong` | Darker brand | `oklch(0.62 0.22 50)` |
| `--border` | Borders | `oklch(1 0 0 / 10%)` — white at 10% |
| `--destructive` | Error/danger | `oklch(0.68 0.22 25)` — red |
| `--radius` | Base border radius | `0.625rem` (10px) |

#### Tailwind CSS v4 Setup

- Uses `@tailwindcss/postcss` plugin (not `tailwind.config.js`)
- Theme is configured inline via `@theme inline {}` block in `globals.css`
- Custom colors are mapped: `--color-brand: var(--brand)`, etc.
- Custom utility classes: `bg-tech` (decorative gradient), `border-grid` (grid pattern)
- Animation via `tw-animate-css` package

#### Custom Variant

```css
@custom-variant dark (&:is(.dark *));
```

### Styling Conventions

1. **Always use Tailwind utility classes** — no inline styles, no CSS modules
2. **Use `cn()` for conditional classes** — from `src/lib/utils.ts` (clsx + tailwind-merge)
3. **Prefer semantic color tokens** over raw values:
   - `text-foreground` not `text-white`
   - `bg-card` not `bg-[#1a1a2e]`
   - `text-muted-foreground` for secondary text
   - `bg-brand` for brand accent
   - `text-primary-foreground` for text on brand backgrounds
4. **Border opacity pattern**: `border-border/40` (borders at 40% opacity)
5. **Card pattern**: `border-border/40 bg-card/80` (translucent card with subtle border)
6. **Spacing**: Use Tailwind spacing scale consistently. Page sections use `space-y-6`
7. **Typography**:
   - Page titles: `text-3xl font-semibold`
   - Page subtitles: `text-sm text-muted-foreground`
   - Section labels: `text-xs font-semibold uppercase tracking-wide text-muted-foreground`
   - Body text: `text-sm`
8. **Responsive**: Mobile-first. Use `md:` and `lg:` breakpoints. Hide nav items on mobile with `hidden md:flex`
9. **Backdrop blur**: Header uses `bg-card/60 backdrop-blur`
10. **Brand button pattern**: `bg-brand text-primary-foreground`
11. **Hover states**: `hover:text-foreground` for links, `hover:bg-muted/60` for nav items
12. **Focus states**: Use `outline-ring/50` (set globally in base layer)

### Component Patterns

- **Pages are Server Components** — fetch data with Supabase server client, pass to client components
- **Forms use Server Actions** — via `useActionState` hook (React 19 pattern)
- **Modal-heavy UI** — most CRUD operations happen in modals/dialogs
- **Client components** marked with `"use client"` directive at top
- **Consistent page header**: title + subtitle + action button in a flex wrapper
- **Empty states**: Simple text in `text-sm text-muted-foreground`
- **Error states**: `<Alert variant="destructive">` with title and description

### shadcn/ui Components Available

`alert`, `avatar`, `button`, `card`, `dropdown-menu`, `entity-context-menu`, `input`, `label`, `select`, `separator`, `sonner`, `textarea`

To add new shadcn components: `npx shadcn@latest add <component-name>`

### Calendar Styling

The calendar uses react-big-calendar with extensive custom CSS in `globals.css` under the `.sm-rbc` class. Social platform events have distinct border colors (Instagram pink, TikTok cyan, Facebook blue, etc.). The calendar uses `color-mix()` for transparency effects.

## Environment Variables

See `supabase/env.example` for the full list. Key vars:
- `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase
- `OPENAI_API_KEY`, `OPENAI_MODEL` (default: `gpt-4o-mini`), `OPENAI_IMAGE_MODEL`
- `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`
- OAuth credentials for Meta, TikTok, LinkedIn, Google, X

## Path Aliases

`@/*` maps to `./src/*` (configured in `tsconfig.json`).

## Code Conventions

- **TypeScript strict mode** enabled
- **Type definitions**: Use `type` keyword (not `interface`) for component props — pattern: `type FooProps = { ... }`
- **Imports**: Use `@/` alias for all project imports
- **Server/client boundary**: Be explicit with `"use client"` — only add when the component uses hooks, event handlers, or browser APIs
- **Supabase queries**: Always check `error` before using `data`
- **i18n**: Always use translation keys from `copy[locale]` — never hardcode user-facing strings
- **File naming**: kebab-case for all files (e.g., `client-sidebar-nav.tsx`)
- **Component naming**: PascalCase exports matching the file purpose
