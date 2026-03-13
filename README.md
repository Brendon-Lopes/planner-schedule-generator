# planner-schedule-generator

A lightweight Node.js ESM library that generates a planner-schedule PDF.  
It repeats a template PDF page as many times as you need, stamping a PT-BR
formatted date on each page (or two dates per page, if configured).

---

## Requirements

- Node.js 16 +

## Installation

```sh
npm install
```

## Usage

The library exposes a single async function.  No CLI arguments are needed – configure everything through the function parameters.

```js
import { generatePlannerSchedule } from './src/index.js';

await generatePlannerSchedule({
  templatePath: './template.pdf',   // path to your template PDF
  outputPath:   './output.pdf',     // where to write the result

  startDate:  new Date('2026-03-17'),  // first date to print
  totalPages: 7,                        // how many pages to generate

  // 2 dates per page → each page advances 2 calendar days
  datesPerPage: 2,

  // (x, y) measured from the bottom-left corner of the page (pdf-lib convention)
  datePositions: [
    { x: 60, y: 680 },   // top slot
    { x: 60, y: 370 },   // bottom slot
  ],

  font:      'Helvetica',          // built-in font name, or path to a .ttf/.otf
  fontSize:  14,                   // point size
  textColor: { r: 0, g: 0, b: 0 }, // black  (each channel: 0–1)

  templatePageIndex: 0,            // which page of the template to repeat
});
```

The function also returns the raw `Uint8Array` bytes of the generated PDF, so
you can pipe them to a HTTP response or an in-memory buffer without touching
the filesystem.

### Quick start

```sh
# 1. Put your template PDF in the project root (or adjust the path above)
# 2. Edit example.js to suit your schedule
node example.js
# → output.pdf is created
```

---

## API

### `generatePlannerSchedule(options)` → `Promise<Uint8Array>`

| Option              | Type                          | Default        | Description |
|---------------------|-------------------------------|----------------|-------------|
| `templatePath`      | `string`                      | **required**   | Filesystem path to the template PDF. |
| `outputPath`        | `string`                      | **required**   | Where to write the generated PDF. |
| `startDate`         | `Date`                        | **required**   | First date to stamp on the schedule. |
| `totalPages`        | `number`                      | **required**   | Number of pages in the output PDF. |
| `datesPerPage`      | `1` \| `2`                    | `1`            | Date slots per page. When `2`, each page advances two calendar days. |
| `datePositions`     | `Array<{x,y}>`                | **required**   | Coordinates for each date label (bottom-left origin). Must have at least `datesPerPage` entries. |
| `font`              | `string`                      | `'Helvetica'`  | Built-in font name **or** path to a `.ttf` / `.otf` file. See table below. |
| `fontSize`          | `number`                      | `12`           | Font size in points. |
| `textColor`         | `{r,g,b}` (0–1 each)         | black          | RGB colour of the date text. |
| `templatePageIndex` | `number`                      | `0`            | Zero-based index of the template page to use as the repeating background. |

### Built-in font names

These names map directly to the PDF standard fonts (no extra data is embedded
in the file, keeping output size minimal):

| Name                    |
|-------------------------|
| `Helvetica`             |
| `HelveticaBold`         |
| `HelveticaOblique`      |
| `HelveticaBoldOblique`  |
| `TimesRoman`            |
| `TimesRomanBold`        |
| `TimesRomanItalic`      |
| `TimesRomanBoldItalic`  |
| `Courier`               |
| `CourierBold`           |
| `CourierOblique`        |
| `CourierBoldOblique`    |

> **Note:** The built-in fonts use WinAnsi encoding, which fully covers all
> PT-BR characters used in date strings (ç, ã, á, é, ê, ó, ú, â, à, …).
> If you need a different typeface, supply the path to a `.ttf` or `.otf` font
> file — it will be embedded with subsetting for the smallest possible footprint.

### Date format

Dates are formatted as:

```
Terça-feira, 17 de Março de 2026
```

The formatter is implemented in `src/dateFormatter.js` and has no external
dependencies.

---

## Project structure

```
src/
  index.js           ← library entry point  (re-exports generatePlannerSchedule)
  pdfGenerator.js    ← core PDF generation logic
  dateFormatter.js   ← PT-BR date helpers
example.js           ← runnable example
```