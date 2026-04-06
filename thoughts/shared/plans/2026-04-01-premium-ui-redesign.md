# Premium UI Redesign Implementation Plan

## Overview

Complete visual overhaul of SM-AI to achieve a polished, premium SaaS dashboard aesthetic. The reference is Amplemarket's **internal product UI** — a clean, functional dark-mode dashboard that's data-forward but organized, with clear hierarchy and professional polish. NOT the Amplemarket marketing/landing page (no WebGL, grain textures, or hero gradients — those are landing page flourishes).

The target aesthetic is: **clean functional SaaS** — closer to Notion/Linear's clarity with the depth and polish of a well-designed dark-mode dashboard. Subtle shadows for layering, smooth transitions for interactivity, consistent spacing for rhythm, and proper component usage throughout.

## Current State Analysis

### What Exists
- Tailwind CSS v4 with OKLCH design tokens in `globals.css`
- 12 shadcn/ui components installed (alert, avatar, button, card, dropdown-menu, entity-context-menu, input, label, select, separator, sonner, textarea)
- Dark-mode-only with orange/amber brand color (`oklch(0.74 0.19 55)`)
- Basic header with logo, nav links, avatar, sign-out
- 240px sidebar grid layout for client pages
- Modal-heavy UI using raw `div` overlays (no Dialog component)
- No transitions, no shadows, no loading states, no skeleton UI

### Key Problems

#### Visual Foundation
1. **No visual depth** — cards are flat with only `border-border/40`, no shadows or layered surfaces
2. **No transitions** — all interactions are instant, feels cheap (links, buttons, cards)
3. **Weak typography hierarchy** — everything uses similar weights/sizes
4. **No gradient accents** — everything is flat solid colors
5. **Missing components** — no Dialog, Tooltip, Badge, Tabs, Skeleton, Sheet, Progress, ScrollArea

#### Layout & Chrome
6. **Header lacks polish** — no glassmorphism, no sticky behavior, no active nav indicator, no mobile nav fallback
7. **Sidebar is unstyled** — plain `aside` with no rounded corners, not sticky, collapses poorly below `lg`
8. **Header max-width unconstrained** — on wide screens logo and user info spread too far apart
9. **User email in nav has no truncation** — long emails overflow the header

#### Pages & Components
10. **Client list is a plain `divide-y` list** — no card grid, no hover states, no semantic `<ul>/<li>`
11. **Dashboard overview is minimal** — just two flat stat cards with no visual interest
12. **Tag badges use raw `<span>` everywhere** — should use shadcn `Badge` component
13. **Empty states are bare text** — no icons, no illustrations, no CTA to create first item (competitors, strategy, personas)
14. **"Back to clients" ghost buttons are invisible** — blend into background, hard to discover

#### Modals & Dialogs
15. **Raw `<div>` fixed-position modals** — no Dialog component, no focus trapping, no `aria-modal`, no keyboard Escape, no scroll lock. Present in: schedule modal, strategy create, post editor, post detail
16. **`window.confirm()` / `window.prompt()` for destructive actions** — unstyled native dialogs in a dark-mode app (competitors, personas, references)
17. **DatePickerField uses custom outside-click detection** — should use shadcn Popover

#### Cross-Cutting
18. **Hardcoded `bg-brand text-primary-foreground` on buttons** — bypasses shadcn variant system, appears in 10+ files
19. **No loading/skeleton states** — no `loading.tsx` files, pages flash empty
20. **Hardcoded Portuguese strings outside i18n** — in wizard step descriptions, post editor previews, submit button default text
21. **`AVATAR_COLORS` uses raw hex values** — not design tokens, won't adapt to theme changes
22. **Deep thinking chat is a stub** — no auto-scroll, no typing indicator, no Ctrl+Enter support, static reply

### Desired End State
A polished SaaS dashboard that feels like Amplemarket — glassmorphic surfaces, smooth transitions, refined shadows, subtle gradient accents, proper modal animations, skeleton loading states, and consistent micro-interactions across every page. The brand orange remains the accent color but is used more strategically with gradient variations.

## What We're NOT Doing

