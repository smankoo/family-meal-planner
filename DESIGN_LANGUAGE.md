# Family Meal Planner - Design Language

## Design Philosophy

The Family Meal Planner embodies **Apple-inspired sophistication**: clean, elegant, and delightful. Every interaction should feel smooth and intentional. Nothing appears or disappears abruptly—everything flows.

---

## Core Principles

### 1. Sophistication Through Simplicity
We achieve elegance by removing the unnecessary. Clean interfaces with generous whitespace let content breathe. Every element serves a purpose.

### 2. Smooth, Delightful Motion
Motion creates continuity and delight:
- Content streams in as it's generated, never appearing suddenly
- Hover states provide immediate, subtle feedback
- Transitions are smooth and purposeful (200-300ms)
- Loading states are elegant, never jarring

### 3. Consistent Across Contexts
Whether on a phone or desktop, the experience feels unified:
- Colors, typography, and button styles remain constant
- Layouts adapt intelligently to available space
- Touch-friendly on mobile, hover-enhanced on desktop
- Same visual language everywhere

### 4. Depth Through Layers
We create visual hierarchy through sophisticated glassmorphism:
- **Frosted glass effects** for all floating elements (modals, dropdowns, sticky headers)
- **Multiple opacity levels**: 70% for subtle backgrounds, 85-90% for primary surfaces, 95% for modals
- **Backdrop blur variations**: xs (4px), sm (8px), md (12px), lg (16px), xl (20px)
- **Layered borders**: White borders with 30-50% opacity create depth without harsh lines
- **Soft shadows** that suggest elevation without harshness
- **Subtle ring effects** (ring-1 ring-black/5) add definition to glass surfaces
- **Gradient overlays** on meal cards combine with glass for warmth

**Glass Effect Formula**: `bg-white/[opacity] backdrop-blur-[size] border border-white/[opacity] shadow-[type]`

### 5. Resilient & Forgiving
The app gracefully handles the unexpected:
- Clear, friendly error messages with actionable solutions
- Retry mechanisms always available
- Streaming falls back to batch if needed
- Technical details available but not prominent

---

## Visual Language

### Color Philosophy
**Neutral Foundation**: A sophisticated zinc-based neutral scale provides the foundation. It's neither too warm nor too cold—just right for a modern, timeless feel.

**Accent Sparingly**: Indigo accents highlight important changes and interactive moments. Use restraint—accents are most effective when rare.

**Semantic Clarity**: Colors communicate meaning:
- Green for success and completion
- Red for errors and destructive actions
- Amber for warnings and attention
- Blue for information

### Typography Philosophy
**Inter Font Family**: Clean, modern, highly legible at all sizes. Professional without being corporate.

**Hierarchy Through Weight & Size**:
- Bold, large text for hero moments
- Uppercase, tracked labels for section headers
- Regular weight for comfortable reading
- Consistent line-height for rhythm

### Spacing Philosophy
**Generous Whitespace**: Don't be afraid of empty space. It creates breathing room and sophistication.

**Consistent Rhythm**: Use a 4px base unit. Spacing should feel predictable and harmonious throughout the app.

### Shape Philosophy
**Rounded, Friendly**: Large border radius (12-24px) creates approachable, modern interfaces. Circular elements (buttons, avatars) add softness.

**Hierarchy Through Size**: Larger containers get larger radius. Small buttons stay subtle with smaller radius.

---

## Interaction Patterns

### Hover States
Desktop users expect feedback. Provide it subtly:
- Slight elevation (shadow increase)
- Subtle color shift (one shade darker)
- Gentle scale (105% for floating buttons)
- Never jarring or aggressive

### Active/Press States
Tactile feedback matters:
- Scale down slightly (95-98%) on press
- Immediate response to touch/click
- Return smoothly to rest state

### Loading States
Show progress elegantly:
- Skeleton loaders during initial load
- Spinning icons (not text) for in-progress actions
- Soft pulsing for streaming content
- Never block the entire UI unless necessary

### Streaming Content
The app's signature feature:
- Content animates in as it arrives from the LLM
- Bouncy entrance animation (stream-in)
- Each item animates once, never re-animates
- Creates sense of real-time generation

---

## Component Families

### Buttons
**Hierarchy**:
- Primary (dark): Main actions, high emphasis
- Secondary (light): Alternative actions, medium emphasis
- Ghost (minimal): Tertiary actions, low emphasis
- Icon-only (circular): Compact actions, utility

**States**: All buttons have hover, active, disabled, and loading states.

### Cards
**Variants**:
- Standard: Solid white with subtle shadow
- Glass: Frosted glass effect for floating elements
- Interactive: Lift on hover, clickable

**Consistency**: All cards use the same border radius and padding scale.

### Modals & Overlays
**Structure**:
- Backdrop blur creates focus
- Glassmorphic container feels modern
- Header with title and close button
- Content area with comfortable padding
- Action buttons at bottom (if needed)

**Behavior**:
- Animate in from center (scale + fade)
- Escape key closes
- Click outside closes
- Prevent body scroll when open

