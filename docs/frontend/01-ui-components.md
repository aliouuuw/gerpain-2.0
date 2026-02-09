# UI Components Specification

## Overview

This document details the specifications for all reusable UI components needed across the Gerpain application. Each component is designed with accessibility, performance, and consistency in mind.

---

## Select Component

### Purpose
Standardized dropdown selection component for forms, filters, and data entry.

### Technical Specifications

**File Location**: `components/ui/select/Select.tsx`

**Dependencies**:
- Radix UI Select primitives
- Lucide React icons (ChevronDown, Check)
- Class variance for styling variants

**Interface Definition**:
```typescript
interface SelectOption {
  value: string
  label: string
  disabled?: boolean
  icon?: React.ReactNode
  description?: string
}

interface SelectProps {
  value?: string | string[]
  onValueChange: (value: string | string[]) => void
  options: SelectOption[]
  placeholder?: string
  multi?: boolean
  searchable?: boolean
  clearable?: boolean
  disabled?: boolean
  error?: string
  helperText?: string
  label?: string
  required?: boolean
  className?: string
  size?: 'sm' | 'md' | 'lg'
}
```

**Behavioral Requirements**:
1. **Single Select Mode**: 
   - Click to open dropdown
   - Arrow keys for navigation
   - Enter to select, Escape to close
   - Clear button when clearable=true

2. **Multi Select Mode**:
   - Checkboxes for selection
   - Selected items shown as pills
   - Remove individual selections
   - Select all/none options

3. **Search Mode**:
   - Filter options as user types
   - Highlight matching text
   - No results message
   - Search icon indicator

4. **Accessibility**:
   - Proper ARIA labels and descriptions
   - Screen reader announcements
   - Keyboard navigation support
   - High contrast visibility

**Styling Requirements**:
- Use CSS variables for colors
- Consistent border radius (var(--radius-control))
- Focus ring on focus state
- Error state with red border
- Disabled state with reduced opacity

**Performance Requirements**:
- Virtual scrolling for 1000+ options
- Debounced search input (300ms)
- Memoized option rendering
- Efficient re-rendering

---

## DatePicker Component

### Purpose
Date selection with range support and French localization.

### Technical Specifications

**File Location**: `components/ui/date-picker/DatePicker.tsx`

**Dependencies**:
- Custom date logic (no heavy library)
- Radix UI Popover primitives
- French locale configuration

**Interface Definition**:
```typescript
interface DateRange {
  from: Date
  to?: Date
}

interface DatePickerProps {
  value?: Date | DateRange
  onValueChange: (value: Date | DateRange | undefined) => void
  placeholder?: string
  mode?: 'single' | 'range'
  disabled?: boolean
  minDate?: Date
  maxDate?: Date
  error?: string
  helperText?: string
  label?: string
  required?: boolean
  className?: string
  locale?: 'fr' | 'en'
}
```

**Behavioral Requirements**:
1. **Single Date Mode**:
   - Calendar grid navigation
   - Today button for quick selection
   - Month/year navigation
   - Click outside to close

2. **Range Mode**:
   - Select start date, then end date
   - Visual range highlighting
   - Predefined ranges (Today, This Week, This Month)
   - Clear range option

3. **Input Behavior**:
   - Manual date entry support
   - Date format validation
   - Keyboard navigation (arrows, enter)
   - Paste date support

4. **Localization**:
   - French day/month names
   - Week starts on Monday
   - XOF currency date format
   - Right-to-left support preparation

**Styling Requirements**:
- Calendar grid with proper spacing
- Hover states on dates
- Selected date highlighting
- Range selection visualization
- Disabled date styling
- Weekend date indicators

**Performance Requirements**:
- Efficient calendar rendering
- Minimal re-renders on date change
- Lightweight without heavy dependencies
- Fast month navigation

---

## Badge Component

### Purpose
Small status indicators and labels with semantic color coding.

### Technical Specifications

**File Location**: `components/ui/badge/Badge.tsx`

**Dependencies**:
- No external dependencies
- CSS variables for theming

**Interface Definition**:
```typescript
interface BadgeProps {
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info'
  size?: 'sm' | 'md' | 'lg'
  children: React.ReactNode
  className?: string
  dot?: boolean
  count?: number
  maxCount?: number
}
```

**Behavioral Requirements**:
1. **Variants**:
   - Default: Gray background
   - Success: Green for positive states
   - Warning: Yellow for attention needed
   - Error: Red for negative states
   - Info: Blue for neutral information

2. **Sizes**:
   - sm: 12px height, compact spacing
   - md: 16px height, normal spacing
   - lg: 20px height, generous spacing