- Changing the overall layout structure (header + sidebar + content grid)
- Rebuilding the data layer or server actions
- Changing the routing structure
- Adding a light mode toggle (staying dark-only)
- Redesigning the calendar's core react-big-calendar integration (only refining the wrapper)
- Changing the i18n system
- Modifying the AI integration logic

## Implementation Approach

Bottom-up: start with design tokens and foundation components, then work up through layouts and pages. Each phase builds on the previous, so they must be done in order.

---

## Phase 1: Design Tokens & Foundation

### Overview
Update CSS variables, add new utility classes, install missing shadcn/ui components, and establish the transition/shadow/gradient system that all subsequent phases depend on.

### Changes Required:

#### 1. Update Design Tokens
**File**: `src/app/globals.css`
**Changes**: Add shadow tokens, transition defaults, gradient utilities, and refine existing colors

```css
/* Add to .dark {} block */
--shadow-xs: 0 1px 2px 0 rgba(0,0,0,0.3);
--shadow-sm: 0 2px 4px -1px rgba(0,0,0,0.3), 0 1px 2px -1px rgba(0,0,0,0.2);
--shadow-md: 0 4px 8px -2px rgba(0,0,0,0.4), 0 2px 4px -2px rgba(0,0,0,0.3);
--shadow-lg: 0 8px 16px -4px rgba(0,0,0,0.5), 0 4px 8px -4px rgba(0,0,0,0.3);
--shadow-glow-brand: 0 0 20px rgba(255,140,0,0.15), 0 0 40px rgba(255,140,0,0.05);
--shadow-glow-brand-strong: 0 0 24px rgba(255,140,0,0.25), 0 0 48px rgba(255,140,0,0.08);

/* Surface elevation layers (dark mode surfaces) */
--surface-0: oklch(0.12 0.02 250);    /* page background */
--surface-1: oklch(0.15 0.02 252);    /* cards, sidebar */
--surface-2: oklch(0.18 0.02 252);    /* elevated cards, modals */
--surface-3: oklch(0.21 0.02 252);    /* popovers, dropdowns */
--surface-overlay: oklch(0.08 0.02 250 / 80%);  /* modal backdrop */
```

Add to `@theme inline {}`:
```css
--color-surface-0: var(--surface-0);
--color-surface-1: var(--surface-1);
--color-surface-2: var(--surface-2);
--color-surface-3: var(--surface-3);
```

Add to `@layer utilities {}`:
```css
.transition-default {
  transition-property: color, background-color, border-color, box-shadow, opacity, transform;
  transition-duration: 200ms;
  transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
}
.transition-slow {
  transition-property: color, background-color, border-color, box-shadow, opacity, transform;
  transition-duration: 350ms;
  transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
}
.glass {
  background: oklch(0.16 0.02 252 / 70%);
  backdrop-filter: blur(16px) saturate(1.2);
  -webkit-backdrop-filter: blur(16px) saturate(1.2);
}
.glass-strong {
  background: oklch(0.16 0.02 252 / 85%);
  backdrop-filter: blur(24px) saturate(1.3);
  -webkit-backdrop-filter: blur(24px) saturate(1.3);
}
.gradient-brand {
  background: linear-gradient(135deg, oklch(0.74 0.19 55), oklch(0.68 0.22 35));
}
.gradient-brand-subtle {
  background: linear-gradient(135deg, oklch(0.74 0.19 55 / 15%), oklch(0.68 0.22 35 / 5%));
}
.gradient-surface {
  background: linear-gradient(180deg, var(--surface-1) 0%, var(--surface-0) 100%);
}
.text-gradient-brand {
  background: linear-gradient(135deg, oklch(0.78 0.17 55), oklch(0.72 0.22 35));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}
```

Update base layer:
```css
@layer base {
  * {
    @apply border-border outline-ring/50;
  }
  body {
    @apply bg-surface-0 text-foreground antialiased;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    text-rendering: optimizeLegibility;
  }
}
```

#### 2. Install Missing shadcn/ui Components
**Action**: Run CLI commands