### Forms
**Philosophy**: Forms should feel effortless.
- Clear labels above inputs
- Generous input height (touch-friendly)
- Focus states are obvious but not garish
- Validation is helpful, not punishing

### Navigation
**Stage Stepper**: Pill-style navigation shows current stage and available stages. Disabled stages are clearly indicated but not hidden.

**Floating Actions**: Primary actions float at the bottom for easy thumb access on mobile.

---

## Responsive Strategy

### Mobile First
Design for mobile, enhance for desktop:
- Single column layouts
- Full-width elements
- Sticky headers with backdrop blur
- Bottom-anchored actions
- Large touch targets (minimum 44px)

### Desktop Enhancement
Use additional space wisely:
- Multi-column grids (2-4 columns)
- Horizontal layouts where appropriate
- Hover states become prominent
- Max-width containers prevent excessive line length

### Consistency Across Breakpoints
Layouts change, but visual language doesn't:
- Same button colors and styles
- Same typography scale
- Same border radius and shadows
- Same animation timing

---

## Animation Guidelines

### Timing
- **Fast (200ms)**: Hover states, focus changes
- **Base (300ms)**: Modals, dropdowns, standard transitions
- **Slow (500ms)**: Page transitions, major state changes
- **Streaming (600ms)**: Content appearing during generation

### Easing
- **Ease-out**: Entrances (decelerate at end)
- **Ease-in**: Exits (accelerate at end)
- **Ease-in-out**: Bidirectional transitions

### Signature Animations
- **Stream-in**: Bouncy entrance for generated content
- **Fade-in-up**: Elegant page transitions
- **Slide-in-right**: Toast notifications
- **Pulse-soft**: Gentle loading indicator

---

## Accessibility

### Non-Negotiables
- High contrast text (AAA when possible)
- Visible focus states on all interactive elements
- Keyboard navigation throughout
- Semantic HTML structure
- ARIA labels for icon-only buttons

### Progressive Enhancement
- Works without JavaScript for core content
- Respects prefers-reduced-motion
- Supports keyboard-only navigation
- Screen reader friendly

---

## Content Guidelines

### Voice & Tone
- **Friendly but not casual**: Professional warmth
- **Clear but not robotic**: Human, conversational
- **Helpful but not condescending**: Respectful of user intelligence

### Error Messages
- Explain what happened in plain language
- Suggest what to do next
- Provide technical details if helpful
- Always offer a way forward (retry, contact support)

### Empty States
- Explain why it's empty
- Guide user to first action
- Make it feel like an opportunity, not a failure

---

## Design Tokens Reference

All visual properties are defined in `index.css` as CSS variables and Tailwind theme extensions. Designers should reference these tokens rather than hardcoded values:

**Colors**: `--color-primary-*`, `--color-accent-*`
**Spacing**: `--spacing-card`, `--spacing-section`
**Radius**: `--radius-card`, `--radius-button`, `--radius-input`, `--radius-modal`
**Shadows**: `--shadow-card`, `--shadow-card-hover`, `--shadow-modal`, `--shadow-float`
**Typography**: `--font-weight-*`
**Transitions**: `--transition-fast`, `--transition-base`, `--transition-slow`

**Tailwind Classes**: Use semantic classes defined in the theme system:
- **Buttons**: `btn-primary`, `btn-secondary`, `btn-glass`, `btn-glass-primary`, `btn-regenerate`, `btn-empty-state`, `btn-save-floating`, `btn-close-modal`, `btn-retry-modal`, `btn-icon`, `btn-icon-sm`, `btn-delete-hover`
- **Cards**: `card`, `card-glass`, `card-glass-light`, `card-glass-medium`, `card-glass-subtle`, `card-interactive-glass`, `family-member-card`, `preferences-card`
- **Meal Cards**: `meal-card-breakfast`, `meal-card-lunch`, `meal-card-snack`, `meal-card-dinner` (with built-in glassmorphism + dark mode)
- **Meal Type Pills**: `meal-type-pill meal-type-pill-breakfast`, `meal-type-pill-lunch`, `meal-type-pill-snack`, `meal-type-pill-dinner`
- **Modals**: `modal-backdrop`, `modal-container`, `modal-header`, `error-icon-wrapper`, `error-detail-box`, `error-support-box`
- **Lists**: `list-item-glass` for list items with frosted glass effect
- **Headers**: `sticky-header-mobile` for sticky section headers with glassmorphism
- **Typography**: `heading-hero`, `heading-page`, `heading-section`, `heading-card`, `label-section`, `label-category`, `text-body`, `text-secondary`
- **Forms**: `form-field`, `form-field-bold`, `form-textarea`, `form-textarea-wrapper`, `effort-toggle`, `effort-toggle-active`, `effort-toggle-inactive`
- **Empty States**: `empty-state-icon-wrapper`, `empty-state-heading`, `empty-state-text`
- **Progress**: `progress-bar-container`, `progress-bar-fill`, `progress-bar-fill-amber`
- **Checkboxes**: `checkbox-enhanced`, `checkbox-checked`, `checkbox-unchecked`
- **Related Meals**: `related-meal-pill`, `related-meal-pill-checked`
- **User Menu**: `user-menu-trigger`, `user-menu-dropdown`, `user-menu-info`, `user-menu-item`, `user-menu-footer`
- **Avatars**: `avatar-fallback`
- **Skeletons**: `skeleton-shimmer`, `skeleton-block`, `skeleton-block-light`
- **Animations**: `stagger-item`, `stage-enter`, `strikethrough-animate`
- **Navigation**: `stage-stepper`, `stage-stepper-tab`, `stage-stepper-tab-active`, `stage-stepper-tab-idle`, `stage-stepper-tab-disabled`
- **Utilities**: `loading-pill`, `auth-divider-text`, `theme-toggle`, `section-divider`

