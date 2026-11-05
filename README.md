# chase

chase is a set of tools for typographic layout, built for teaching graphic design. Its calculator (the Compositor) works out page layouts from Robert Bringhurst's principles in "The Elements of Typographic Style".

## Features

- Calculate optimal column widths for multi-column layouts
- Auto-suggest gutter width based on type size (1em)
- Calculate text box dimensions based on page margins
- Reference optimal column width for 66 characters per line (Bringhurst standard)

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone https://github.com/PkWr/chase.git
cd chase
```

2. Start a local web server (required for ES modules):
```bash
python3 -m http.server 8000
```

Then open http://localhost:8000 in a web browser. ES modules do not load over the file:// protocol.

There is no build step and no dependencies. The source in `src/` is plain JavaScript that the browser loads directly.

### Tests

```bash
npm test
```

Runs the `node:test` suite in `test/` (Node 22 or later).

## Deployment

The site is served by GitHub Pages from the repository root. `.nojekyll` disables Jekyll and `CNAME` holds the custom domain.

## Project Structure

```
chase/
├── src/           # Plain JavaScript ES modules
│   ├── calculator.js, units.js, paperSizes.js, types.js
│   ├── ui.js, visualization.js, defaultText.js, main.js
│   ├── start.js   # Start screen and About drawer
│   └── grep.js    # GREP pattern generator
├── test/          # node:test tests
├── tools/         # build-changelog.py (generates changelog.html and the version label)
├── changelog.html # Public release notes (generated)
├── styles/        # main.css, form-shell.css (Form palette, panel, start screen)
├── vendor/fonts/  # Self-hosted fonts
├── index.html     # Layout calculator
├── grep.html      # GREP pattern generator
├── CNAME          # Custom domain
└── package.json   # Test script only
```

## Usage

1. Enter page dimensions (width and height in mm)
2. Set margins (left, right, top, bottom in mm)
3. Specify type size (in points)
4. Choose number of columns
5. Click "Auto-set gutter width" to set gutter based on type size, or enter manually
6. Click "Calculate" to see results

## License

MIT