```bash
npx shadcn@latest add dialog
npx shadcn@latest add tooltip
npx shadcn@latest add badge
npx shadcn@latest add tabs
npx shadcn@latest add skeleton
npx shadcn@latest add sheet
npx shadcn@latest add progress
npx shadcn@latest add scroll-area
npx shadcn@latest add popover
npx shadcn@latest add switch
npx shadcn@latest add table
```

#### 3. Update Card Component Defaults
**File**: `src/components/ui/card.tsx`
**Changes**: Add shadow and transition to default Card styling

Update the Card's className from:
```
bg-card text-card-foreground flex flex-col gap-6 rounded-xl border py-6 shadow-sm
```
to:
```
bg-surface-1 text-card-foreground flex flex-col gap-6 rounded-xl border border-border/30 py-6 shadow-md transition-default hover:shadow-lg hover:border-border/50
```

#### 4. Update Button Hover States
**File**: `src/components/ui/button.tsx`
**Changes**: Add transitions and refined hover/active states to all button variants

Add `transition-default` to the base button classes. Update the default variant to include a subtle shadow on hover. Ensure the `bg-brand` pattern gets a glow effect:
```
"bg-brand text-primary-foreground shadow-md hover:shadow-glow-brand active:scale-[0.98]"
```

#### 5. Update Input/Textarea Focus States
**Files**: `src/components/ui/input.tsx`, `src/components/ui/textarea.tsx`
**Changes**: Add transition and improved focus ring

Add `transition-default` and update focus styling:
```
focus-visible:ring-2 focus-visible:ring-brand/30 focus-visible:border-brand/50
```

#### 6. Create a Brand Button Variant
**File**: `src/components/ui/button.tsx`
**Changes**: Add a `brand` variant to the CVA config so all the hardcoded `bg-brand text-primary-foreground` across 10+ files can be replaced with `variant="brand"`

```tsx
brand: "bg-brand text-primary-foreground shadow-md hover:shadow-glow-brand active:scale-[0.98] transition-default",
```

Then do a codebase-wide search-and-replace: `className="bg-brand text-primary-foreground"` → `variant="brand"`

### Success Criteria:

#### Automated Verification:
- [x] `npm run build` passes with no errors (NOTE: pre-existing TS error in `clients/[id]/page.tsx` — not introduced by this phase)
- [x] `npm run lint` passes (NOTE: 66 pre-existing lint errors unrelated to this phase)
- [x] All new shadcn components exist in `src/components/ui/`

#### Manual Verification:
- [ ] Cards have visible shadow and hover effect
- [ ] Buttons have smooth transitions on hover/active
- [ ] Inputs glow brand-orange on focus
- [ ] `.glass` utility produces frosted glass effect
- [ ] `.gradient-brand` utility produces smooth orange-to-red gradient

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation before proceeding.

---

## Phase 2: Global Chrome — Header, Sidebar, Layout

### Overview
Redesign the app shell — header becomes a glassmorphic navigation bar, sidebar gets a proper card container with refined navigation, layout spacing becomes more generous.

### Changes Required:

#### 1. Redesign App Header
**File**: `src/app/(app)/layout.tsx`
**Changes**: Glassmorphic sticky header with refined nav

Replace the header markup:
```tsx
<header className="sticky top-0 z-40 border-b border-border/20 glass">
  <div className="flex w-full items-center justify-between px-8 py-3">
    <div className="flex items-center gap-8">
      <Logo href="/dashboard" />
      <nav className="hidden items-center gap-1 md:flex">
        <Link href="/dashboard" className="rounded-lg px-3.5 py-2 text-sm text-muted-foreground transition-default hover:bg-white/5 hover:text-foreground">
          {t.common.navOverview}
        </Link>
        <Link href="/dashboard/clients" className="rounded-lg px-3.5 py-2 text-sm text-muted-foreground transition-default hover:bg-white/5 hover:text-foreground">
          {t.common.navClients}
        </Link>
      </nav>
    </div>
    <div className="flex items-center gap-4">
      <LanguageSwitcher locale={locale} />
      <div className="hidden items-center gap-3 md:flex">
        <span className="text-sm text-muted-foreground">{user.email}</span>
        <Avatar className="h-8 w-8 ring-2 ring-border/30">
          <AvatarFallback className="bg-gradient-brand text-sm font-semibold text-primary-foreground">
            {initials}
          </AvatarFallback>
        </Avatar>
      </div>
      <form action={signOut}>
        <Button type="submit" variant="ghost" size="sm">
          {t.common.signOut}
        </Button>
      </form>
    </div>
  </div>
</header>
```

