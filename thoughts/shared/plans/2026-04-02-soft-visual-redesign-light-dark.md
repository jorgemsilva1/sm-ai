# Soft Visual Redesign + Light/Dark Mode Implementation Plan

## Overview

Transform SM-AI from a cold, dark-only dev-tool aesthetic into a warm, soft, creative-studio feel with full light/dark/system mode support. The platform targets social media agencies and freelancers — the visual identity should feel modern, inviting, and creative rather than technical.

## Current State Analysis

- **Dark-only**: `className="dark"` is hardcoded on `<html>` in `layout.tsx:32`
- **Cold blue-gray**: All dark backgrounds use hue 250-252 (blue-gray), which reads as "developer tool"
- **`:root` light tokens exist** but are never used (also cold blue-gray tinted, hue 245)
- **Surface tokens** (`surface-0/1/2/3`) only defined in `.dark`, missing from `:root`
- **Custom utilities** (`glass`, `gradient-brand`, `shadow-glow-brand`, `bg-tech`, `border-grid`) use hardcoded oklch values tuned only for dark mode
- **Hardcoded `hover:bg-white/5`** in header nav and sidebar (dark-only)
- **No theme toggle** exists — no cookie, no provider, no UI

### Key Discoveries:
- Components use semantic tokens well — `bg-surface-1`, `text-muted-foreground`, `border-border/20` etc. (~95% semantic)
- Only 5 files use hardcoded `hover:bg-white/5` or `text-white` outside of media previews
- Calendar CSS uses `color-mix()` with token vars — already mode-agnostic
- The `@custom-variant dark (&:is(.dark *))` in globals.css already supports class-based toggling
- Language switcher uses cookie + `router.refresh()` pattern — exact same pattern works for theme

## Desired End State

1. **3-way theme toggle** (system / light / dark) in the header, persisted via cookie
2. **Warm color palette** in both modes:
   - Dark: violet-gray backgrounds (hue ~285) instead of cold blue-gray (hue 250)
   - Light: warm off-white/cream backgrounds (hue ~75) instead of clinical white
3. **All components render correctly** in both modes with no hardcoded dark-only values
4. **Soft, premium feel** — reduced contrast ratios, subtle borders, gentle shadows
5. **Brand orange preserved** as CTA/accent color — works on both backgrounds
6. **`color-scheme` CSS property** set for native element theming (scrollbars, inputs)

### Verification:
- Toggle between all 3 modes — every page renders without broken colors or invisible text
- `npm run build` passes (excluding pre-existing `slug` error)
- No raw oklch/hex/rgba colors visible in component files (only in globals.css utilities)
- Calendar, modals, chat, forms all look correct in both modes

## What We're NOT Doing

- Changing the brand color from orange/amber to purple (keeping the existing brand identity)
- Adding animations or motion design beyond existing `transition-default`
- Redesigning layouts, spacing, or component structure
- Adding new shadcn components
- Changing the font stack
- Touching the auth pages' layout (they inherit tokens automatically)

## Implementation Approach

The approach is token-first: redefine CSS custom properties, then fix the handful of hardcoded values. Since ~95% of the codebase already uses semantic tokens, the palette shift will cascade automatically through most of the UI once tokens are updated.

The theme toggle follows the same cookie-based pattern as the existing language switcher — server reads the cookie, client component sets it and refreshes.

---

## Phase 1: Design Token Foundation

### Overview
Redefine all CSS custom properties for both `:root` (light) and `.dark` with warm, soft values. Add surface tokens to `:root`. This single change will cascade through ~95% of the UI automatically.

### Changes Required:

#### 1. Update `:root` (light mode) tokens
**File**: `src/app/globals.css` (lines 270-306)
**Changes**: Replace cold blue-gray `:root` tokens with warm cream palette

