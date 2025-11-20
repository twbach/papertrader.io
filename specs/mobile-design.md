## Mobile Design Specifications

### Overview
This document outlines the responsive design strategy for the paper trading interface. The primary goal is to keep the desktop grid rich and informative while ensuring that mobile users can still read essential pricing data quickly, starting with the options chain and its related controls.

### Breakpoints
- `md` (768px) is the primary breakpoint where the full desktop layout becomes available.
- Viewports below `md` are considered mobile and should favor simplified layouts, stacked sections, and horizontal scrolling only when absolutely necessary.

### Options Table Responsiveness
#### Desktop (≥768px)
- Display all 11 columns: Call Vol, Call OI, Call Bid, Call Ask, Call Last, Strike, Put Last, Put Bid, Put Ask, Put OI, Put Vol.
- Use CSS Grid with `grid-cols-[repeat(11,minmax(80px,1fr))]` to keep columns evenly spaced.
- Highlight the at-the-money (ATM) row using `bg-accent`.

#### Mobile (<768px)
- Target layout: 5 columns total — Call Bid, Call Ask, Strike, Put Bid, Put Ask.
- Volume and open interest columns should be removed from the flow using `hidden md:block` classes once the layout is finalized.
- Ensure the grid container remains horizontally scrollable (`overflow-x-auto`) so users can review additional metrics when needed.
- Consider future enhancement where tapping a row expands details (volume, open interest, Greeks) in a stacked card format.

### Expiration Selector
- Maintain the horizontal scroll strip but ensure buttons remain at least 40px wide for touch comfort.
- Month labels should stay visible; wrap long sets in a scrollable container with a subtle gradient fade at the edges.
- On mobile, keep only one row of buttons visible at a time to avoid excessive height.

### Header Card
- Stack price, change, and percentage change vertically on mobile.
- Buttons or actions (if added later) should move below the price block for thumb reachability.

### Implementation Guidelines
- Centralize column definitions so visibility can be toggled via breakpoint classes without rewriting markup.
- Prefer utility classes (`hidden md:block`, `md:grid-cols-[...]`) to control visibility over conditional rendering.
- Always provide a minimum width on scrollable regions (e.g., `min-w-[1100px]`) so columns do not collapse on small screens.
- Test on iPhone 13/14 and Pixel 7 viewports to validate touch targets and scroll behaviors.

### Future Enhancements
- Explore stacked card layout for very narrow screens (<360px) where even 5 columns are cramped.
- Provide a toggle to switch between “Compact” (bid/ask only) and “Detailed” (all metrics) views.
- When Greeks data becomes available, show them only inside expandable sections to keep the primary grid lightweight.

