# RetroUI + shadcn + ag-grid Integration Documentation

## Overview

This project integrates three UI libraries to create a cohesive retro-styled interface:

- **shadcn/ui**: Component architecture and structure
- **RetroUI**: Retro-styled component themes compatible with shadcn
- **ag-grid**: Data grid component styled to match the retro aesthetic

## Architecture

### Component Structure

```
apps/web/src/
├── components/
│   ├── retroui/          # RetroUI shadcn components
│   │   ├── Button.tsx
│   │   ├── Card.tsx
│   │   ├── Accordion.tsx
│   │   └── Text.tsx
│   └── options/          # Feature-specific components
├── styles/
│   └── retro-ui-theme.css  # RetroUI theme CSS variables
└── app/
    └── globals.css        # Global styles with theme imports
```

### Font Loading

The project uses the Geist Sans font (loaded via Next.js font optimization) with system font fallbacks. Component styles from pixel-retroui have been removed in favor of RetroUI shadcn components.

Font utility classes are defined in `globals.css`:
- `.font-head` - Used by RetroUI components for headings (Geist Sans)
- `.font-body` - Used by RetroUI components for body text (Geist Sans)

### Theme System

The theme is defined in `apps/web/src/styles/retro-ui-theme.css` using CSS variables:

- **Colors**: `--primary`, `--secondary`, `--background`, `--foreground`, `--card`, `--muted`, `--accent`, `--destructive`
- **Borders**: `--border`, `--radius`
- **Hover states**: `--primary-hover`, `--secondary-hover`

Both light and dark mode variants are supported via the `.dark` class.

## Adding New RetroUI Components

To add a new RetroUI component:

1. **Find the component URL** on [retroui.dev](https://www.retroui.dev/themes)
2. **Add via shadcn CLI**:
   ```bash
   cd apps/web
   npx shadcn@latest add https://retroui.dev/r/[component-name].json --yes
   ```
3. **Components are installed** to `apps/web/src/components/retroui/`
4. **Import and use** in your components:
   ```tsx
   import { ComponentName } from '@/components/retroui/ComponentName';
   ```

### Example: Adding an Input Component

```bash
cd apps/web
npx shadcn@latest add https://retroui.dev/r/input.json --yes
```

Then use it:

```tsx
import { Input } from '@/components/retroui/Input';

<Input placeholder="Enter text..." />
```

## Using Components

### Button

```tsx
import { Button } from '@/components/retroui/Button';

// Default (primary) button
<Button>Click me</Button>

// Secondary button
<Button variant="secondary">Secondary</Button>

// Outline button
<Button variant="outline">Outline</Button>

// Link button
<Button variant="link">Link</Button>

// Sizes
<Button size="sm">Small</Button>
<Button size="md">Medium</Button>
<Button size="lg">Large</Button>
```

### Card

```tsx
import { Card } from '@/components/retroui/Card';

// Basic card
<Card className="p-6 bg-card">
  <Card.Header>
    <Card.Title>Title</Card.Title>
    <Card.Description>Description</Card.Description>
  </Card.Header>
  <Card.Content>
    Content here
  </Card.Content>
</Card>

// Simple card
<Card className="p-4 bg-card">
  Simple content
</Card>
```

### Accordion

```tsx
import { Accordion } from '@/components/retroui/Accordion';

<Accordion type="single" collapsible>
  <Accordion.Item value="item-1">
    <Accordion.Header>
      <Accordion.Trigger>Item 1</Accordion.Trigger>
    </Accordion.Header>
    <Accordion.Content>
      Content for item 1
    </Accordion.Content>
  </Accordion.Item>
</Accordion>
```

## Theme Customization

### Modifying Colors

Edit `apps/web/src/styles/retro-ui-theme.css`:

```css
:root {
    --primary: #ffdb33;           /* Primary yellow */
    --primary-hover: #ffcc00;     /* Darker yellow on hover */
    --secondary: #000;             /* Black */
    --background: #fff;            /* White background */
    --foreground: #000;             /* Black text */
    --card: #fff;                  /* Card background */
    --card-foreground: #000;       /* Card text */
    --muted: #cccccc;             /* Muted gray */
    --accent: #fae583;            /* Accent yellow */
    --destructive: #e63946;        /* Red for errors */
    --border: #000;                /* Black borders */
}
```

### Dark Mode

Dark mode variables are defined in the `.dark` class:

```css
.dark {
    --background: #1a1a1a;
    --foreground: #f5f5f5;
    --card: #242424;
    /* ... */
}
```

To enable dark mode, add the `dark` class to the `<html>` element in `layout.tsx`.

## ag-grid Theming

The ag-grid is styled using the RetroUI theme via CSS variables. The theme class is `ag-theme-retro`.

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

Always import from the `retroui` directory:
```tsx
import { Button } from '@/components/retroui/Button';
import { Card } from '@/components/retroui/Card';
```

### 3. Typography

The project uses Geist Sans font by default. RetroUI components automatically use the correct font via `font-head` and `font-body` classes:
```tsx
<h1 className="text-primary">Title</h1>
```

### 4. Spacing and Layout

Use Tailwind utilities with theme-aware colors:
```tsx
<Card className="p-6 bg-card border-2 border-border">
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

All dependencies are managed via `pnpm`. To add a new RetroUI component:

```bash
cd apps/web
pnpm install  # Install any new dependencies added by shadcn
```

## Migration from pixel-retroui

The project has been migrated from `pixel-retroui` to RetroUI shadcn components:

1. **Component styles removed**: `pixel-retroui/dist/index.css` is no longer imported
2. **Fonts removed**: Minecraft font has been replaced with Geist Sans (via Next.js font optimization)
3. **Component imports replaced**:
   ```tsx
   // Old
   import { Card, Button } from 'pixel-retroui';
   
   // New
   import { Card } from '@/components/retroui/Card';
   import { Button } from '@/components/retroui/Button';
   ```

4. **Props updated**:
   ```tsx
   // Old
   <Card bg="#2d2d2d" className="p-6">
   
   // New
   <Card className="p-6 bg-card">
   ```

5. **Button variants**:
   ```tsx
   // Old
   <Button bg="#fbbf24" textColor="#1a1a1a">
   
   // New
   <Button variant="default" size="lg">
   ```

### Removing pixel-retroui Package

The `pixel-retroui` package can be removed from `package.json` as it's no longer used. All fonts are now handled via Next.js font optimization (Geist Sans).

## Troubleshooting

### Components Not Styled Correctly

1. Ensure `retro-ui-theme.css` is imported in `globals.css`
2. Check that CSS variables are defined in the theme file
3. Verify Tailwind is configured correctly in `components.json`

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

## Resources

- [RetroUI Components](https://www.retroui.dev/themes)
- [shadcn/ui Documentation](https://ui.shadcn.com/)
- [ag-grid Documentation](https://www.ag-grid.com/)
- [Tailwind CSS v4](https://tailwindcss.com/docs)

## File Reference

- Theme: `apps/web/src/styles/retro-ui-theme.css`
- Global Styles: `apps/web/src/app/globals.css`
- Components: `apps/web/src/components/retroui/`
- shadcn Config: `apps/web/components.json`