```css
:root {
  --radius: 0.625rem;

  /* Warm cream/sand backgrounds */
  --background: oklch(0.98 0.008 75);
  --foreground: oklch(0.18 0.02 285);
  --card: oklch(1 0.003 75);
  --card-foreground: oklch(0.18 0.02 285);
  --popover: oklch(1 0.003 75);
  --popover-foreground: oklch(0.18 0.02 285);

  /* Brand stays orange */
  --primary: oklch(0.65 0.2 50);
  --primary-foreground: oklch(0.99 0.005 75);

  /* Warm neutral surfaces */
  --secondary: oklch(0.95 0.008 75);
  --secondary-foreground: oklch(0.22 0.02 285);
  --muted: oklch(0.94 0.008 75);
  --muted-foreground: oklch(0.46 0.015 270);
  --accent: oklch(0.94 0.025 55);
  --accent-foreground: oklch(0.22 0.02 285);

  --destructive: oklch(0.58 0.22 27);

  /* Warm gray borders */
  --border: oklch(0.90 0.01 75);
  --input: oklch(0.90 0.01 75);
  --ring: oklch(0.65 0.15 55);

  /* Brand scale */
  --brand: oklch(0.65 0.2 50);
  --brand-muted: oklch(0.78 0.12 55);
  --brand-strong: oklch(0.55 0.22 45);

  /* Charts */
  --chart-1: oklch(0.60 0.22 45);
  --chart-2: oklch(0.55 0.14 185);
  --chart-3: oklch(0.45 0.08 270);
  --chart-4: oklch(0.75 0.18 85);
  --chart-5: oklch(0.65 0.19 330);

  /* Sidebar */
  --sidebar: oklch(0.97 0.008 75);
  --sidebar-foreground: oklch(0.18 0.02 285);
  --sidebar-primary: oklch(0.65 0.2 50);
  --sidebar-primary-foreground: oklch(0.99 0.005 75);
  --sidebar-accent: oklch(0.95 0.015 55);
  --sidebar-accent-foreground: oklch(0.22 0.02 285);
  --sidebar-border: oklch(0.90 0.01 75);
  --sidebar-ring: oklch(0.65 0.15 55);

  /* Surface elevation (light mode) */
  --surface-0: oklch(0.97 0.006 75);
  --surface-1: oklch(1 0.003 75);
  --surface-2: oklch(0.98 0.005 75);
  --surface-3: oklch(0.96 0.008 75);
  --surface-overlay: oklch(0.18 0.02 285 / 40%);
}
```

Note on light mode surface philosophy: `surface-0` is the page background (slightly warm), `surface-1` is cards/elevated (pure white-ish — lightest), `surface-2` is nested content areas, `surface-3` is recessed/muted areas. This is inverted from dark mode where higher numbers = lighter.

#### 2. Update `.dark` tokens — shift from cold blue-gray to warm violet-gray
**File**: `src/app/globals.css` (lines 308-350)
**Changes**: Shift hue from 250-252 → 280-285 across all dark tokens

```css
.dark {
  /* Warm violet-gray backgrounds */
  --background: oklch(0.14 0.015 285);
  --foreground: oklch(0.96 0.008 280);
  --card: oklch(0.17 0.015 285);
  --card-foreground: oklch(0.96 0.008 280);
  --popover: oklch(0.17 0.015 285);
  --popover-foreground: oklch(0.96 0.008 280);

  /* Brand orange — slightly brighter in dark mode for contrast */
  --primary: oklch(0.72 0.18 55);
  --primary-foreground: oklch(0.14 0.015 285);

  /* Warm dark surfaces */
  --secondary: oklch(0.22 0.015 285);
  --secondary-foreground: oklch(0.96 0.008 280);
  --muted: oklch(0.22 0.015 285);
  --muted-foreground: oklch(0.62 0.015 280);
  --accent: oklch(0.26 0.025 55);
  --accent-foreground: oklch(0.96 0.008 280);

  --destructive: oklch(0.65 0.22 25);

  /* Borders — white with subtle warmth */
  --border: oklch(1 0 0 / 10%);
  --input: oklch(1 0 0 / 12%);
  --ring: oklch(0.68 0.14 55);

  /* Brand scale */
  --brand: oklch(0.72 0.18 55);
  --brand-muted: oklch(0.68 0.12 55);
  --brand-strong: oklch(0.60 0.22 48);

  /* Charts */
  --chart-1: oklch(0.64 0.24 55);
  --chart-2: oklch(0.55 0.17 200);
  --chart-3: oklch(0.72 0.12 85);
  --chart-4: oklch(0.63 0.2 310);
  --chart-5: oklch(0.68 0.2 20);

  /* Sidebar */
  --sidebar: oklch(0.17 0.015 285);
  --sidebar-foreground: oklch(0.96 0.008 280);
  --sidebar-primary: oklch(0.72 0.18 55);
  --sidebar-primary-foreground: oklch(0.14 0.015 285);
  --sidebar-accent: oklch(0.24 0.015 285);
  --sidebar-accent-foreground: oklch(0.96 0.008 280);
  --sidebar-border: oklch(1 0 0 / 10%);
  --sidebar-ring: oklch(0.68 0.14 55);

  /* Surface elevation layers — warm violet-gray */
  --surface-0: oklch(0.14 0.015 285);
  --surface-1: oklch(0.17 0.015 285);
  --surface-2: oklch(0.20 0.015 285);
  --surface-3: oklch(0.23 0.015 285);
  --surface-overlay: oklch(0.08 0.015 285 / 80%);
}
```

