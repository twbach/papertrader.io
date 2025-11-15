# shadcn/ui Integration Documentation

## Overview

This project uses standard shadcn/ui components with a custom theme. Previously used RetroUI components are preserved in the codebase for easy rollback if needed.

**Current Setup:**
- **shadcn/ui**: Standard component library with custom theme (ACTIVE)
- **RetroUI**: Retro-styled components (PRESERVED for rollback, not currently used)

## Architecture

### Component Structure

```
apps/web/src/
├── components/
│   ├── ui/               # Standard shadcn/ui components (ACTIVE)
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── dialog.tsx
│   │   ├── input.tsx
│   │   ├── label.tsx
│   │   ├── radio-group.tsx
│   │   └── badge.tsx
│   ├── retroui/          # RetroUI components (PRESERVED, not active)
│   │   ├── Button.tsx
│   │   ├── Card.tsx
│   │   ├── Accordion.tsx
│   │   └── Text.tsx
│   └── options/          # Feature-specific components
├── styles/
│   └── retro-ui-theme.css  # shadcn theme CSS variables (HSL-based)
└── app/
    └── globals.css        # Global styles with theme imports
```

### Font Loading

The project uses the Geist Sans font (loaded via Next.js font optimization) with system font fallbacks.

Font utility classes are defined in `globals.css`:
- `.font-head` - Headings (Geist Sans)
- `.font-body` - Body text (Geist Sans)

### Theme System

The theme is defined in `apps/web/src/styles/retro-ui-theme.css` using HSL-based CSS variables:

**Core tokens:**
- `--background`, `--foreground` - Base colors
- `--card`, `--card-foreground` - Card backgrounds and text
- `--popover`, `--popover-foreground` - Popover/dropdown colors
- `--primary`, `--primary-foreground` - Primary action colors
- `--secondary`, `--secondary-foreground` - Secondary action colors
- `--muted`, `--muted-foreground` - Muted/subtle elements
- `--accent`, `--accent-foreground` - Accent highlights
- `--destructive`, `--destructive-foreground` - Destructive/error states
- `--border`, `--input`, `--ring` - Border, input, and focus ring colors
- `--radius` - Border radius value
- `--chart-1` through `--chart-5` - Chart color tokens
- `--sidebar-*` - Sidebar-specific tokens

Both light and dark mode variants are supported via the `.dark` class.

### Adding shadcn/ui Components

To add new standard shadcn/ui components:

```bash
cd apps/web
npx shadcn@latest add [component-name] --yes
```

Example:
```bash
npx shadcn@latest add dropdown-menu --yes
```

This installs components to `apps/web/src/components/ui/`

## Using Components

### Button

```tsx
import { Button } from '@/components/ui/button';

// Default (primary) button
<Button>Click me</Button>

// Variants
<Button variant="secondary">Secondary</Button>
<Button variant="outline">Outline</Button>
<Button variant="destructive">Destructive</Button>
<Button variant="ghost">Ghost</Button>
<Button variant="link">Link</Button>

// Sizes
<Button size="sm">Small</Button>
<Button size="default">Default</Button>
<Button size="lg">Large</Button>
<Button size="icon">Icon</Button>
```

### Card

```tsx
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';

// Full card with all parts
<Card>
  <CardHeader>
    <CardTitle>Title</CardTitle>
    <CardDescription>Description</CardDescription>
  </CardHeader>
  <CardContent>
    Content here
  </CardContent>
  <CardFooter>
    Footer content
  </CardFooter>
</Card>

// Simple card
<Card className="p-6">
  Simple content
</Card>
```

### Dialog

```tsx
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';

<Dialog open={open} onOpenChange={setOpen}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Title</DialogTitle>
      <DialogDescription>Description</DialogDescription>
    </DialogHeader>
    <div>Dialog content</div>
    <DialogFooter>
      <Button>Action</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

### Other Components

```tsx
// Input
import { Input } from '@/components/ui/input';
<Input placeholder="Enter text..." />

// Label
import { Label } from '@/components/ui/label';
<Label htmlFor="field">Label</Label>

// Badge
import { Badge } from '@/components/ui/badge';
<Badge>Badge</Badge>
<Badge variant="secondary">Secondary</Badge>
<Badge variant="outline">Outline</Badge>
<Badge variant="destructive">Destructive</Badge>