Update main:
```tsx
<main className="w-full px-8 py-10">{children}</main>
```

#### 2. Redesign Client Sidebar
**File**: `src/app/(app)/dashboard/clients/[id]/layout.tsx`
**Changes**: Sidebar in a rounded card with proper spacing, sticky positioning

```tsx
<div className="grid gap-8 lg:grid-cols-[260px_1fr]">
  <aside className="sticky top-24 h-fit rounded-xl border border-border/20 bg-surface-1 p-5 shadow-sm">
    <p className="mb-5 text-sm font-semibold text-foreground/80">
      {client.name}
    </p>
    <ClientSidebarNav clientId={client.id} locale={locale} />
  </aside>
  <div>{children}</div>
</div>
```

Note: Client name is promoted from `text-xs uppercase text-muted-foreground` to `text-sm text-foreground/80` — it was too visually weak as a section label before, given it's the primary context identifier.

#### 3. Refine Sidebar Navigation
**File**: `src/components/clients/client-sidebar-nav.tsx`
**Changes**: Add transitions, better hover states, active indicator

Update link classes:
```tsx
<Link
  href={href}
  className={cn(
    "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-default",
    isActive
      ? "bg-brand/10 text-brand font-medium shadow-sm"
      : "text-muted-foreground hover:bg-white/5 hover:text-foreground"
  )}
>
  <Icon className={cn("h-4 w-4", isActive && "text-brand")} />
  ...
</Link>
```

Update group dividers:
```tsx
<div className="my-3 border-b border-border/20" />
```

#### 4. Update Logo Component
**File**: `src/components/branding/logo.tsx`
**Changes**: Use gradient background and refined glow

```tsx
<span className="flex h-9 w-9 items-center justify-center rounded-xl gradient-brand text-sm font-bold text-white shadow-glow-brand transition-default">
  SM
</span>
<span className="text-sm font-semibold uppercase tracking-[0.2em] text-foreground/70">
  SM-AI
</span>
```

#### 5. Update Auth Layout
**File**: `src/app/(auth)/layout.tsx`
**Changes**: Refine the auth page background and card positioning

The auth layout is already decent with `bg-tech` and `border-grid`. Minor refinements:
- Add `backdrop-blur-sm` to the content container
- Increase the grid opacity slightly

### Success Criteria:

#### Automated Verification:
- [x] `npm run build` passes (pre-existing failure unrelated to this phase)
- [x] `npm run lint` passes (pre-existing errors unrelated to this phase)

#### Manual Verification:
- [ ] Header has frosted glass effect with blur visible when scrolling
- [ ] Header sticks to top of viewport
- [ ] Sidebar has rounded card container with shadow
- [ ] Active sidebar item has brand-colored background and text
- [ ] Sidebar hover transitions are smooth (200ms)
- [ ] Logo badge has gradient and glow
- [ ] Overall layout feels more spacious (px-8, py-10)

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation before proceeding.

---

## Phase 3: Core Pages — Dashboard, Client List, Client Profile

### Overview
Restyle the three most visited pages with premium card designs, better typography hierarchy, and visual richness.

### Changes Required:

#### 1. Redesign Dashboard Overview
**File**: `src/app/(app)/dashboard/page.tsx`
**Changes**: Premium stat cards with gradient accents, better typography