#### 3. Add `color-scheme` to both modes
**File**: `src/app/globals.css`
**Changes**: Add `color-scheme` property to `:root` and `.dark` for native element theming

```css
:root {
  color-scheme: light;
  /* ... existing tokens ... */
}

.dark {
  color-scheme: dark;
  /* ... existing tokens ... */
}
```

### Success Criteria:

#### Automated Verification:
- [ ] `npm run build` passes (pre-existing slug error is expected)
- [ ] `npm run lint` passes
- [ ] No regressions in dark mode (visual check with hardcoded `dark` still on)

#### Manual Verification:
- [ ] Dark mode looks visibly warmer (violet-gray vs cold blue-gray)
- [ ] Text is readable in dark mode (sufficient contrast)
- [ ] Brand orange still pops on the warm dark backgrounds

---

## Phase 2: Theme Toggle Infrastructure

### Overview
Create a cookie-based theme provider and 3-way toggle UI component. Server components read the cookie to set the initial class. Client component handles switching and persists the choice.

### Changes Required:

#### 1. Create ThemeProvider
**File**: `src/components/theme/theme-provider.tsx` (new)
**Changes**: Client component that manages the `dark` class on `<html>` and persists to cookie

```tsx
"use client";

import { createContext, useContext, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

type Theme = "light" | "dark" | "system";

type ThemeProviderContext = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  resolvedTheme: "light" | "dark";
};

const ThemeContext = createContext<ThemeProviderContext | undefined>(undefined);

export function ThemeProvider({
  children,
  defaultTheme = "system",
}: {
  children: React.ReactNode;
  defaultTheme?: Theme;
}) {
  const [theme, setThemeState] = useState<Theme>(defaultTheme);
  const router = useRouter();
  const [, startTransition] = useTransition();

  const resolvedTheme = getResolvedTheme(theme);

  function getResolvedTheme(t: Theme): "light" | "dark" {
    if (t === "system") {
      if (typeof window !== "undefined") {
        return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
      }
      return "light"; // SSR fallback
    }
    return t;
  }

  useEffect(() => {
    const root = document.documentElement;
    const resolved = getResolvedTheme(theme);
    root.classList.toggle("dark", resolved === "dark");
  }, [theme]);

  // Listen for system preference changes when in system mode
  useEffect(() => {
    if (theme !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => {
      const root = document.documentElement;
      root.classList.toggle("dark", mq.matches);
    };
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [theme]);

  const setTheme = (next: Theme) => {
    setThemeState(next);
    document.cookie = `theme=${next}; path=/; max-age=31536000`;
    startTransition(() => {
      router.refresh();
    });
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, resolvedTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme must be used within ThemeProvider");
  return context;
}
```

#### 2. Create ThemeToggle
**File**: `src/components/theme/theme-toggle.tsx` (new)
**Changes**: 3-way dropdown toggle matching LanguageSwitcher style

```tsx
"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTheme } from "@/components/theme/theme-provider";
import { copy, Locale } from "@/lib/i18n";

type ThemeToggleProps = {
  locale: Locale;
};

export function ThemeToggle({ locale }: ThemeToggleProps) {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const t = copy[locale];

  const Icon = resolvedTheme === "dark" ? Moon : Sun;

  const options = [
    { value: "system", label: t.common.themeSystem, icon: Monitor },
    { value: "light", label: t.common.themeLight, icon: Sun },
    { value: "dark", label: t.common.themeDark, icon: Moon },
  ] as const;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="flex items-center gap-2 rounded-md border border-border/40 px-2 py-1 text-sm text-muted-foreground transition hover:bg-muted/60 hover:text-foreground"
        >
          <Icon className="h-3.5 w-3.5" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuRadioGroup
          value={theme}
          onValueChange={(v) => setTheme(v as "system" | "light" | "dark")}
        >
          {options.map((opt) => (
            <DropdownMenuRadioItem key={opt.value} value={opt.value}>
              <opt.icon className="mr-2 h-3.5 w-3.5" />
              {opt.label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
```

