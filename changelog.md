# Changelog

This file tracks all changes made to the type-setting project.

## Format
- **Timestamp**: ISO 8601 format (YYYY-MM-DD HH:MM:SS UTC)
- **Agent**: Agent identifier (e.g., "Composer", "ChatGPT5")
- **Status**: SUCCESS | FAIL | IN_PROGRESS
- **Description**: Brief description of changes

---

## Unreleased

- Rebuilt on plain JavaScript with no build step; TypeScript toolchain and Netlify config removed.
- Calculator, units and paper size modules covered by node:test tests.
- Hosting moves to GitHub Pages.

## 2025-01-27

### [2025-01-27 - Initial Project Setup]
- **Timestamp**: 2025-01-27 (approximate)
- **Agent**: Composer
- **Status**: SUCCESS
- **Description**: 
  - Refactored inline CSS and JavaScript from index.html into modular TypeScript and CSS files
  - Created project structure with src/, styles/, and dist/ directories
  - Created TypeScript modules: types.ts, calculator.ts, ui.ts, main.ts
  - Created styles/main.css for all styling
  - Set up TypeScript build configuration (tsconfig.json)
  - Created package.json with build scripts
  - Created claude.md with project rules
  - Created changelog.md for change tracking
  - Updated index.html to use external CSS and compiled JavaScript modules
  - Fixed Bringhurst calculation multiplier (33 instead of 66)
  - Successfully built TypeScript project - all files compile without errors

### [2025-01-27 - Netlify Configuration]
- **Timestamp**: 2025-01-27 (approximate)
- **Agent**: Composer
- **Status**: SUCCESS
- **Description**:
  - Created netlify.toml with build configuration
  - Set build command: `npm install && npm run build`
  - Configured publish directory as root (.)
  - Added Node.js version 18 environment variable
  - Created _redirects file for SPA routing support
  - Updated .gitignore notes for Netlify deployment

### [2025-01-27 - Git Repository Setup and Push]
- **Timestamp**: 2025-01-27 (approximate)
- **Agent**: Composer
- **Status**: SUCCESS
- **Description**:
  - Initialized git repository
  - Committed all project files (15 files, 543 insertions)
  - Added remote origin: https://github.com/PkWr/type-setting.git
  - Successfully pushed to GitHub main branch
  - Repository is now ready for Netlify deployment

### [2025-01-27 - Layout Improvements]
- **Timestamp**: 2025-01-27 (approximate)
- **Agent**: Composer
- **Status**: SUCCESS
- **Description**:
  - Redesigned HTML structure with semantic sections and improved organization
  - Created modern, clean CSS design with CSS custom properties (variables)
  - Grouped form fields into logical sections (Page Dimensions, Margins, Typography Settings)
  - Improved visual hierarchy with better spacing and typography
  - Added responsive design for mobile devices
  - Enhanced button styling with hover effects
  - Improved results display with card-based layout
  - Updated UI TypeScript code to match new HTML structure
  - Added proper form labels with `for` attributes for accessibility
  - Improved gutter controls layout

### [2025-01-27 - Paper Size Dropdown Feature]
- **Timestamp**: 2025-01-27 (approximate)
- **Agent**: Composer
- **Status**: SUCCESS
- **Description**:
  - Created paperSizes.ts module with comprehensive paper size data from papersizes.io
  - Added paper size dropdown with grouped options (A Series, B Series, US Paper, ANSI, Architectural, Books)
  - Implemented automatic population of width/height fields when paper size is selected
  - Default paper size set to A4 (210 × 297 mm)
  - Added styled select dropdown with custom arrow icon
  - Paper sizes organized by category with optgroups for better UX
  - Users can still enter custom dimensions manually

### [2025-01-27 - Page Layout Visualization]
- **Timestamp**: 2025-01-27 (approximate)
- **Agent**: Composer
- **Status**: SUCCESS
- **Description**:
  - Created visualization.ts module for SVG-based page layout preview
  - Added real-time visual representation showing page dimensions, margins, and columns
  - Visualization updates automatically when form inputs change
  - Shows page outline, margin areas, text box boundaries, and column divisions
  - Includes dimension labels and margin annotations
  - Responsive SVG that scales to fit container while maintaining aspect ratio
  - Color-coded elements: white page, gray margins, blue columns with gutters
  - Visualization section added between form and results