```tsx
<div className="space-y-8">
  {/* Page header */}
  <div>
    <h1 className="text-3xl font-bold tracking-tight">{t.dashboard.title}</h1>
    <p className="mt-1 text-base text-muted-foreground">{t.dashboard.subtitle}</p>
  </div>

  {/* Stat cards */}
  <div className="grid gap-5 md:grid-cols-2">
    <Card className="border-border/20 bg-surface-1 p-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand/10">
          <Users className="h-5 w-5 text-brand" />
        </div>
        <p className="text-sm font-medium text-muted-foreground">{t.dashboard.clientsActive}</p>
      </div>
      <p className="mt-3 text-4xl font-bold tracking-tight">{clientCount ?? 0}</p>
      <p className="mt-1 text-xs text-muted-foreground">{t.dashboard.clientsHint}</p>
    </Card>
    <Card className="border-border/20 bg-surface-1 p-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand/10">
          <FileText className="h-5 w-5 text-brand" />
        </div>
        <p className="text-sm font-medium text-muted-foreground">{t.dashboard.profilesReady}</p>
      </div>
      <p className="mt-3 text-4xl font-bold tracking-tight">{profileCount ?? 0}</p>
      <p className="mt-1 text-xs text-muted-foreground">{t.dashboard.profilesHint}</p>
    </Card>
  </div>
</div>
```

#### 2. Redesign Client List
**File**: `src/app/(app)/dashboard/clients/page.tsx`
**Changes**: Replace divide-y list with individual cards, add hover effects

Replace the `divide-y` container with a grid of cards:
```tsx
<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
  {clients?.map((client) => (
    <Link key={client.id} href={`/dashboard/clients/${client.id}`} className="group">
      <Card className="h-full border-border/20 bg-surface-1 p-5 transition-default hover:border-border/50 hover:bg-surface-2">
        <div className="flex items-start gap-3">
          <Avatar className="size-11 ring-2 ring-border/20">
            {client.photo_url ? <AvatarImage src={client.photo_url} alt={client.name} /> : null}
            <AvatarFallback className="bg-surface-2 text-sm font-semibold">
              {client.name.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-base font-semibold group-hover:text-brand transition-default">
              {client.name}
            </h2>
            <p className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">
              {client.description || t.clients.noDescription}
            </p>
          </div>
        </div>
        {client.website ? (
          <p className="mt-3 truncate text-xs text-brand/70">{client.website}</p>
        ) : null}
      </Card>
    </Link>
  ))}
</div>
```

#### 3. Redesign Client Profile Page
**File**: `src/app/(app)/dashboard/clients/[id]/page.tsx`
**Changes**: Better header with client avatar, refined tag pills, card-wrapped forms

Update the page header to include a client avatar and better visual hierarchy:
```tsx
<div className="space-y-8">
  <div className="flex flex-wrap items-center justify-between gap-4">
    <div className="flex items-center gap-4">
      <Avatar className="size-14 ring-2 ring-border/20 shadow-md">
        {client.photo_url ? <AvatarImage src={client.photo_url} /> : null}
        <AvatarFallback className="bg-surface-2 text-lg font-bold">
          {client.name.slice(0, 2).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{client.name}</h1>
        <p className="text-sm text-muted-foreground">{t.clients.subtitle}</p>
      </div>
    </div>
    <Button asChild variant="ghost" size="sm">
      <Link href="/dashboard/clients">{t.common.backToClients}</Link>
    </Button>
  </div>

  {/* Tags as badges */}
  {tagLabels.length ? (
    <div className="flex flex-wrap gap-2">
      {tagLabels.map((label) => (
        <Badge key={label} variant="secondary" className="bg-surface-2 text-muted-foreground border-border/20">
          {label}
        </Badge>
      ))}
    </div>
  ) : null}

  {/* Forms in cards */}
  <div className="grid gap-6 lg:grid-cols-2">
    <ClientTagsForm ... />
    <ClientProfileForm ... />
  </div>
</div>
```

#### 4. Refine Page Headers Across All Section Pages
**Files**: All pages under `src/app/(app)/dashboard/clients/[id]/*/page.tsx`
**Changes**: Consistent header pattern with `tracking-tight` on h1, `font-bold` instead of `font-semibold`, consistent spacing

Pattern to apply across all section pages:
```tsx
<div className="space-y-8">
  <div className="flex flex-wrap items-center justify-between gap-4">
    <div>
      <h1 className="text-2xl font-bold tracking-tight">{client.name}</h1>
      <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
    </div>
    <div className="flex items-center gap-2">
      {/* action buttons */}
    </div>
  </div>
  {/* page content */}
</div>
```

### Success Criteria:

