# Design System Strategy: Ethereal Precision

## 1. Overview & Creative North Star

### Creative North Star: "The Digital Curator"
This design system is built on the philosophy of **"Luminous Weightlessness."** Unlike traditional productivity tools that feel dense and utility-driven, this system treats the interface as a sophisticated gallery space. It is designed for "Craft AI"—an experience that feels curated, creative, and highly intentional.

We break the "standard app" mold by prioritizing **Negative Space as a Feature**. By using ultra-wide tracking, centered editorial layouts, and a "light-first" approach, we transform a simple AI interface into a premium, sophisticated workspace. The goal is to make the user feel like they are working within a soft, glowing canvas rather than a rigid software grid.

---

## 2. Colors & Surface Philosophy

The palette is a sophisticated blend of warm neutrals and ethereal highlights. It avoids pure blacks and harsh whites in favor of nuanced, organic tones.

### The "No-Line" Rule
**Borders are prohibited for structural sectioning.** To define hierarchy, use tonal shifts in the background. A `surface-container-low` section sitting on a `background` provides all the definition needed. If you feel the urge to draw a line, use a 32px gap instead.

### Surface Hierarchy & Nesting
Treat the UI as layers of fine paper.
*   **Base Layer:** `background` (#f8f9fa).
*   **Secondary Content:** `surface-container-low` (#f1f4f5).
*   **Active Elements/Cards:** `surface-container-lowest` (#ffffff).
*   **Nesting Logic:** An input field (`surface-container-lowest`) should sit inside a container (`surface-container-low`), creating a natural, soft inset look.

### The "Glass & Gradient" Rule
To capture the "Craft" essence, use the **Amber/Gold signature** (`secondary` #795a00 and its variants) not as a flat fill, but as a diffuse light source.
*   **Signature Glow:** Use a radial gradient behind primary actions: `secondary_fixed_dim` (#ffce5d) at 20% opacity, fading to 0% over 400px.
*   **Glassmorphism:** Floating menus or tooltips should use `surface` at 80% opacity with a `24px` backdrop-blur.

---

## 3. Typography: Editorial Authority

We use a dual-font strategy to balance character with functional clarity.

*   **Manrope (The Voice):** Used for Display, Headlines, and Titles. Its geometric yet warm curves convey a modern, "crafted" feel. 
    *   *Strategic Note:* Use `display-lg` (3.5rem) with `-0.04em` letter-spacing for high-end editorial impact.
*   **Inter (The Tool):** Reserved for Labels and small UI metadata. Its high legibility ensures that even at `label-sm` (0.6875rem), the interface remains functional.

**Hierarchy as Identity:** 
We use extreme scale contrast. A large, centered `headline-lg` paired with a tiny, widely-tracked `label-md` creates a "High-Fashion" typographic rhythm that feels premium and curated.

---

## 4. Elevation & Depth: Tonal Layering

Traditional drop shadows are too "heavy" for a lightweight AI brand. We use **Ambient Depth**.

*   **The Layering Principle:** Instead of shadows, use the elevation scale: `surface-container-low` -> `surface` -> `surface-bright`.
*   **Ambient Shadows:** For floating elements (like the main input box), use a "Weightless Shadow":
    *   `box-shadow: 0 20px 40px rgba(45, 51, 53, 0.04), 0 8px 16px rgba(45, 51, 53, 0.02);`
    *   The color is derived from `on-surface` (#2d3335) at extremely low opacities to mimic natural light.
*   **The Ghost Border:** If a container requires definition against a white background, use `outline-variant` (#adb3b5) at **15% opacity**. It should be felt, not seen.

---

## 5. Components

### Input Fields (The "Luminous Input")
The primary interface for AI interaction. 
*   **Style:** Large `xl` (1.5rem) rounded corners. Background: `surface-container-lowest`.
*   **States:** On focus, do not use a heavy border. Instead, apply a subtle glow using `secondary_fixed` (#ffdf9e) at 30% opacity as an outer spread.

### Buttons (The "Craft" CTA)
*   **Primary:** High contrast. `primary` (#605f5f) background with `on_primary` text. Use `full` (9999px) rounding for a friendly, modern feel.
*   **Secondary:** Ghost style. Transparent background with `on_surface` text. Hover state reveals a `surface-container-high` fill.

### Chips (Query Suggestions)
*   **Style:** `surface-container-lowest` background with a `Ghost Border` (10% `outline-variant`).
*   **Interaction:** On hover, shift the background to `secondary_container` (#ffdf9e) and add a subtle `2px` vertical lift.

### Cards & Lists
*   **Constraint:** Zero divider lines. 
*   **Separation:** Use `8px` of vertical space between list items. For cards, use a `surface-container-low` background to distinguish the card area from the main `surface`.

---

## 6. Do's and Don'ts

### Do
*   **Center Everything:** Use a generous, centered column (max-width: 800px) to maintain a focused, "Craft" feel.
*   **Embrace the Glow:** Use the amber/gold tokens (`secondary_fixed_dim`) as a soft radial background behind the main UI elements to mimic a "creative spark."
*   **Exaggerate White Space:** If a layout feels "busy," double the padding.

### Don't
*   **No Hard Borders:** Never use `100%` opaque borders or dividers. They shatter the ethereal aesthetic.
*   **No Pure Black:** Never use `#000000`. Use `on_surface` (#2d3335) for a softer, more sophisticated high-contrast look.
*   **No Tight Grids:** Avoid multi-column layouts that feel like a dashboard. Keep the journey linear and lightweight.