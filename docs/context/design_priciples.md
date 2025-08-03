# UI Design System Prompt

When building user interfaces for this Next.js project using shadcn/ui components and Tailwind CSS, follow these design principles and implementation guidelines:

## Core Design Principles

### Aesthetic-Usability Effect
- **Spacing**: Use consistent Tailwind spacing (`gap-2`, `gap-4`, `px-4`, `py-2`) with 8px base increments
- **Typography**: Implement clear hierarchy using `text-sm`, `text-base`, `text-lg`, `font-medium`, `font-semibold`
- **Visual Polish**: Add subtle shadows (`shadow-sm`), borders (`border`), and proper contrast ratios
- **Component Consistency**: Leverage shadcn/ui components for consistent styling patterns

### Hick's Law (Reduce Cognitive Load)
- **Progressive Disclosure**: Use shadcn `Collapsible`, `Accordion`, or `Tabs` to hide complexity
- **Focused Actions**: Limit primary actions to 1-2 per screen
- **Smart Defaults**: Pre-select sensible options, use `Select` with reasonable option counts
- **Contextual Menus**: Use `DropdownMenu` for secondary actions

### Jakob's Law (Familiarity)
- **Web Conventions**: Place navigation, search, and user actions in expected locations
- **Button Patterns**: Use shadcn `Button` variants consistently (`default`, `destructive`, `outline`, `ghost`)
- **Form Layouts**: Follow standard patterns with proper `Label` and `Input` relationships
- **Data Display**: Use familiar patterns like `Table`, `Card`, and `Badge` components

### Fitts's Law (Target Size & Proximity)
- **Touch Targets**: Minimum 44px height for interactive elements (`min-h-11`)
- **Button Sizing**: Use appropriate shadcn Button sizes (`sm`, `default`, `lg`)
- **Clickable Areas**: Extend clickable areas with proper padding
- **Related Actions**: Group related buttons with consistent spacing (`space-x-2`)

### Law of Proximity (Visual Grouping)
- **Logical Grouping**: Use `Card`, `Separator`, and whitespace to group related elements
- **Form Sections**: Organize forms with proper spacing and visual containers
- **Information Hierarchy**: Group related data with consistent spacing patterns
- **Navigation**: Use shadcn `NavigationMenu` for grouped navigation items

### Zeigarnik Effect (Progress Indication)
- **Loading States**: Implement `Skeleton` components and loading spinners
- **Progress Tracking**: Use `Progress` component for multi-step processes
- **Save States**: Show feedback with `Toast` notifications for user actions
- **Form Validation**: Provide real-time feedback with proper error states

### Goal-Gradient Effect (Completion Motivation)
- **Multi-step Flows**: Use breadcrumbs or step indicators with clear progress
- **Primary Actions**: Highlight next steps with `Button` variant="default"
- **Visual Momentum**: Use animations and transitions to guide user flow
- **Completion Cues**: Celebrate completed actions with success states

### Law of Similarity (Consistency)
- **Component Variants**: Use shadcn component variants consistently across the app
- **Icon Usage**: Maintain consistent icon sizing and style (lucide-react icons)
- **Color Semantics**: Use consistent color meanings (destructive for delete, etc.)
- **Interactive States**: Apply consistent hover, focus, and active states

### Miller's Law (Cognitive Limits)
- **Information Chunking**: Break complex interfaces into digestible sections
- **Navigation Depth**: Keep navigation hierarchies shallow (max 3 levels)
- **Option Limits**: Present 5-9 options at a time, use pagination for more
- **Default Collapsed**: Start with advanced options hidden

### Doherty Threshold (Responsiveness)
- **Immediate Feedback**: Provide instant visual feedback for user actions
- **Optimistic UI**: Update UI immediately, handle errors gracefully
- **Loading States**: Show loading indicators for actions >100ms
- **Skeleton Loading**: Use `Skeleton` components for content loading

## Implementation Guidelines

### Component Usage
- **Prefer shadcn/ui**: Use shadcn components over custom implementations
- **Semantic HTML**: Ensure proper accessibility with correct HTML elements
- **Responsive Design**: Use Tailwind responsive prefixes (`sm:`, `md:`, `lg:`)
- **Dark Mode**: Support with `dark:` prefixes and proper contrast

### Layout Patterns
- **Container Widths**: Use `max-w-*` classes for proper content width
- **Grid Systems**: Leverage CSS Grid and Flexbox with Tailwind utilities
- **Spacing Scale**: Stick to Tailwind's spacing scale for consistency
- **Breakpoints**: Design mobile-first with appropriate breakpoints

### Interaction Design
- **Hover States**: Always provide hover feedback on interactive elements
- **Focus Management**: Ensure proper focus management for accessibility
- **Animation**: Use subtle transitions (`transition-all duration-200`)
- **Error Handling**: Provide clear error messages and recovery paths

### Performance Considerations
- **Component Lazy Loading**: Use dynamic imports for heavy components
- **Image Optimization**: Use Next.js Image component with proper sizing
- **Bundle Size**: Keep component usage efficient, avoid unnecessary imports
- **Render Optimization**: Use React best practices for re-render prevention

Remember: Always prioritize user experience over visual complexity. When in doubt, choose the simpler, more familiar solution.