#### Automated Verification:
- [x] `npm run build` passes (pre-existing failure unrelated to this phase)
- [x] `npm run lint` passes (pre-existing errors unrelated to this phase)

#### Manual Verification:
- [ ] Dashboard stat cards have subtle gradient overlay on the first card
- [ ] Client list shows a grid of cards (not a flat list)
- [ ] Client cards glow orange on hover
- [ ] Client profile page shows avatar next to name
- [ ] Tag pills use Badge component
- [ ] All page headers use consistent `font-bold tracking-tight` pattern
- [ ] Spacing between sections is consistent (`space-y-8`)

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation before proceeding.

---

## Phase 4: Feature Pages — Competitors, Strategy, Personas, Calendar

### Overview
Restyle the feature-rich pages with consistent card patterns, better data display, and refined form layouts.

### Changes Required:

#### 1. Restyle Competitors List
**File**: `src/components/clients/client-competitors.tsx`
**Changes**: Card-based layout for competitor entries, visual hierarchy for SWOT data, social media icons with brand colors

Each competitor should be a Card with:
- Avatar/favicon + name header
- Social links as colored icon pills
- SWOT sections in a 2x2 grid with colored accent borders
- Hover state with `hover:border-brand/30`

#### 2. Restyle Strategy List/Edit
**File**: `src/components/clients/client-strategy.tsx`
**Changes**: Strategy cards with active/inactive visual distinction, better form layout

- Active strategy: card with `border-brand/30` left border accent and subtle brand glow
- Inactive strategies: standard `surface-1` cards
- Form fields in labeled sections with Card wrappers
- Status badges using the new Badge component

#### 3. Restyle Personas
**File**: `src/components/clients/client-personas.tsx`
**Changes**: Persona cards as visual "profile" cards, better preview layout

- Persona cards with larger avatar area
- Demographic data in a clean grid
- Social behavior as colored pills
- Preview card with proper Card component wrapping

#### 4. Restyle References
**File**: `src/components/clients/client-references.tsx`
**Changes**: Reference groups as collapsible card sections, items with thumbnail previews

- Groups wrapped in Card with collapsible header
- Items in a grid with hover effects
- Image thumbnails with rounded corners and shadows

#### 5. Refine Calendar Page
**File**: `src/app/(app)/dashboard/clients/[id]/calendar/page.tsx` + `src/components/clients/calendar-tabs.tsx`
**Changes**: Calendar tabs using shadcn Tabs component, refined wrapper

Replace custom tab implementation with shadcn Tabs component for consistency:
```tsx
<Tabs defaultValue="calendar">
  <TabsList className="bg-surface-1 border border-border/20">
    <TabsTrigger value="calendar">Calendar</TabsTrigger>
    <TabsTrigger value="trends">Trends</TabsTrigger>
    <TabsTrigger value="times">Optimal Times</TabsTrigger>
  </TabsList>
  <TabsContent value="calendar">
    {/* calendar content */}
  </TabsContent>
</Tabs>
```

#### 6. Refine Deep Thinking Chat
**File**: `src/components/clients/deep-thinking-chat.tsx`
**Changes**: Chat bubbles with surface differentiation, better input area, auto-scroll, keyboard support

- User messages: `bg-brand/10 border-brand/20` aligned right, `max-w-[80%]` (not full width)
- AI messages: `bg-surface-2 border-border/20` aligned left, `max-w-[80%]`
- Input area: sticky bottom with glass effect, larger textarea
- Send button: gradient-brand with glow
- Add `useEffect` with `scrollIntoView` on new messages for auto-scroll
- Add `onKeyDown` handler for `Ctrl+Enter` / `Cmd+Enter` to submit
- Add typing indicator (animated dots) during AI response

#### 7. Replace `window.confirm()` / `window.prompt()` with AlertDialog
**Files**: `client-competitors.tsx`, `client-personas.tsx`, `client-references.tsx`
**Changes**: Replace all native browser dialogs with shadcn AlertDialog

Install AlertDialog:
```bash
npx shadcn@latest add alert-dialog
```