#### 3. Add i18n keys for theme toggle
**File**: `src/lib/i18n.ts`
**Changes**: Add `themeSystem`, `themeLight`, `themeDark` keys under `common` for both locales

```ts
// Under en.common:
themeSystem: "System",
themeLight: "Light",
themeDark: "Dark",

// Under pt.common:
themeSystem: "Sistema",
themeLight: "Claro",
themeDark: "Escuro",
```

#### 4. Update Root Layout to read theme cookie
**File**: `src/app/layout.tsx`
**Changes**:
- Read `theme` cookie to determine initial class
- Wrap children in `<ThemeProvider>`
- Remove hardcoded `className="dark"`
- Resolve "system" on server side using a fallback (default to light)

```tsx
import { ThemeProvider } from "@/components/theme/theme-provider";

export default async function RootLayout({ children }) {
  const cookieStore = await cookies();
  const locale = getLocale(cookieStore);
  const themeCookie = cookieStore.get("theme")?.value as "light" | "dark" | "system" | undefined;
  const theme = themeCookie || "system";
  // Server can't detect system preference — default to light for SSR
  const initialClass = theme === "dark" ? "dark" : theme === "light" ? "" : "";

  return (
    <html lang={locale} className={initialClass} suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} min-h-screen bg-background text-foreground antialiased`}>
        <ThemeProvider defaultTheme={theme}>
          {children}
        </ThemeProvider>
        <Toaster richColors closeButton />
      </body>
    </html>
  );
}
```

Note: `suppressHydrationWarning` is needed because the class may differ between server render (no system detection) and client hydration (detects system preference).

#### 5. Add ThemeToggle to app header
**File**: `src/app/(app)/layout.tsx`
**Changes**: Import and render `<ThemeToggle locale={locale} />` next to `<LanguageSwitcher>`

```tsx
import { ThemeToggle } from "@/components/theme/theme-toggle";

// In the header, next to LanguageSwitcher:
<ThemeToggle locale={locale} />
<LanguageSwitcher locale={locale} />
```

### Success Criteria:

#### Automated Verification:
- [ ] `npm run build` passes
- [ ] `npm run lint` passes

#### Manual Verification:
- [ ] Toggle appears in header with sun/moon icon
- [ ] Clicking "Light" removes `dark` class → light palette appears
- [ ] Clicking "Dark" adds `dark` class → dark palette appears
- [ ] Clicking "System" follows OS preference
- [ ] Preference persists across page refresh (cookie)
- [ ] No flash of wrong theme on page load (SSR + `suppressHydrationWarning`)

---

## Phase 3: Mode-Aware Custom Utilities

### Overview
Update all custom utility classes in `globals.css` to work in both light and dark mode. Currently they use hardcoded oklch values tuned for dark backgrounds.

### Changes Required:

#### 1. Update glass utilities
**File**: `src/app/globals.css` (`@layer utilities`)
**Changes**: Use CSS custom properties or `light-dark()` for glass backgrounds

```css
.glass {
  background: oklch(from var(--card) l c h / 70%);
  backdrop-filter: blur(16px) saturate(1.2);
  -webkit-backdrop-filter: blur(16px) saturate(1.2);
}
.glass-strong {
  background: oklch(from var(--card) l c h / 85%);
  backdrop-filter: blur(24px) saturate(1.3);
  -webkit-backdrop-filter: blur(24px) saturate(1.3);
}
```

Note: `oklch(from var(--card) l c h / 70%)` uses relative color syntax to take the card color and apply 70% opacity. If browser support is a concern, use a fallback approach with separate `.dark .glass` rules:

```css
.glass {
  background: oklch(0.99 0.003 75 / 70%);
  backdrop-filter: blur(16px) saturate(1.2);
  -webkit-backdrop-filter: blur(16px) saturate(1.2);
}
:is(.dark *).glass, .dark.glass {
  background: oklch(0.17 0.015 285 / 70%);
}
.glass-strong {
  background: oklch(0.99 0.003 75 / 85%);
  backdrop-filter: blur(24px) saturate(1.3);
  -webkit-backdrop-filter: blur(24px) saturate(1.3);
}
:is(.dark *).glass-strong, .dark.glass-strong {
  background: oklch(0.17 0.015 285 / 85%);
}
```

#### 2. Update shadow-glow utilities
**File**: `src/app/globals.css` (`@layer utilities`)
**Changes**: Glow is more subtle in light mode, more vivid in dark

```css
.shadow-glow-brand {
  box-shadow: 0 0 12px rgba(255, 140, 0, 0.15), 0 0 24px rgba(255, 100, 0, 0.06);
}
:is(.dark *).shadow-glow-brand {
  box-shadow: 0 0 16px rgba(255, 140, 0, 0.4), 0 0 32px rgba(255, 100, 0, 0.15);
}
.shadow-glow-brand-strong {
  box-shadow: 0 0 18px rgba(255, 140, 0, 0.25), 0 0 36px rgba(255, 100, 0, 0.1);
}
:is(.dark *).shadow-glow-brand-strong {
  box-shadow: 0 0 24px rgba(255, 140, 0, 0.55), 0 0 48px rgba(255, 100, 0, 0.2);
}
```

#### 3. Update gradient-brand
**File**: `src/app/globals.css` (`@layer utilities`)
**Changes**: Gradient values work on both backgrounds. The current values are fine — they're saturated enough for light and dark. No change needed to gradient-brand itself.

#### 4. Update text-gradient-brand
**File**: `src/app/globals.css` (`@layer utilities`)
**Changes**: The light mode needs slightly darker gradient stops for readability on white backgrounds

```css
.text-gradient-brand {
  background: linear-gradient(135deg, oklch(0.62 0.22 55), oklch(0.50 0.24 35));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}