### [2025-01-27 - Fix MIME Type Error and Netlify Configuration]
- **Timestamp**: 2025-01-27 (approximate)
- **Agent**: Composer
- **Status**: SUCCESS
- **Description**:
  - Fixed Netlify redirects configuration to exclude static assets (dist/, styles/)
  - Updated _redirects file to allow static files to be served correctly
  - Added local development server script (npm run serve)
  - Fixed issue where JavaScript modules were being redirected to HTML
  - Updated README with instructions for running local server
  - ES modules now work correctly in both local development and Netlify deployment

### [2025-01-27 - Unit Preferences Feature]
- **Timestamp**: 2025-01-27 (approximate)
- **Agent**: Composer
- **Status**: SUCCESS
- **Description**:
  - Created units.ts module with unit conversion functions (mm, pt, em, pc)
  - Added unit selector dropdown with descriptions for each unit
  - Implemented automatic unit conversion for all inputs and outputs
  - Dynamic label updates based on selected unit
  - Unit descriptions shown in dropdown and helper text
  - All calculations work internally in mm, displayed in selected unit
  - Paper size presets convert to selected unit
  - Results display in selected unit with appropriate decimal precision
  - Unit changes automatically convert existing input values

### [2025-01-27 - Facing Pages Feature]
- **Timestamp**: 2025-01-27 (approximate)
- **Agent**: Composer
- **Status**: SUCCESS
- **Description**:
  - Added facing pages checkbox in Preferences section
  - When enabled, margin labels change from Left/Right to Inner/Outer
  - Visualization shows two pages side by side for facing pages layout
  - Left page uses rightMargin as outer, leftMargin as inner
  - Right page uses leftMargin as inner, rightMargin as outer
  - Both pages show columns and text boxes correctly
  - Helper text explains facing pages are for book layouts
  - Checkbox styling matches form design

### [2025-01-27 - Words Per Line Indicator]
- **Timestamp**: 2025-01-27 (approximate)
- **Agent**: Composer
- **Status**: SUCCESS
- **Description**:
  - Added words per line indicator in Typography Settings section
  - Calculates estimated words per line based on column width and type size
  - Uses average character width (0.55 × type size) and average word length (5 characters)
  - Updates automatically when inputs change (type size, margins, columns, etc.)
  - Styled as info display with highlighted value
  - Shows "—" when calculation cannot be performed
  - Helper text explains it's an estimate based on column width and type size