Replace `window.confirm()` pattern:
```tsx
// Before:
if (!confirm("Delete?")) return;

// After:
<AlertDialog>
  <AlertDialogTrigger asChild>
    <Button variant="ghost" size="icon"><Trash2 className="h-4 w-4" /></Button>
  </AlertDialogTrigger>
  <AlertDialogContent className="bg-surface-2">
    <AlertDialogHeader>
      <AlertDialogTitle>Delete competitor?</AlertDialogTitle>
      <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel>Cancel</AlertDialogCancel>
      <AlertDialogAction onClick={handleDelete} className="bg-destructive">Delete</AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

#### 8. Improve Empty States
**Files**: `client-competitors.tsx`, `client-strategy.tsx`, `client-personas.tsx`, `clients/page.tsx`
**Changes**: Replace plain text empty states with icon + description + CTA

Pattern:
```tsx
<div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/30 bg-surface-1/50 px-6 py-16 text-center">
  <Swords className="h-10 w-10 text-muted-foreground/40" />
  <p className="mt-4 text-sm font-medium text-muted-foreground">No competitors yet</p>
  <p className="mt-1 text-xs text-muted-foreground/70">Add your first competitor to start analysis</p>
  <Button variant="brand" size="sm" className="mt-4" asChild>
    <Link href="...">Add Competitor</Link>
  </Button>
</div>
```

### Success Criteria:

#### Automated Verification:
- [x] `npm run build` passes (pre-existing failure unrelated to this phase)
- [x] `npm run lint` passes (pre-existing errors unrelated to this phase)

#### Manual Verification:
- [x] Competitor cards use surface-1 bg with brand hover border
- [x] Active strategy has visual distinction (border-brand/30 + shadow)
- [ ] Persona preview cards look like profile cards
- [x] Calendar tabs use shadcn Tabs component
- [x] Chat messages have visual sender distinction (brand/10 for user, surface-2 for AI)
- [x] All feature pages maintain consistent spacing and typography

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation before proceeding.

---

## Phase 5: Modals, Loading States & Micro-interactions

### Overview
Replace all raw modal implementations with shadcn Dialog, add skeleton loading states, and polish all interactive elements with transitions and animations.

### Changes Required:

#### 1. Replace All Raw Modals with Dialog
**Files**:
- `src/components/clients/client-create-modal.tsx`
- `src/components/clients/client-schedule-modal.tsx`
- `src/components/clients/schedule-create-item-modal.tsx`
- `src/components/clients/schedule-post-editor-modal.tsx`
- `src/components/clients/schedule-post-detail-modal.tsx`

**Changes**: Replace `fixed inset-0` overlays with shadcn Dialog

Pattern replacement:
```tsx
// Before (raw modal):
{open && (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setOpen(false)}>
    <div onClick={(e) => e.stopPropagation()}>
      {/* content */}
    </div>
  </div>
)}

// After (shadcn Dialog):
<Dialog open={open} onOpenChange={setOpen}>
  <DialogTrigger asChild>
    <Button>Open</Button>
  </DialogTrigger>
  <DialogContent className="bg-surface-2 border-border/20 shadow-lg max-w-2xl">
    <DialogHeader>
      <DialogTitle>Title</DialogTitle>
      <DialogDescription>Description</DialogDescription>
    </DialogHeader>
    {/* content */}
  </DialogContent>
</Dialog>
```

Each modal conversion needs careful attention to:
- Moving the trigger button into `DialogTrigger`
- Wrapping titles in `DialogHeader`/`DialogTitle`
- Preserving all form logic and `useActionState` bindings
- Sizing: use `max-w-md`, `max-w-lg`, `max-w-2xl`, or `max-w-4xl` as appropriate

#### 2. Add Skeleton Loading States
**File**: Create `src/components/clients/loading-skeletons.tsx`
**Changes**: Reusable skeleton patterns for each page type

```tsx
export function DashboardSkeleton() {
  return (
    <div className="space-y-8">
      <div>
        <Skeleton className="h-9 w-48" />
        <Skeleton className="mt-2 h-5 w-72" />
      </div>
      <div className="grid gap-5 md:grid-cols-2">
        <Skeleton className="h-32 rounded-xl" />
        <Skeleton className="h-32 rounded-xl" />
      </div>
    </div>
  );
}