3. **Special Features**:
   - Dot indicator for status
   - Count display with overflow handling
   - Animated count changes
   - Pulse animation for new items

**Styling Requirements**:
- Semantic color mapping to CSS variables
- Consistent border radius
- Proper contrast ratios
- Subtle animations
- High contrast mode support

**Use Cases**:
- Delivery run status badges
- Collection status indicators
- Stock level warnings
- Notification counts

---

## Tabs Component

### Purpose
Tab navigation for switching between related views within a page.

### Technical Specifications

**File Location**: `components/ui/tabs/Tabs.tsx`

**Dependencies**:
- Radix UI Tabs primitives
- Smooth scroll behavior

**Interface Definition**:
```typescript
interface TabOption {
  value: string
  label: string
  icon?: React.ReactNode
  badge?: string | number
  disabled?: boolean
  description?: string
}

interface TabsProps {
  value: string
  onValueChange: (value: string) => void
  tabs: TabOption[]
  className?: string
  variant?: 'default' | 'underline' | 'pills'
  size?: 'sm' | 'md' | 'lg'
  fullWidth?: boolean
}

interface TabsContentProps {
  value: string
  children: React.ReactNode
  className?: string
}
```

**Behavioral Requirements**:
1. **Navigation**:
   - Click to switch tabs
   - Arrow key navigation
   - Home/End key support
   - Disabled tab handling

2. **Visual Feedback**:
   - Active tab highlighting
   - Hover states
   - Focus indicators
   - Loading states

3. **Responsive Behavior**:
   - Horizontal scrolling for many tabs
   - Dropdown overflow on mobile
   - Touch-friendly sizing
   - Swipe gestures support

4. **Accessibility**:
   - ARIA tablist structure
   - Screen reader announcements
   - Keyboard navigation
   - Focus management

**Styling Requirements**:
- Multiple visual variants
- Smooth transitions
- Consistent spacing
- Mobile optimization
- High contrast support

**Performance Requirements**:
- Lazy tab content rendering
- Efficient tab switching
- Minimal re-renders
- Smooth animations

---

## Toast/Notification Component

### Purpose
Global notification system for user feedback and system messages.

### Technical Specifications

**File Location**: `components/ui/toast/Toast.tsx`

**Dependencies**:
- Context API for state management
- Framer Motion for animations
- Lucide React icons

**Interface Definition**:
```typescript
interface ToastAction {
  label: string
  onClick: () => void
  variant?: 'default' | 'destructive'
}

interface ToastProps {
  id?: string
  variant?: 'success' | 'error' | 'warning' | 'info'
  title: string
  description?: string
  duration?: number
  action?: ToastAction
  dismissible?: boolean
  icon?: React.ReactNode
  className?: string
}

interface ToastProviderProps {
  children: React.ReactNode
  position?: 'top-right' | 'top-center' | 'top-left' | 'bottom-right' | 'bottom-center' | 'bottom-left'
  maxToasts?: number
}

// Hook for usage
interface UseToastReturn {
  toast: (props: ToastProps) => void
  dismiss: (id: string) => void
  dismissAll: () => void
}
```

**Behavioral Requirements**:
1. **Display Logic**:
   - Auto-dismiss after duration
   - Manual dismiss option
   - Stacking with newest on top
   - Maximum toast limit

2. **Animations**:
   - Slide in from side
   - Fade effects
   - Progress bar indicator
   - Smooth exit animations

3. **Interactions**:
   - Click to dismiss
   - Action button handling
   - Hover to pause auto-dismiss
   - Keyboard dismiss (Escape)

4. **Accessibility**:
   - Screen reader announcements
   - Focus management
   - High contrast support
   - Reduced motion respect

**Styling Requirements**:
- Consistent with design system
- Semantic color coding
- Proper text hierarchy
- Mobile-friendly sizing
- Dark mode support

**Performance Requirements**:
- Efficient state management
- Minimal DOM impact
- Smooth 60fps animations
- Memory leak prevention

---

## Component Testing Strategy

### Unit Tests
- Render all variants
- Test user interactions
- Verify accessibility attributes
- Check error handling

### Integration Tests
- Component composition
- State management
- API integration
- User flow testing

### Accessibility Tests
- Screen reader compatibility
- Keyboard navigation
- Color contrast validation
- Focus management

### Performance Tests
- Render performance
- Memory usage
- Animation smoothness
- Bundle size impact

---

## Component Documentation

### Storybook Stories
Each component should include:
- Default state
- All variants
- Error states
- Disabled states
- Loading states
- Interactive examples

### Prop Documentation
- TypeScript interfaces
- Default values
- Usage examples
- Best practices

### Design Guidelines
- When to use each component
- Design system integration
- Accessibility requirements
- Performance considerations
