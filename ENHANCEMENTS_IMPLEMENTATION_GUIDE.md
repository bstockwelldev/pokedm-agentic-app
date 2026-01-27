# Critical Enhancements Implementation Guide

This document outlines the remaining critical enhancements that need to be applied when Phase 1-4 components are created during the UI/UX redesign.

## Status

✅ **Phase 0 - Backend Enhancements**: COMPLETED
- Request ID middleware added
- Enhanced error handler with requestId
- All error responses standardized

✅ **Phase 1 - Foundation**: COMPLETED
- CSS foundation with focus ring variables created
- Accessibility enhancements added to existing App.jsx
- Keyboard navigation for choices implemented

⏳ **Phase 1-4 Component Enhancements**: PENDING (to be applied when components are created)

---

## Phase 1 Component Enhancements (When Components Are Created)

### AppShell.jsx

**Responsive Layout**:
- Use Tailwind breakpoint classes: `lg:grid-cols-[2fr_1fr]` for desktop side-by-side
- Stack layout on mobile/tablet: `flex flex-col lg:flex-row`
- Implement mobile bottom sheet for RightPanel on screens < 640px

**Accessibility**:
- Ensure logical Tab order through all sections
- Add skip link: `<a href="#main-content" className="sr-only focus:not-sr-only">Skip to main content</a>`

### TopBar.jsx

**ARIA Labels** (already documented in plan):
- Model select: `aria-label="Select AI model"`
- Session ID display: `aria-label="Session identifier"`
- New session button: `aria-label="Start new session"`
- Export button: `aria-label="Export session"`

**Keyboard Navigation**:
- Ensure Tab order: Model select → Session ID → New session → Export
- Enter/Space activates buttons

### Composer.jsx

**ARIA Labels**:
- Textarea: `aria-label="Type your message"` and `aria-describedby="composer-help"`
- Send button: `aria-label="Send message"`
- Stop button (when streaming): `aria-label="Stop generation"`
- Quick action chips: Each chip needs `aria-label` describing its action

**Keyboard Navigation**:
- Tab order: Textarea → Quick actions → Send button
- Slash command hints accessible via keyboard

### RightPanel.jsx

**Mobile Responsiveness**:
- On mobile (< 640px): Render as bottom sheet/drawer
- Add toggle button with `aria-label="Toggle session panel"` and `aria-expanded`
- Use Radix UI Dialog or Drawer component for mobile bottom sheet

**Accessibility**:
- Panel container: `role="complementary"` with `aria-label="Session information panel"`
- Collapse/expand button: `aria-controls="right-panel-content"`

---

## Phase 2 Component Enhancements (When Message Components Are Created)

### ChoicesMessage.jsx

**Keyboard Navigation** (partially implemented in App.jsx, needs to be moved to component):
- Arrow keys (Up/Down) navigate between choices
- Enter/Space selects choice
- Home/End jump to first/last choice
- Focus management: Auto-focus first choice when choices appear

**ARIA Attributes**:
- Container: `role="group"` with `aria-labelledby="choices-heading"`
- Each button: `aria-label` with full description (label + description)
- Safe default: `aria-current="true"` on first choice
- Focused choice: Visual indicator + `aria-selected="true"` (if using list pattern)

**Implementation Pattern**:
```jsx
<div role="group" aria-labelledby="choices-heading">
  {choices.map((choice, idx) => (
    <button
      aria-label={`${choice.label}: ${choice.description}`}
      aria-current={idx === 0 ? 'true' : undefined}
      onKeyDown={(e) => handleChoiceKeyDown(e, choice, idx)}
      // ... other props
    />
  ))}
</div>
```

### MessageCard.jsx and Variants

**Semantic HTML**:
- Base component: Use `<article role="article">` with `aria-labelledby` pointing to message header
- UserMessage: `role="article"` with `aria-label="Your message"`
- DmNarration: `role="article"` with `aria-label="Dungeon Master narration"`
- SystemMessage: `role="status"` with `aria-live="polite"` for announcements

**Timestamps**:
- Add `aria-label` with formatted date/time for screen readers
- Example: `aria-label="Message sent at 3:45 PM on January 27, 2026"`

### ToolRunMessage.jsx

**ARIA Attributes**:
- Container: `role="status"` with `aria-live="polite"` for status updates
- Status badge: `aria-label` with status description (e.g., "Tool running", "Tool completed", "Tool failed")
- Expandable details: `aria-expanded` and `aria-controls` for collapsible sections

---

## Phase 3 Component Enhancements (When StateTab Is Created)

### StateTab.jsx

**Collapsible Sections**:
- Use native `<details>` and `<summary>` for best accessibility, OR
- Implement with ARIA: `aria-expanded`, `aria-controls`, `role="button"` on summary
- Each section: `role="region"` with `aria-labelledby` pointing to section heading

**JSON Viewer**:
- Container: `role="region"` with `aria-label="Session state JSON"`
- Copy button: `aria-label="Copy JSON to clipboard"`
- Search input: `aria-label="Search session state"` and `aria-describedby="search-help"`
- Code block: `role="textbox"` with `aria-readonly="true"` and `aria-label="JSON content"`

**Keyboard Navigation**:
- Tab through sections
- Enter/Space to expand/collapse sections
- Arrow keys for nested navigation within expanded sections

**Implementation Pattern**:
```jsx
<section role="region" aria-labelledby="location-heading">
  <details>
    <summary id="location-heading" role="button" aria-expanded="true">
      Location
    </summary>
    {/* Location content */}
  </details>
</section>
```