// Radio Group
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
<RadioGroup value={value} onValueChange={setValue}>
  <div className="flex items-center space-x-2">
    <RadioGroupItem value="option1" id="option1" />
    <Label htmlFor="option1">Option 1</Label>
  </div>
</RadioGroup>
```

## Theme Customization

### Current Theme

The theme uses HSL color values for better color manipulation. Edit `apps/web/src/styles/retro-ui-theme.css`:

```css
@layer base {
  :root {
    --background: 338.2 0% 100%;           /* White background */
    --foreground: 233.3 27.3% 12.9%;       /* Dark blue-gray text */
    --primary: 229.3 109.3% 66.6%;         /* Bright blue */
    --primary-foreground: 233.9 84.3% 4.9%; /* Very dark blue */
    --secondary: 334.3 0% 90.9%;           /* Light gray */
    --destructive: 357.2 125.9% 71%;       /* Red/pink */
    --border: 233.3 27.3% 42.9%;           /* Medium blue-gray */
    --input: 233.3 27.3% 42.9%;            /* Same as border */
    --ring: 229.3 109.3% 66.6%;            /* Same as primary */
    /* ... more tokens */
  }

  .dark {
    --background: 338.2 10% 10%;           /* Dark background */
    --foreground: 233.3 37.3% 87.1%;       /* Light text */
    --primary: 229.3 100% 33.4%;           /* Darker blue */
    /* ... more tokens */
  }
}
```

### HSL Format and Tailwind v4 Integration

Colors are defined in HSL format without the `hsl()` wrapper:
- Format: `HUE SATURATION% LIGHTNESS%`
- Example: `229.3 109.3% 66.6%` = `hsl(229.3, 109.3%, 66.6%)`

**Important:** For Tailwind v4 to recognize these colors, they must be mapped in `globals.css` using the `@theme` directive with OKLCH conversion:

```css
@theme inline {
  --color-card: oklch(from hsl(var(--card)) l c h);
  --color-card-foreground: oklch(from hsl(var(--card-foreground)) l c h);
  --color-primary: oklch(from hsl(var(--primary)) l c h);
  /* ... other colors */
}
```

This converts the HSL values from `retro-ui-theme.css` into the OKLCH color space that Tailwind v4 uses internally, allowing utilities like `bg-card`, `text-primary`, etc. to work correctly.

### Dark Mode

To enable dark mode, add the `dark` class to the `<html>` element in `layout.tsx`:

```tsx
<html lang="en" className="dark">
```

## ag-grid Theming

The ag-grid is styled using the custom theme via CSS variables. The theme class is `ag-theme-retro`.

### Current Implementation

The `OptionsTable` component uses:

- **Background**: `var(--card)` and `var(--background)` for alternating rows
- **Text**: `var(--foreground)` and `var(--card-foreground)`
- **Borders**: `var(--border)` with 2px solid borders
- **Accent**: `var(--accent)` for ATM (at-the-money) strike highlighting
- **Destructive**: `var(--destructive)` for put option prices

### Customizing ag-grid Styles

Edit the `<style jsx global>` block in `OptionsTable.tsx`:

```tsx
<style jsx global>{`
  .ag-theme-retro {
    background-color: var(--card);
    font-family: 'Minecraft', Arial, sans-serif;
  }
  .ag-theme-retro .ag-header {
    background-color: var(--background);
    color: var(--foreground);
    border-bottom: 2px solid var(--border);
  }
  /* Add more customizations */
`}</style>
```

## Best Practices

### 1. Always Use Theme Variables

❌ **Don't** use hardcoded colors:
```tsx
<div className="bg-[#2d2d2d] text-[#f0f0f0]">
```

✅ **Do** use theme variables:
```tsx
<div className="bg-card text-card-foreground">
```

### 2. Component Imports

Always import from the `ui` directory:
```tsx
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
```

### 3. Typography

The project uses Geist Sans font (via Next.js font optimization):
```tsx
<h1 className="text-primary font-bold">Title</h1>
<p className="text-foreground">Body text</p>
```

### 4. Spacing and Layout

Use Tailwind utilities with theme-aware colors:
```tsx
<Card className="p-6 bg-card border-2 border-border">
  Content
