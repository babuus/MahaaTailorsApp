# Logo Component

The Logo component provides a reusable branding element for the Mahaa Tailors mobile app with support for different variants, sizes, and theme adaptation.

## Features

- **Multiple Variants**: Full logo, compact version, and icon-only
- **Animated Text**: "tailors" alternates with "designers" every 3 seconds in full variant
- **Theme Support**: Automatically adapts to light/dark themes
- **Responsive Sizing**: Small, medium, and large size options
- **TypeScript Support**: Fully typed with proper interfaces

## Usage

### Basic Usage

```tsx
import { Logo } from '../components';

// Full logo with animation (header context)
<Logo variant="full" size="medium" animated={true} />

// Compact logo (sidebar context)
<Logo variant="compact" size="medium" />

// Icon only (small spaces)
<Logo variant="icon" size="small" />
```

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `variant` | `'full' \| 'compact' \| 'icon'` | `'full'` | Logo variant to display |
| `size` | `'small' \| 'medium' \| 'large'` | `'medium'` | Size of the logo |
| `animated` | `boolean` | `false` | Enable text animation (full variant only) |
| `style` | `ViewStyle` | `undefined` | Additional styles to apply |
| `context` | `'header' \| 'content' \| 'sidebar'` | `'content'` | Context for proper color visibility |

### Variants

#### Full Logo (`variant="full"`)
- Displays "Mahaa tailors" with optional animation
- Features elegant gradient-like underline below "Mahaa" matching web application design
- Best for headers and main branding areas
- Animation switches "tailors" ↔ "designers" with 3+ seconds display time and quick transitions
- Underline color adapts to context (white for header/sidebar, theme colors for content)

#### Compact Logo (`variant="compact"`)
- **Sidebar Context**: Not used (sidebar header completely removed)
- **Other Contexts**: Shows "M TAILORS" with design hierarchy
- "M" uses the same serif font as the full logo for brand consistency
- "TAILORS" uses sans-serif with proper spacing
- Perfect for non-sidebar contexts and limited space
- No animation, clean and simple

#### Icon Logo (`variant="icon"`)
- Shows only the "M" letter
- Ideal for very small spaces like tabs or buttons
- Circular container styling

### Sizes

- **Small**: 16px primary text, suitable for inline usage
- **Medium**: 24px primary text, good for headers
- **Large**: 32px primary text, perfect for splash screens

### Context-Aware Colors

The Logo component automatically adjusts colors based on context for optimal visibility:

- **Header Context** (`context="header"`):
  - Light theme: Dark text for visibility against white header background
  - Dark theme: White text for visibility against dark header background
  
- **Sidebar Context** (`context="sidebar"`):
  - "Mahaa" = white (`#ffffff`)
  - "tailors/designers" = light gray (`#e0e0e0`)
  - Optimized for dark sidebar backgrounds
  
- **Content Context** (`context="content"` - default):
  - **Light Theme**: "Mahaa" = `#2c3e50`, "tailors/designers" = `#8b4513`
  - **Dark Theme**: "Mahaa" = `#ffffff`, "tailors/designers" = `#d4af37`
  - Matches web application colors exactly

### Examples

```tsx
// Header logo with animation (white text for visibility)
<Logo 
  variant="full" 
  size="medium" 
  animated={true}
  context="header"
  style={{ marginBottom: 16 }}
/>

// Sidebar logo (optimized for dark backgrounds)
<Logo 
  variant="compact" 
  size="medium"
  context="sidebar"
  style={{ alignSelf: 'center' }}
/>

// Content area logo (uses web app colors)
<Logo 
  variant="full" 
  size="large"
  animated={true}
  context="content"
  style={{ marginBottom: 24 }}
/>

// Small icon for tabs
<Logo 
  variant="icon" 
  size="small"
  context="content"
/>
```

## Implementation Notes

- Uses React Native's `Animated` API for smooth text transitions
- Leverages React Native Paper's theme system for consistent styling
- Includes proper accessibility support
- Optimized for performance with minimal re-renders
- Integrates with custom theme context for user-selectable themes
- Supports light, dark, and system default theme modes