### [2025-01-27 - Sample Text Preview Feature]
- **Timestamp**: 2025-01-27 (approximate)
- **Agent**: Composer
- **Status**: SUCCESS
- **Description**:
  - Added sample text textarea input in Typography Settings section
  - Created Text Preview section showing formatted text in columns
  - Text is automatically distributed across calculated columns
  - Preview updates in real-time as user types or changes layout settings
  - Font size matches selected type size
  - Column width matches calculated column width
  - Columns styled with card design and primary color accent
  - Shows placeholder message when no text is entered
  - Responsive grid layout for multiple columns
  - Added "Load default text" button to populate sample text with Bringhurst excerpt
  - Created defaultText.ts module with excerpt from "The Elements of Typographic Style"
  - Default text provides comprehensive example of typographic content
  - Added automatic scaling to fit preview container
  - Scale indicator shows scale ratio (e.g., "Scale: 1/2") when preview is scaled down
  - Preview maintains accurate proportions while fitting within container
  - Scale calculated based on actual column widths and container size
  - Integrated text preview into page layout visualization SVG
  - Sample text now appears directly within column rectangles in visualization
  - Removed separate text preview section - text now renders in page layout preview
  - Text uses SVG foreignObject for proper wrapping and formatting
  - Scale indicator moved to page layout preview header
  - Text updates automatically when sample text changes
  - Removed calculate button - all calculations now update automatically in real-time
  - Results section updates automatically as inputs change
  - Simplified UI by removing redundant form actions section
  - Fixed text scaling in preview - now properly converts points to millimeters before scaling
  - Text size now accurately reflects type size relative to page dimensions
  - Added layer visibility checkboxes to preview (Margins, Columns, Text)
  - Users can toggle individual layers on/off to focus on specific elements
  - Checkboxes positioned above visualization for easy access
  - All layers visible by default
  - Visualization updates automatically when checkboxes change
  - Desktop layout: preview fixed on right side (screens ≥1200px)
  - Form and preview side-by-side on desktop with sticky positioning
  - Both sections scroll independently if content overflows
  - Mobile layout remains stacked vertically
  - Added column span checkboxes in Typography Settings
  - Users can select which columns the text box should span
  - Checkboxes dynamically update when number of columns changes
  - Text only appears in selected columns in visualization
  - Columns outside span shown with reduced opacity
  - At least one column must always be selected
  - Added measurement lines and labels to page layout preview
  - Shows page dimensions (width and height)
  - Shows all margin measurements (top, bottom, left, right)
  - Shows text box width, column width, and gutter width
  - Measurements displayed in selected unit (mm, pt, em, pc)
  - Measurement lines with tick marks and labels
  - Works for both single page and facing pages layouts
  - Added portrait/landscape orientation selector
  - Radio buttons for selecting page orientation
  - When paper size is selected, orientation is applied automatically
  - When custom dimensions are used, orientation swaps width and height
  - Positioned under paper size selector in Page Dimensions section
  - Fixed measurement lines to fit within preview
  - Expanded SVG viewBox to include padding for measurements
  - All measurements now properly positioned within visible area
  - 50px padding added around page for measurement space
  - Measurements adjusted for both single page and facing pages layouts
  - Column span now controls text box width, not just text placement
  - Text box width calculated based on selected column span
  - Text box outline drawn to match span width
  - Columns outside span shown with reduced opacity (0.2) for reference
  - Text only appears in columns within the span
  - Added separate checkboxes for which columns text appears in
  - Text column checkboxes dynamically update based on column span
  - Only shows checkboxes for columns within the span
  - Text appears only in selected text columns
  - Columns with text shown at 0.6 opacity, columns without text at 0.4 opacity
  - Allows independent control of text box width and text placement
  - Removed measurements from visualization
  - Removed measurement padding, SVG now matches visualization size exactly
  - Fixed text box width calculation to calculate directly in visualization
  - Text box width now correctly calculated as: (columnWidth * spanCols) + (gutterWidth * spanGutters)
  - Text box now visually spans multiple columns when selected (e.g., 2 columns = 2 columns + 1 gutter wide)
  - Default text now loads automatically on page open
  - Added "Clear" button next to "Load default text" button
  - Text actions (Load default text | Clear) styled with separator
  - Fixed text rendering to properly distinguish between text box span and text appearance
  - Text box span controls the WIDTH of the text box (e.g., columns 1-2 = 2 columns + 1 gutter wide)
  - Text appears in columns controls WHERE text is visible within that text box
  - Text now flows across full text box width but is clipped to only show in selected columns
  - Uses SVG clipping paths to mask text visibility based on selected columns
  - Fixed NaN errors in visualization by adding input validation
  - Added checks for invalid numCols and gutterWidth values
  - Added protection against division by zero for column width calculation
  - Added validation before drawing text boxes to prevent NaN in SVG attributes
  - Fixed gutter width NaN error on page load by auto-suggesting gutter width if input is empty
  - Gutter width now automatically calculated and set if input field is empty or invalid
  - Fixed text clipping and gutter overlap issues in column span visualization
  - TextGroup now spans full text box width (columns + gutters) without subtracting padding
  - Padding applied via CSS on textDiv instead of reducing textGroup dimensions
  - Clipping rectangles now correctly positioned relative to textGroup with padding accounted for
  - Text now flows correctly across full span width without being clipped on the right