:is(.dark *).text-gradient-brand {
  background: linear-gradient(135deg, oklch(0.82 0.20 62), oklch(0.65 0.24 30));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}
```

#### 5. Update bg-tech
**File**: `src/app/globals.css` (`@layer utilities`)
**Changes**: Light mode needs very subtle warm washes instead of dark ambient glows

```css
.bg-tech {
  background-image:
    radial-gradient(1200px 600px at 20% -10%, oklch(0.74 0.19 55 / 0.06), transparent 60%),
    radial-gradient(900px 600px at 80% -20%, oklch(0.58 0.18 30 / 0.08), transparent 60%),
    radial-gradient(800px 500px at 50% 120%, oklch(0.65 0.10 285 / 0.06), transparent 60%);
}
:is(.dark *).bg-tech {
  background-image:
    radial-gradient(1200px 600px at 20% -10%, oklch(0.74 0.19 55 / 0.15), transparent 60%),
    radial-gradient(900px 600px at 80% -20%, oklch(0.58 0.18 30 / 0.18), transparent 60%),
    radial-gradient(800px 500px at 50% 120%, oklch(0.35 0.05 285 / 0.5), transparent 60%);
}
```

#### 6. Update border-grid
**File**: `src/app/globals.css` (`@layer utilities`)
**Changes**: Use dark lines on light bg, light lines on dark bg

```css
.border-grid {
  background-image: linear-gradient(
      to right,
      oklch(0 0 0 / 0.06) 1px,
      transparent 1px
    ),
    linear-gradient(to bottom, oklch(0 0 0 / 0.06) 1px, transparent 1px);
  background-size: 32px 32px;
}
:is(.dark *).border-grid {
  background-image: linear-gradient(
      to right,
      oklch(1 0 0 / 0.06) 1px,
      transparent 1px
    ),
    linear-gradient(to bottom, oklch(1 0 0 / 0.06) 1px, transparent 1px);
  background-size: 32px 32px;
}
```

### Success Criteria:

#### Automated Verification:
- [ ] `npm run build` passes
- [ ] `npm run lint` passes

#### Manual Verification:
- [ ] Header glass effect looks correct in both light and dark mode
- [ ] Logo glow is visible but not overpowering in light mode
- [ ] Logo glow is vivid and visible in dark mode
- [ ] Brand gradient text is readable in light mode (dark enough)
- [ ] Brand gradient text glows in dark mode
- [ ] `bg-tech` background washes are very subtle in light mode

---

## Phase 4: Fix Hardcoded Dark-Only Values in Components

### Overview
Replace all `hover:bg-white/5`, `text-white`, and other dark-only hardcoded values with mode-aware alternatives.

### Changes Required:

#### 1. Fix header nav hover
**File**: `src/app/(app)/layout.tsx` (lines 41, 47)
**Changes**: Replace `hover:bg-white/5` with `hover:bg-foreground/5`

```tsx
// Before:
className="... hover:bg-white/5 hover:text-foreground"
// After:
className="... hover:bg-foreground/5 hover:text-foreground"
```

#### 2. Fix sidebar nav hover
**File**: `src/components/clients/client-sidebar-nav.tsx` (line 158)
**Changes**: Replace `hover:bg-white/5` with `hover:bg-foreground/5`

```tsx
// Before:
"text-muted-foreground hover:bg-white/5 hover:text-foreground"
// After:
"text-muted-foreground hover:bg-foreground/5 hover:text-foreground"
```

#### 3. Fix button brand variant
**File**: `src/components/ui/button.tsx` (line 13)
**Changes**: `text-white` is fine for brand variant — the gradient background is dark enough in both modes. No change needed.

#### 4. Fix logo text-white
**File**: `src/components/branding/logo.tsx` (line 11)
**Changes**: `text-white` on the gradient-brand badge is fine — the gradient background is always dark. No change needed.

#### 5. Fix persona avatar text-white
**File**: `src/components/clients/client-personas.tsx` (line 167)
**Changes**: `text-white` on colored avatar circle is fine — avatar colors are set explicitly. No change needed.

#### 6. Fix schedule-post-editor-modal text-white
**File**: `src/components/clients/schedule-post-editor-modal.tsx` (multiple lines)
**Changes**: These are inside a TikTok/Instagram preview mock-up with dark overlays — `text-white` is correct here because it's simulating a phone screen. No change needed.

#### 7. Review card.tsx hover effects
**File**: `src/components/ui/card.tsx`
**Changes**: Current `hover:shadow-lg hover:border-border/50` works in both modes. In light mode, add a subtle lift:

```tsx
// Before:
"bg-surface-1 text-card-foreground flex flex-col gap-6 rounded-xl border border-border/30 py-6 shadow-md transition-default hover:shadow-lg hover:border-border/50"
// After:
"bg-surface-1 text-card-foreground flex flex-col gap-6 rounded-xl border border-border/30 py-6 shadow-sm transition-default hover:shadow-md hover:border-border/50"
```

Note: Reduced `shadow-md` → `shadow-sm` default and `shadow-lg` → `shadow-md` hover. Light mode cards look better with subtler shadows.

#### 8. Review input/textarea focus states
**File**: `src/components/ui/input.tsx`, `src/components/ui/textarea.tsx`
**Changes**: `focus-visible:border-brand/50 focus-visible:ring-brand/30` works in both modes. No change needed.

#### 9. Fix select focus ring to match input/textarea
**File**: `src/components/ui/select.tsx`
**Changes**: Currently uses `focus-visible:ring-ring` instead of `focus-visible:ring-brand/30`. Update for consistency:

```tsx
// SelectTrigger — change ring token from ring to brand
// Before:
"focus-visible:ring-ring"
// After:
"focus-visible:border-brand/50 focus-visible:ring-brand/30"
```

### Success Criteria:

#### Automated Verification:
- [ ] `npm run build` passes
- [ ] `npm run lint` passes
- [ ] `grep -r "hover:bg-white/5" src/` returns zero results (excluding node_modules)

#### Manual Verification:
- [ ] Header nav items show subtle hover highlight in both modes
- [ ] Sidebar nav items show subtle hover highlight in both modes
- [ ] Brand buttons look correct in both modes
- [ ] Cards have appropriate shadow depth in both modes
- [ ] Select focus ring matches input focus ring (brand-colored)

---

## Phase 5: Auth Pages

### Overview
Auth pages (login, signup, reset-password, update-password) inherit tokens automatically but may need specific adjustments for their backdrop/card styling.

### Changes Required:

#### 1. Check auth layout
**File**: Find the auth layout file (likely `src/app/(auth)/layout.tsx`)
**Changes**: Ensure it uses semantic tokens. If it has any `bg-tech` or decorative backgrounds, they'll need the mode-aware treatment from Phase 3.

#### 2. Review login page card
**File**: `src/app/(auth)/login/page.tsx` (line 22)
**Changes**: Uses `bg-card/80 backdrop-blur` — this works in both modes via tokens. The `border-border/40` also works. No change expected, but verify visually.

#### 3. Review all auth pages
**Files**: `signup/page.tsx`, `reset-password/page.tsx`, `update-password/page.tsx`
**Changes**: Same pattern — verify they use semantic tokens. Fix any hardcoded values.

### Success Criteria:

#### Automated Verification:
- [ ] `npm run build` passes

#### Manual Verification:
- [ ] Login page looks good in light mode (card readable, inputs visible)
- [ ] Login page looks good in dark mode
- [ ] All auth pages (signup, reset, update) render correctly in both modes

---

## Phase 6: Dashboard & Client Pages

### Overview
Verify and fix all dashboard and client page-level components for dual-mode rendering. Most should work automatically via tokens, but some may have hardcoded dark-only patterns.

### Changes Required:

#### 1. Dashboard overview
**File**: `src/app/(app)/dashboard/page.tsx`
**Changes**: Uses `bg-surface-1`, `bg-brand/10`, `text-brand` — all token-based. Should work. Verify visually.

#### 2. Client list page
**File**: `src/app/(app)/dashboard/clients/page.tsx`
**Changes**: Uses `bg-surface-1`, `border-border/20`, `hover:bg-surface-2` — all token-based. Should work.

#### 3. Client detail layout + sidebar
**File**: `src/app/(app)/dashboard/clients/[id]/layout.tsx`
**Changes**: Uses `bg-surface-1`, `border-border/20` — token-based. Should work.

#### 4. Client profile page
**File**: `src/app/(app)/dashboard/clients/[id]/page.tsx`
**Changes**: Uses `bg-surface-2` for avatar fallback — should work.

#### 5. Deep thinking chat
**File**: `src/components/clients/deep-thinking-chat.tsx`
**Changes**: Uses `bg-surface-1`, `bg-surface-2`, `bg-brand/10`, `glass-strong` — mostly token-based. The `glass-strong` is fixed in Phase 3. Verify assistant/user bubble contrast in light mode.

#### 6. Client competitors
**File**: `src/components/clients/client-competitors.tsx`
**Changes**: Uses `bg-surface-1`, `border-border/20`, `hover:border-brand/30` — token-based.

#### 7. Client strategy
**File**: `src/components/clients/client-strategy.tsx`
**Changes**: Uses `border-brand/30`, `bg-surface-1` — token-based.

#### 8. Client personas
**File**: `src/components/clients/client-personas.tsx`
**Changes**: Uses `border-border/40` — should work.

#### 9. Client references
**File**: `src/components/clients/client-references.tsx`
**Changes**: Scan for any hardcoded dark-only values and fix them.

#### 10. Calendar page and tabs
**Files**: `src/app/(app)/dashboard/clients/[id]/calendar/page.tsx`, `src/components/clients/calendar-tabs.tsx`, `src/components/clients/client-calendar.tsx`
**Changes**: Calendar CSS in globals.css uses `color-mix()` with token vars — already mode-agnostic. Verify the visual output in light mode.

#### 11. Loading skeletons
**File**: `src/components/clients/loading-skeletons.tsx`
**Changes**: Uses `<Skeleton>` primitive — inherits skeleton styling. Verify it looks right in light mode.

#### 12. All remaining client section pages
**Files**: All pages under `src/app/(app)/dashboard/clients/[id]/` (feed, media, budget, audiences, suggestions, social-media-platforms, integrations, api-docs, logs, settings)
**Changes**: Scan each for hardcoded dark-only values. Most should be token-based.

#### 13. Modals
**Files**: `client-create-modal.tsx`, `client-schedule-modal.tsx`, `schedule-create-item-modal.tsx`, `schedule-post-editor-modal.tsx`, `schedule-post-detail-modal.tsx`
**Changes**: Modals using shadcn Dialog will inherit tokens. Any raw `fixed inset-0` overlay modals need their overlay background checked — ensure it uses `bg-surface-overlay` or similar.

### Success Criteria:

#### Automated Verification:
- [ ] `npm run build` passes
- [ ] `npm run lint` passes
- [ ] `grep -rn "oklch\|rgba\|#[0-9a-fA-F]\{3,6\}" src/components/ src/app/` — Only expected hits in: schedule-post-editor-modal (phone preview), globals.css utilities. No unexpected hardcoded colors in other files.

#### Manual Verification:
- [ ] Dashboard overview page looks correct in both modes
- [ ] Client list page — cards readable, hover effects visible in both modes
- [ ] Client detail sidebar — navigation items visible, active state clear in both modes
- [ ] Deep thinking chat — user/assistant bubbles distinguishable in both modes
- [ ] Calendar — events, headers, grid lines visible in both modes
- [ ] All modals — overlay darkens content, modal content readable in both modes
- [ ] Empty states — dashed borders and muted text visible in both modes
- [ ] Loading skeletons — shimmer effect visible in both modes

---

## Phase 7: Final Polish & QA

### Overview
Final pass to ensure consistency, fix edge cases, and verify the complete experience.

### Changes Required:

#### 1. Skeleton component check
**File**: `src/components/ui/skeleton.tsx`
**Changes**: Verify the skeleton shimmer uses semantic tokens. If it uses hardcoded muted values, update.

#### 2. Badge, Dialog, Sheet, Popover, Tooltip, Alert-Dialog, Progress, Switch, Table
**Files**: All shadcn ui/ components
**Changes**: Quick scan of each for any hardcoded dark-only values. Most shadcn components use semantic tokens by default.

#### 3. react-day-picker override check
**File**: `src/app/globals.css` (lines 200-218)
**Changes**: Uses `var(--brand)`, `var(--foreground)`, `var(--muted)` — already token-based. Verify visual output in light mode.

#### 4. Sonner toast check
**File**: `src/components/ui/sonner.tsx`
**Changes**: Verify toasts look correct in both modes. Sonner has built-in theme support — may need to pass `theme` prop.

#### 5. Update CLAUDE.md
**File**: `CLAUDE.md`
**Changes**: Update the "Design System" section to document:
- Light/dark/system mode support
- Warm violet-gray dark palette (hue ~285)
- Warm cream light palette (hue ~75)
- Theme toggle mechanism (cookie-based, same as locale)
- How to use `:is(.dark *)` pattern for mode-specific utility classes

### Success Criteria:

#### Automated Verification:
- [ ] `npm run build` passes
- [ ] `npm run lint` passes

#### Manual Verification:
- [ ] Full walkthrough in light mode: login → dashboard → client list → client detail → every section tab → calendar → deep thinking
- [ ] Full walkthrough in dark mode: same flow
- [ ] Toggle between modes on every page — no flash, no broken colors
- [ ] System mode respects OS preference
- [ ] Toast notifications look correct in both modes
- [ ] Tooltips, popovers, dropdowns look correct in both modes
- [ ] No invisible text, no unreadable contrast anywhere

---

## Testing Strategy

### Automated:
- `npm run build` — catches TypeScript errors and dead imports
- `npm run lint` — catches code quality issues
- `grep` for hardcoded color values to ensure token usage

### Manual Testing Steps:
1. Set OS to light mode → verify "System" default shows light UI
2. Set OS to dark mode → verify "System" default shows dark UI
3. Manually toggle to Light → verify full UI in light mode
4. Manually toggle to Dark → verify full UI in dark mode
5. Refresh page → verify preference persists
6. Navigate through every page in both modes
7. Test all interactive elements (modals, dropdowns, forms) in both modes

## Performance Considerations

- `backdrop-filter` (glass effects) is GPU-accelerated but expensive — keep to header + modals only
- `color-scheme` property improves native scrollbar/input rendering performance
- Cookie-based theme detection avoids layout shift (vs localStorage which requires JS)
- No additional JS bundle for theme — it's a small context provider

## Migration Notes

- Existing users with no `theme` cookie will get "system" mode (OS preference)
- The `className="dark"` removal means first-time light-mode users may see a brief layout shift on first load if their OS is in dark mode and the server defaults to no class. The `suppressHydrationWarning` + immediate useEffect toggle handles this.

## References

- Language switcher pattern: `src/components/i18n/language-switcher.tsx` — exact same cookie + refresh approach
- shadcn theming docs: https://ui.shadcn.com/docs/theming
- OKLCH color space: https://oklch.com/
- Evil Martians OKLCH guide: https://evilmartians.com/chronicles/oklch-in-css-why-quit-rgb-hsl
- Tailwind v4 custom variants: `@custom-variant dark (&:is(.dark *))` already defined at `globals.css:7`
