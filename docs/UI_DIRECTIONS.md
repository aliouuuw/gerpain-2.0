# UI Design Directions (Reference)

This document catalogs the aesthetic directions proposed for Gerpain's interface evolution. Each direction is designed to avoid generic "shadcn" aesthetics and establish a distinctive visual identity.

## Current Direction

**Warm Paper + Electric Neon**
- Typography: Fraunces (display) + Spline Sans (body)
- Palette: Warm cream backgrounds (#fbf4ea) with hot pink (#ff2d7a) and electric blue (#1b49ff) accents
- Motion: Hover lift effects, gradient shadows, reduced-motion support
- Status: Implemented in globals.css, Button, Card, Sidebar primitives

---

## Alternative Directions (Future Consideration)

### 1. Swiss Brutalist Ops Console
**Concept**: Hard grids, sharp rules, utilitarian but premium data interface
- **Palette**: Bone (#f6f2ea), ink (#0b0b10), hazard yellow (#ffd400), signal red (#ff3b30)
- **Typography**: Grotesk sans (IBM Plex Sans style) + mono for numbers
- **Signature Elements**: 
  - 2px thick borders
  - Tabular numbers everywhere
  - "Stamp" badges for status
  - Minimal motion (snap transforms only)
- **Best For**: Heavy data operations, warehouse management, industrial contexts

### 2. Neo-Noir Neon Signage
**Concept**: Deep lacquer backgrounds with cinematic neon glow
- **Palette**: Near-black violet (#090714), neon magenta, electric blue, acid green (#35ff9b)
- **Typography**: Sharp serif headlines + clean sans body
- **Signature Elements**:
  - Glowing focus rings
  - "Light leak" gradient overlays
  - Subtle noise texture
  - Parallax hover effects
- **Best For**: Night operations, premium positioning, tech-forward brand

### 3. Bauhaus Product System
**Concept**: Geometric forms, bold color blocks, playful but strict
- **Palette**: Cream (#fff3dc), primary red (#ff3b30), cobalt (#1b49ff), black (#111)
- **Typography**: Geometric sans (Futura/Avenir vibe)
- **Signature Elements**:
  - Circle/square icon motifs
  - Sliding panel transitions
  - Directional motion
- **Best For**: Creative industries, design-forward products, European market

### 4. Vintage Ledger / Artisan Receipt
**Concept**: Paper texture, ink stamps, artisan workshop aesthetic
- **Palette**: Paper (#fbf4ea), ink (#1a1625), stamp magenta, oxidized teal (#0ea5a4)
- **Typography**: Serif headlines + condensed sans for labels
- **Signature Elements**:
  - Dotted separators
  - "Validated" stamp graphics for statuses
  - Subtle paper grain texture
  - Print-style animations
- **Best For**: Bakery/craft positioning, artisanal brand story, heritage appeal

### 5. Citrus Industrial
**Concept**: Bold orange/black, industrial tagging system, chunky physical UI
- **Palette**: Charcoal (#0f0f12), safety orange (#ff6a3d), cream, steel (#9aa4b2)
- **Typography**: Heavy grotesk headlines + neutral sans body
- **Signature Elements**:
  - Offset shadows (like physical labels)
  - Thick non-uniform corner radii
  - "Tag" style badges
- **Best For**: Logistics, warehouse, delivery operations, B2B industrial

### 6. High-Fashion Editorial
**Concept**: Extreme whitespace, razor-thin rules, typographic hierarchy as UI
- **Palette**: Off-white (#fbfaf8), near-black (#0d0b12), single accent color
- **Typography**: High-contrast serif display + minimal sans UI
- **Signature Elements**:
  - Section titles do the visual heavy lifting
  - Razor-thin 1px rules
  - Slow, elegant transitions
  - Generous negative space
- **Best For**: Premium positioning, lifestyle brand, editorial content

---

## Selection Criteria

When choosing a direction, consider:

1. **Brand Story**: Does it match the bakery/food business narrative?
2. **User Context**: Desktop-heavy warehouse ops vs. mobile-first sales?
3. **Technical Constraints**: Animations, textures, gradients performance impact?
4. **Market Positioning**: Premium/luxury vs. accessible/utility?
5. **Dark Mode Needs**: Some directions (Neo-Noir) are inherently dark-first

## Implementation Notes

- All directions support CSS custom properties (design tokens)
- All include `prefers-reduced-motion` fallbacks
- Typography uses Google Fonts or system fallbacks for performance
- Color contrast meets WCAG AA standards in all proposed palettes

---

*Last updated: 2025-02-02*