**Glassmorphism Utilities**:
- `backdrop-blur-xs` (4px), `backdrop-blur-sm` (8px), `backdrop-blur-md` (12px), `backdrop-blur-lg` (16px), `backdrop-blur-xl` (20px)
- Use CSS var surfaces: `var(--surface-glass)`, `var(--surface-glass-heavy)`, `var(--surface-elevated)`
- Add `border: 1px solid var(--border-subtle)` for subtle definition
- Include `ring-1 ring-black/5` for refined edges

---

## Dark Mode

The app supports light, dark, and system-preference themes via `ThemeContext`. The implementation uses Tailwind's `class` strategy — a `.dark` class on `<html>` flips all CSS custom properties.

### How It Works
- All colors are defined as CSS custom properties in `:root` (light) and `.dark` (dark)
- The `.dark` class inverts the primary color scale (50↔900) so `text-primary-900` is always the strongest text
- Surface tokens (`--surface-bg`, `--surface-primary`, `--surface-secondary`, `--surface-elevated`, `--surface-glass`) adapt automatically
- Text tokens (`--text-primary`, `--text-secondary`, `--text-tertiary`, `--text-inverted`) flip for readability
- Shadow tokens increase opacity in dark mode for visibility against dark backgrounds
- Meal card gradients have explicit `.dark` overrides for warm, rich tones

### Rules for Dark Mode Compatibility
1. **Never use raw Tailwind colors** like `bg-white`, `bg-zinc-50`, `text-zinc-900` — use semantic tokens (`bg-primary-50`, `text-primary-900`) or CSS vars (`var(--surface-primary)`)
2. **Use CSS classes from index.css** — all component classes (`card`, `btn-primary`, `modal-container`, etc.) already handle both themes
3. **For new components**, add styles to `index.css` using CSS vars, then reference the class name
4. **Avatar borders** should use `var(--surface-bg)` instead of `border-white` for proper contrast in dark mode
5. **The ThemeToggle component** provides the UI control — it's placed in the app header

### Theme Toggle
- `ThemeToggle` component renders a sun/moon icon button
- `ThemeProvider` wraps the app and manages `localStorage` persistence
- System preference changes are detected via `matchMedia('prefers-color-scheme: dark')`

---

## Motion & Animation Enhancements

### Staggered Entrance Animations
Cards and list items use the `stagger-item` class with incremental `animationDelay` to create a cascading entrance effect. Each item fades in and slides up with a slight scale.

### Page/Stage Transitions
Stage changes (Meal Planning → Prep → Grocery) use the `stage-enter` class with a `key` prop to trigger re-animation on stage switch.

### Check-off Micro-interactions
Checkboxes use `checkbox-enhanced` with `checkbox-checked`/`checkbox-unchecked` states. The checked state triggers a satisfying bounce animation (`checkBounce`). Completed items get a strikethrough with emerald accent.

### Progress Indicators
The `ProgressBar` component shows completion state on Prep and Grocery views with an animated fill bar and count display.

---

## Implementation Notes for Designers

### When Designing New Components

1. **Start with existing patterns**: Check if a similar component exists
2. **Use the theme system**: Reference CSS variables and Tailwind classes
3. **Consider all states**: Rest, hover, active, focus, disabled, loading
4. **Design for mobile first**: Then enhance for larger screens
5. **Add motion**: How does it enter? Exit? Respond to interaction?
6. **Test accessibility**: Can you navigate with keyboard? Is contrast sufficient?

### Handoff to Developers

Provide:
- Component states (all of them)
- Spacing using the 4px grid
- Colors by token name (not hex values)
- Typography by scale (not pixel values)
- Animation timing and easing
- Responsive behavior at key breakpoints

---

## Summary

The Family Meal Planner design language creates experiences that are:
- **Sophisticated**: Clean, minimal, with attention to detail
- **Smooth**: Animated transitions create continuity and delight
- **Consistent**: Unified visual language across all contexts
- **Accessible**: Inclusive design that works for everyone
- **Resilient**: Graceful handling of errors and edge cases

This is a living document. As the product evolves, so should this design language—but always in service of these core principles.
