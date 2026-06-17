---
name: Heavy-Duty Industrial Modern
colors:
  surface: '#f9f9ff'
  surface-dim: '#d9dae0'
  surface-bright: '#f9f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f3f3fa'
  surface-container: '#ededf4'
  surface-container-high: '#e7e8ee'
  surface-container-highest: '#e1e2e9'
  on-surface: '#191c20'
  on-surface-variant: '#424751'
  inverse-surface: '#2e3036'
  inverse-on-surface: '#f0f0f7'
  outline: '#727782'
  outline-variant: '#c2c6d3'
  surface-tint: '#1e5fa8'
  primary: '#004787'
  on-primary: '#ffffff'
  primary-container: '#1e5fa8'
  on-primary-container: '#c5daff'
  inverse-primary: '#a6c8ff'
  secondary: '#954a00'
  on-secondary: '#ffffff'
  secondary-container: '#fd8f36'
  on-secondary-container: '#673100'
  tertiary: '#713800'
  on-tertiary: '#ffffff'
  tertiary-container: '#944b00'
  on-tertiary-container: '#ffd0b0'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#d5e3ff'
  primary-fixed-dim: '#a6c8ff'
  on-primary-fixed: '#001c3b'
  on-primary-fixed-variant: '#004787'
  secondary-fixed: '#ffdcc6'
  secondary-fixed-dim: '#ffb785'
  on-secondary-fixed: '#301400'
  on-secondary-fixed-variant: '#723600'
  tertiary-fixed: '#ffdcc5'
  tertiary-fixed-dim: '#ffb783'
  on-tertiary-fixed: '#301400'
  on-tertiary-fixed-variant: '#703700'
  background: '#f9f9ff'
  on-background: '#191c20'
  surface-variant: '#e1e2e9'
  status-approved: '#2E7D32'
  status-pending: '#F2862E'
  status-alert: '#D32F2F'
  ai-highlight: '#EEF4FF'
  surface-dark: '#121212'
typography:
  headline-xl:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
  headline-md:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 26px
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  label-bold:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: 0.01em
  label-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.05em
  headline-lg-mobile:
    fontFamily: Inter
    fontSize: 22px
    fontWeight: '700'
    lineHeight: 28px
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  base: 4px
  unit-md: 16px
  unit-lg: 24px
  touch-target: 48px
  gutter: 16px
  margin-mobile: 16px
  margin-desktop: 32px
---

## Brand & Style

The design system is engineered for the high-stakes, fast-paced environment of heavy-duty truck repair shops. The brand personality is **authoritative, efficient, and resilient**. It speaks to shop owners who value precision and "getting it right the first time" without getting bogged down in administrative friction.

The visual style is **Industrial-Modern**. It blends the utility of a professional tool with the sophistication of modern AI-driven software. Key characteristics include:
- **High-Contrast Utility:** Prioritizing legibility under varying light conditions (bright shop floors or low-light cabs).
- **Tactile Reliability:** Large, defined tap targets that feel substantial and responsive.
- **Data Clarity:** A card-based architecture that organizes complex ledger and estimate data into digestible, action-oriented modules.
- **Technical Precision:** Clean lines and structured grids that mirror the mechanical nature of the industry.

## Colors