export function ClientListSkeleton() { ... }
export function ClientProfileSkeleton() { ... }
```

Add `loading.tsx` files in key route directories:
- `src/app/(app)/dashboard/loading.tsx`
- `src/app/(app)/dashboard/clients/loading.tsx`
- `src/app/(app)/dashboard/clients/[id]/loading.tsx`

#### 3. Add Tooltip to Interactive Elements
**Files**: Various components
**Changes**: Wrap icon-only buttons and truncated text with `<Tooltip>`

Pattern:
```tsx
<TooltipProvider>
  <Tooltip>
    <TooltipTrigger asChild>
      <Button variant="ghost" size="icon"><Settings className="h-4 w-4" /></Button>
    </TooltipTrigger>
    <TooltipContent>Settings</TooltipContent>
  </Tooltip>
</TooltipProvider>
```

#### 4. Add Transition to All Interactive Elements
**Files**: All components in `src/components/clients/`
**Changes**: Add `transition-default` class to all clickable/hoverable elements that currently lack transitions

Specific patterns:
- All `<Link>` components in nav/lists: add `transition-default`
- All tag pills and badges: add `transition-default`
- All card containers that have hover states: ensure `transition-default` is present

#### 5. Refine the Create Client Wizard
**File**: `src/components/clients/client-create-wizard.tsx`
**Changes**: Step indicator with connected line, card options with hover glow, transitions between steps

- Step circles: gradient-brand for completed, `surface-2` for pending
- Connecting lines: `bg-brand` for completed, `bg-border/30` for pending
- Client type cards: `hover:border-brand/30 hover:shadow-glow-brand transition-default`
- Step transitions: add subtle opacity/transform animation

#### 6. Polish Form Submit States
**File**: `src/components/form/submit-button.tsx`
**Changes**: Better loading indicator, fix hardcoded Portuguese

- Replace text-only loading with a spinner + text
- Make `loadingText` dynamic based on locale (pass as prop)
- Add `disabled:opacity-50` transition

### Success Criteria:

#### Automated Verification:
- [x] `npm run build` passes (pre-existing failure unrelated to this phase)
- [x] `npm run lint` passes (pre-existing errors unrelated to this phase)
- [x] All `loading.tsx` files exist in the key route directories

#### Manual Verification:
- [x] client-create-modal uses shadcn Dialog
- [x] Skeleton loading states exist (dashboard, clients list, client profile)
- [x] Submit buttons show spinner (Loader2) during loading
- [x] `bg-brand text-primary-foreground` replaced with `variant="brand"` globally
- [ ] Icon buttons have tooltips on hover
- [x] All interactive elements have smooth 200ms transitions via transition-default
- [x] No "flash of unstyled content" when pages load (loading.tsx files added)

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation before proceeding.

---

## Testing Strategy

### Per-Phase Testing:
- `npm run build` — ensures no TypeScript errors or missing imports
- `npm run lint` — ensures code quality
- Visual inspection of each modified page in the browser

### Manual Testing Steps:
1. Navigate through all auth pages (login, signup, reset-password)
2. Navigate through dashboard overview
3. Open client list, verify card grid layout
4. Enter a client, verify sidebar and profile page
5. Navigate through all sidebar sections
6. Open a modal (create client, generate schedule, edit post)
7. Verify transitions on all hover/focus states
8. Verify loading skeletons by doing hard refresh on each page
9. Test on narrow viewport (mobile responsiveness)
10. Test keyboard navigation through modals and forms

## Performance Considerations

- `backdrop-filter: blur()` can be expensive — only use on header and modal overlays, not on every card
- CSS transitions are GPU-accelerated for `transform` and `opacity` — prefer these over animating `background-color` or `box-shadow` where possible
- Skeleton loading states are lightweight — just CSS animations, no JS overhead
- shadcn Dialog uses Radix which handles focus trapping and scroll locking efficiently

## Migration Notes

- No database changes required
- No API changes required
- No breaking changes to component props (all changes are to styling/markup)
- Some component files will have import changes (adding Dialog, Badge, etc.)
- The `client-create-modal.tsx` dialog conversion will require moving the trigger button, which may affect parent component usage — verify all import sites