---

## Phase 4 Component Enhancements (When ToolsTab and LogsTab Are Created)

### ToolsTab.jsx

**List Structure**:
- Container: `role="list"` with `aria-label="Tool executions"`
- Each tool card: `role="listitem"`
- Status badges: `aria-label` with status (e.g., "Running", "Awaiting approval", "Completed", "Failed")

**Expandable Details**:
- Use `aria-expanded` and `aria-controls` for collapsible tool details
- Approval buttons: Clear `aria-label` (e.g., "Approve tool execution", "Reject tool execution")
- Retry button: `aria-label="Retry failed tool"`

**Keyboard Navigation**:
- Tab through tool cards
- Enter/Space to expand/collapse details
- Tab to approval/retry buttons within expanded cards

### LogsTab.jsx

**Live Region**:
- Container: `role="log"` with `aria-live="polite"` and `aria-label="Agent execution logs"`
- Log entries: Each entry should have timestamp with `aria-label`

**Filter Controls**:
- Filter dropdown: `aria-label="Filter logs by level"` and `aria-describedby="filter-help"`
- Search input: `aria-label="Search logs"` and `aria-describedby="search-help"`
- Clear filters button: `aria-label="Clear all filters"`

**Syntax Highlighting**:
- Ensure JSON/code blocks are readable by screen readers
- Use `role="textbox"` with `aria-readonly="true"` for code blocks

### Tabs Navigation (RightPanel)

**Radix UI Tabs** (already in dependencies):
- Radix UI Tabs component provides built-in accessibility
- Ensure proper `aria-selected` states
- Arrow key navigation between tabs (built into Radix UI)
- Each tab: `aria-controls` pointing to corresponding tab panel

**Implementation**:
```jsx
import * as Tabs from '@radix-ui/react-tabs';

<Tabs.Root defaultValue="state">
  <Tabs.List aria-label="Session information tabs">
    <Tabs.Trigger value="state" aria-controls="state-panel">
      State
    </Tabs.Trigger>
    {/* More tabs */}
  </Tabs.List>
  <Tabs.Content value="state" id="state-panel" role="tabpanel">
    {/* Tab content */}
  </Tabs.Content>
</Tabs.Root>
```

---

## Mobile Responsiveness Implementation

### Breakpoint Strategy

**Mobile (< 640px)**:
- AppShell: Stack layout (`flex flex-col`)
- RightPanel: Bottom sheet/drawer (Radix UI Dialog or Drawer)
- TopBar: Compress to icons where possible
- Composer: Full width, fixed to bottom

**Tablet (640px - 1023px)**:
- AppShell: Stack layout with collapsible RightPanel
- RightPanel: Side drawer that can be toggled
- TopBar: Full controls visible

**Desktop (>= 1024px)**:
- AppShell: Side-by-side layout (`lg:grid-cols-[2fr_1fr]`)
- RightPanel: Always visible, resizable
- TopBar: Full controls

### Implementation Files

When creating components, use Tailwind responsive classes:
- `hidden lg:block` - Hide on mobile, show on desktop
- `lg:flex` - Flex layout on desktop only
- `w-full lg:w-auto` - Full width on mobile, auto on desktop

---

## WCAG AA Contrast Ratios

Ensure all text meets contrast requirements:

**Text Contrast (4.5:1)**:
- Body text on background
- Button text on button background
- Link text on background

**UI Component Contrast (3:1)**:
- Focus rings
- Borders
- Status indicators

**Color Palette** (from PRD):
- Background: `#0a0e27` (near-black blue)
- Text: `#f0f0f0` (off-white) - 15.8:1 contrast ✅
- Muted text: `#6b7280` (cool gray) - 4.6:1 contrast ✅
- Brand: `#00d9ff` (electric cyan) - Use on dark backgrounds only

---

## Testing Checklist

When implementing each phase, verify:

### Keyboard Navigation
- [ ] Tab order is logical and intuitive
- [ ] All interactive elements are reachable via keyboard
- [ ] Focus indicators are visible
- [ ] Arrow keys work for choice navigation
- [ ] Enter/Space activate buttons and controls

### Screen Reader
- [ ] All interactive elements have `aria-label` or visible text
- [ ] Status updates are announced (`aria-live`)
- [ ] Form inputs have `aria-describedby` for help text
- [ ] Lists use proper `role` attributes
- [ ] Landmarks are properly identified (`role="main"`, `role="complementary"`, etc.)

### Visual
- [ ] Focus rings visible on all interactive elements
- [ ] Contrast ratios meet WCAG AA standards
- [ ] Mobile layout works on screens < 640px
- [ ] Tablet layout works on 640px - 1023px
- [ ] Desktop layout works on >= 1024px

---

## References

- [UI_UX_REDESIGN_PRD.md](./UI_UX_REDESIGN_PRD.md) - Full PRD with all requirements
- [Critical Enhancements Plan](../.cursor/plans/critical_enhancements_integration_plan_71c9939a.plan.md) - Implementation plan
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/) - Accessibility standards
- [Radix UI Accessibility](https://www.radix-ui.com/primitives/docs/overview/accessibility) - Component accessibility patterns

---

**Last Updated**: 2026-01-27  
**Status**: Phase 0 and Phase 1 foundation complete. Remaining enhancements to be applied when Phase 1-4 components are created.