</Card>
```

## Dependencies

### Required Packages

- `@radix-ui/react-accordion` - Accordion component primitives
- `@radix-ui/react-icons` - Icon components
- `@radix-ui/react-slot` - Slot component for composition
- `class-variance-authority` - Variant management
- `clsx` - Conditional class names
- `tailwind-merge` - Merge Tailwind classes

### Installation

All dependencies are managed via `pnpm`:

```bash
cd apps/web
pnpm install  # Install dependencies after adding new components
```

## Migration History

### From RetroUI to shadcn/ui (November 2024)

The project migrated from RetroUI to standard shadcn/ui components:

**Changes:**
- Installed standard shadcn/ui components to `apps/web/src/components/ui/`
- Updated all imports from `@/components/retroui/*` to `@/components/ui/*`
- Updated theme to use HSL-based color values
- Preserved RetroUI components for easy rollback

**Import changes:**
```tsx
// Old (RetroUI)
import { Card } from '@/components/retroui/Card';
import { Button } from '@/components/retroui/Button';

// New (shadcn/ui)
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
```

**Component structure changes:**
```tsx
// Old (RetroUI Card)
<Card>
  <Card.Header>
    <Card.Title>Title</Card.Title>
  </Card.Header>
</Card>

// New (shadcn Card)
<Card>
  <CardHeader>
    <CardTitle>Title</CardTitle>
  </CardHeader>
</Card>
```

**Rollback Instructions:**
If you need to revert to RetroUI components:
1. Change imports from `@/components/ui/*` back to `@/components/retroui/*`
2. Update Card usage from `CardHeader` to `Card.Header` pattern
3. Update Dialog usage from separate exports to `Dialog.Content` pattern
4. Files have rollback comments at the top

### From pixel-retroui to RetroUI (Earlier)

Previously migrated from `pixel-retroui` npm package to RetroUI shadcn components.

## Troubleshooting

### Components Not Styled Correctly

1. Ensure `retro-ui-theme.css` is imported in `globals.css`
2. Check that CSS variables are defined in the theme file
3. Verify Tailwind is configured correctly in `components.json`

### Background Colors Not Working (Transparent Components)

**Symptom:** Components like Dialog appear transparent or don't show background colors even with `bg-card` class.

**Cause:** Tailwind v4 requires color variables to be properly mapped in the `@theme` directive with OKLCH conversion.

**Solution:** Ensure all theme colors are mapped in `globals.css`:

```css
@theme inline {
  --color-background: oklch(from hsl(var(--background)) l c h);
  --color-foreground: oklch(from hsl(var(--foreground)) l c h);
  --color-card: oklch(from hsl(var(--card)) l c h);
  --color-card-foreground: oklch(from hsl(var(--card-foreground)) l c h);
  --color-primary: oklch(from hsl(var(--primary)) l c h);
  --color-border: oklch(from hsl(var(--border)) l c h);
  /* ... all other theme colors */
}
```

Without this conversion, Tailwind v4 cannot resolve utilities like `bg-card`, `text-primary`, etc.

### TypeScript Errors

Run type checking:
```bash
cd apps/web
pnpm ts:check
```

### ag-grid Not Themed

1. Ensure the theme class is `ag-theme-retro`
2. Check that CSS variables are accessible in the component scope
3. Verify the `<style jsx global>` block is present

## Custom Dialog Implementation

Note: The `AddLegDialog` component uses a custom portal-based dialog implementation instead of the standard shadcn Dialog component. This was done to provide more control over the modal behavior and styling.

## Resources

- [shadcn/ui Documentation](https://ui.shadcn.com/)
- [Radix UI Primitives](https://www.radix-ui.com/primitives)
- [Tailwind CSS v4](https://tailwindcss.com/docs)
- [RetroUI Components](https://www.retroui.dev/themes) (for reference only)

## File Reference

- **Theme**: `apps/web/src/styles/retro-ui-theme.css`
- **Global Styles**: `apps/web/src/app/globals.css`
- **Active Components**: `apps/web/src/components/ui/`
- **Preserved Components**: `apps/web/src/components/retroui/` (for rollback)
- **shadcn Config**: `apps/web/components.json`