The palette is anchored in **Primary Blue (#1E5FA8)**, evoking trust and professional stability. **Primary Orange (#F2862E)** is utilized strictly for call-to-actions, alerts, and high-priority status indicators to ensure they command immediate attention.

- **Neutral Foundation:** A sophisticated range of grays supports a "clean shop" aesthetic. Whites and light grays form the background for the light mode, while a deep charcoal (`#121212`) is designated for the dark mode to reduce eye strain.
- **AI Feedback Loop:** A specific light blue tint (`#EEF4FF`) is reserved for AI-suggested fields, providing a clear visual distinction between system-generated data and user-confirmed data.
- **Semantic Coloration:** Standardized success (Green), warning (Orange), and error (Red) colors are used for document statuses (Approved, Pending, Overdue) to allow for rapid scanning of the ledger.

## Typography

The design system utilizes **Inter** for its exceptional legibility on mobile screens and its neutral, technical character. 

- **Weight Strategy:** Use Bold (700) for primary headlines and Semibold (600) for sub-headers and button labels to maintain high contrast. Regular (400) is used for body copy and descriptions.
- **Scale:** The hierarchy is optimized for mobile-first consumption. `Headline-xl` is reserved for page titles and total amounts on invoices. `Label-sm` is used for metadata like VINs, timestamps, and "AI-Suggested" tags.
- **Legibility:** Line heights are slightly generous to prevent "wall of text" issues during job capture or while reading parts invoices in the field.

## Layout & Spacing

This design system follows a **mobile-first fluid grid** approach. On mobile devices, a single-column card layout is prioritized to maximize focus on task-specific data.

- **The 48px Rule:** Every interactive element (buttons, inputs, checkboxes) must meet a minimum hit area of 48px to accommodate use in shop environments where users may have large hands or be wearing gloves.
- **Spacing Rhythm:** An 8px linear scale (with a 4px base for tight details) drives all padding and margins. 
- **Card-Based Hierarchy:** Content is grouped into logical cards (e.g., "Customer Info," "Vehicle Specs," "Job Lines"). Cards use 16px internal padding and 16px external margins.
- **Breakpoints:**
  - **Mobile (<600px):** Single column, sticky bottom actions.
  - **Tablet (600px - 1024px):** 2-column layout for "Summary vs. Details."
  - **Desktop (>1024px):** Fixed-width centered container (max 1200px) with multi-column views for the Ledger and Reporting views.

## Elevation & Depth

The design system uses **Tonal Layers** and **Low-Contrast Outlines** rather than heavy shadows to maintain a clean, industrial feel.

- **Surface Tiers:**
  - **Level 0 (Background):** Light gray (#F5F7FA) for the application backdrop.
  - **Level 1 (Cards):** Pure white (#FFFFFF) for the primary content containers.
  - **Level 2 (Modals/Overlays):** White with a very soft, diffused shadow (10% opacity, 12px blur) to indicate temporary focus.
- **Borders:** 1px solid borders (#E2E8F0) are used to define card boundaries and input fields, ensuring structure without visual noise.
- **AI Distinction:** AI-suggested fields utilize a subtle inner glow or a light blue background tint (#EEF4FF) to indicate they are "pending confirmation."

## Shapes

The shape language is **Soft (0.25rem / 4px)**. This choice reflects industrial equipment—sturdy and functional with eased edges for safety and ergonomics.

- **Buttons & Inputs:** Use the base 4px radius.
- **Cards:** Use `rounded-lg` (8px) to create a clear container distinction against the background.
- **Badges/Chips:** Use `rounded-xl` (12px) or full pill-shape for status indicators (e.g., "Paid," "In Progress") to separate them from structural UI components.

## Components

- **Buttons:**
  - **Primary:** Solid Blue (#1E5FA8), white text, 48px height.
  - **Action/Alert:** Solid Orange (#F2862E), white text. Used for "Approve Estimate" or "Record Payment."
  - **Ghost:** Blue outline, used for secondary actions like "Add Note."
- **Cards:** White background, 1px border, 8px corner radius. All cards are clickable if they represent a list item (e.g., a specific Estimate).
- **Input Fields:** 48px height minimum. Labels are always visible above the field (never just placeholders) to maintain context during data entry. 
- **AI Suggested Lines:** These components feature a specific "Confirm" checkmark and "Edit" icon, highlighted by the AI-tinted background.
- **Status Chips:** High-contrast text on a light version of the status color (e.g., Dark Green text on light green background).
- **Iconography:** Bold, thick-stroke icons (2px minimum) to ensure visibility. Use functional icons for "Camera" (Capture Parts), "Mic" (Voice Note), and "Truck" (Vehicle details).
- **Bottom Sheets:** For mobile-first task picking (e.g., selecting "New Estimate" vs "New Invoice"), use slide-up bottom sheets with large, easy-to-tap list items.