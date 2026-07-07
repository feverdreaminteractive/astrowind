# Figma Design Guide for Optimal HTML/CSS Generation

## File Structure Best Practices

### 1. **Use Auto Layout (Critical)**
- Enables accurate Flexbox/Grid CSS generation
- Set direction: Horizontal (row) or Vertical (column)
- Define spacing between items (gap)
- Set padding for containers
- Use "Hug contents" for dynamic sizing
- Use "Fill container" for responsive width

### 2. **Semantic Naming Convention**
Name your layers descriptively for better HTML generation:

```
✅ Good Names:
- Header
- NavigationBar
- HeroSection
- ProductCard
- Footer
- Button_Primary
- Input_Email

❌ Bad Names:
- Frame 123
- Rectangle 2
- Group 5
- Component 1
```

### 3. **Component Structure**
- Create components for reusable elements
- Use variants for different states (hover, active, disabled)
- Structure: Component > Base > Variants

### 4. **Layer Hierarchy**
Organize layers to match HTML structure:
```
Page
  └── Header
      ├── Logo
      ├── Navigation
      │   ├── NavItem
      │   ├── NavItem
      │   └── NavItem
      └── UserMenu
  └── Main
      ├── HeroSection
      ├── Features
      └── CallToAction
  └── Footer
```

### 5. **Constraints & Resizing**
Set constraints for responsive behavior:
- Left + Right = width: 100%
- Top + Bottom = height: 100%
- Center = margin: auto
- Scale = transform: scale()

### 6. **Text Styles**
Create and apply text styles:
- Heading/H1 (32px, Bold)
- Heading/H2 (24px, Semi-bold)
- Body/Regular (16px, Regular)
- Body/Small (14px, Regular)
- Button/Label (14px, Medium)

### 7. **Color Styles**
Define color styles as design tokens:
- Primary/500 (#3B82F6)
- Primary/600 (#2563EB)
- Neutral/900 (#111827)
- Neutral/500 (#6B7280)
- Success/500 (#10B981)
- Error/500 (#EF4444)

### 8. **Effects & Shadows**
Create reusable effect styles:
- Shadow/sm: 0 1px 2px rgba(0,0,0,0.05)
- Shadow/md: 0 4px 6px rgba(0,0,0,0.1)
- Shadow/lg: 0 10px 15px rgba(0,0,0,0.1)

## Figma Properties That Map to CSS

| Figma Property | CSS Equivalent |
|----------------|----------------|
| Auto Layout | `display: flex` |
| Direction: Horizontal | `flex-direction: row` |
| Direction: Vertical | `flex-direction: column` |
| Spacing between items | `gap: Xpx` |
| Padding | `padding: Xpx` |
| Corner Radius | `border-radius: Xpx` |
| Fill | `background-color` |
| Stroke | `border` |
| Effects > Drop Shadow | `box-shadow` |
| Opacity | `opacity` |
| Constraints | `position`, `width`, `height` |
| Layout Grid | CSS Grid |

## Component Naming for Code Generation

### Buttons
- Name: `Button/Primary/Default`
- Variants: Default, Hover, Active, Disabled
- Properties: Size (sm, md, lg), Icon (left, right, none)

### Cards
- Name: `Card/Product`
- Structure:
  ```
  Card
    ├── CardImage
    ├── CardContent
    │   ├── CardTitle
    │   ├── CardDescription
    │   └── CardPrice
    └── CardActions
  ```

### Forms
- Name: `Form/Input/Text`
- Variants: Default, Focus, Error, Disabled
- Include label, input, helper text, error message

## Tips for Better Code Generation

1. **Use Frames, not Groups**
   - Frames have layout properties
   - Groups are just visual grouping

2. **Set Fixed Sizes When Needed**
   - Width: Fixed for specific dimensions
   - Width: Hug for content-based sizing
   - Width: Fill for responsive

3. **Use Consistent Spacing**
   - 4px grid system (4, 8, 12, 16, 24, 32, 48, 64)
   - Apply consistently across design

4. **Export Settings**
   - Mark exportable assets
   - Use 2x for retina displays
   - SVG for icons and logos

5. **Boolean Operations**
   - Use for complex shapes
   - Union, Subtract, Intersect, Exclude

6. **Instance Overrides**
   - Text overrides for content
   - Color overrides for theming
   - Visibility toggles for optional elements

## Example Figma Structure

```
Website Design
├── 📄 Homepage
│   ├── 🔲 Header [Auto Layout, Horizontal]
│   │   ├── Logo [Fixed width]
│   │   ├── Navigation [Auto Layout, Horizontal, gap: 32px]
│   │   └── CTAButton [Component Instance]
│   ├── 🔲 HeroSection [Auto Layout, Vertical]
│   │   ├── Headline [Text Style: H1]
│   │   ├── Subheadline [Text Style: Body/Large]
│   │   └── ButtonGroup [Auto Layout, Horizontal, gap: 16px]
│   └── 🔲 Footer [Auto Layout, Vertical]
└── 🧩 Components
    ├── Button
    ├── Card
    ├── Input
    └── Navigation
```

## API Data Structure

When fetching from Figma API, focus on:
1. `document.children` - Page structure
2. `absoluteBoundingBox` - Position and size
3. `layoutMode` - Flexbox properties
4. `constraints` - Responsive behavior
5. `fills` - Background colors/images
6. `effects` - Shadows and blurs
7. `style` - Text properties
8. `componentId` - Component references

## Testing Your Design

Before generating code, check:
- [ ] All layers are named semantically
- [ ] Auto Layout is used for containers
- [ ] Components are created for repeated elements
- [ ] Text and color styles are defined
- [ ] Constraints are set for responsive behavior
- [ ] Export settings are configured for assets