import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { readFile, writeFile } from 'fs/promises';
import { formatDatePtBr, addDays } from './dateFormatter.js';

/**
 * Map of human-friendly names to pdf-lib StandardFonts values.
 * Use one of these names in the `font` option to avoid embedding a font file.
 */
const STANDARD_FONTS_MAP = {
  Helvetica: StandardFonts.Helvetica,
  HelveticaBold: StandardFonts.HelveticaBold,
  HelveticaOblique: StandardFonts.HelveticaOblique,
  HelveticaBoldOblique: StandardFonts.HelveticaBoldOblique,
  TimesRoman: StandardFonts.TimesRoman,
  TimesRomanBold: StandardFonts.TimesRomanBold,
  TimesRomanItalic: StandardFonts.TimesRomanItalic,
  TimesRomanBoldItalic: StandardFonts.TimesRomanBoldItalic,
  Courier: StandardFonts.Courier,
  CourierBold: StandardFonts.CourierBold,
  CourierOblique: StandardFonts.CourierOblique,
  CourierBoldOblique: StandardFonts.CourierBoldOblique,
};

/**
 * Resolves the font for the given document.
 * - If `fontOption` is a key in STANDARD_FONTS_MAP, the corresponding built-in
 *   PDF font is used (no font data is embedded in the file).
 * - Otherwise `fontOption` is treated as a filesystem path to a .ttf / .otf file,
 *   which is read and embedded with subsetting enabled (smallest possible footprint).
 *
 * NOTE: Built-in PDF fonts use WinAnsi encoding and cover all characters needed
 * for PT-BR date strings (ç, ã, á, é, ê, ó, ú, etc.).  For best rendering on all
 * PDF viewers and printers, providing a custom Unicode-aware font is recommended.
 *
 * @param {PDFDocument} doc
 * @param {string} fontOption
 * @returns {Promise<import('pdf-lib').PDFFont>}
 */
async function resolveFont(doc, fontOption) {
  if (fontOption in STANDARD_FONTS_MAP) {
    return doc.embedFont(STANDARD_FONTS_MAP[fontOption]);
  }

  const fontBytes = await readFile(fontOption);
  return doc.embedFont(fontBytes, { subset: true });
}

/**
 * Validates that all required options are present and have sensible values.
 *
 * @param {object} opts
 */
function validateOptions(opts) {
  const {
    templatePath,
    outputPath,
    startDate,
    totalPages,
    datesPerPage,
    datePositions,
    templatePageIndex,
    dateXAnchor,
    templatePageReuse,
  } = opts;

  if (!templatePath) throw new Error('templatePath is required');
  if (!outputPath) throw new Error('outputPath is required');
  if (!(startDate instanceof Date) || isNaN(startDate.getTime())) {
    throw new Error('startDate must be a valid Date object');
  }
  if (!Number.isInteger(totalPages) || totalPages < 1) {
    throw new Error('totalPages must be a positive integer');
  }
  if (datesPerPage !== 1 && datesPerPage !== 2) {
    throw new Error('datesPerPage must be 1 or 2');
  }
  if (!Array.isArray(datePositions) || datePositions.length < datesPerPage) {
    throw new Error(
      `datePositions must be an array with at least ${datesPerPage} entry/entries when datesPerPage is ${datesPerPage}`,
    );
  }
  for (let i = 0; i < datesPerPage; i++) {
    const pos = datePositions[i];
    if (typeof pos?.x !== 'number' || typeof pos?.y !== 'number') {
      throw new Error(`datePositions[${i}] must be an object with numeric x and y properties`);
    }
  }
  if (!Number.isInteger(templatePageIndex) || templatePageIndex < 0) {
    throw new Error('templatePageIndex must be a non-negative integer');
  }
  if (dateXAnchor !== 'left' && dateXAnchor !== 'right') {
    throw new Error("dateXAnchor must be 'left' or 'right'");
  }
  if (typeof templatePageReuse !== 'boolean') {
    throw new Error('templatePageReuse must be a boolean');
  }
}

/**
 * Generates a planner schedule PDF by repeating a template page and stamping
 * one or two PT-BR formatted dates on each output page.
 *
 * @param {object}  options
 * @param {string}  options.templatePath
 *   Filesystem path to the template PDF whose first (or chosen) page is used as
 *   the background for every output page.
 *
 * @param {string}  options.outputPath
 *   Filesystem path where the generated PDF will be written.
 *
 * @param {Date}    options.startDate
 *   The calendar date printed on the very first date slot of the output PDF.
 *
 * @param {number}  options.totalPages
 *   Total number of pages in the output PDF.
 *
 * @param {number}  [options.datesPerPage=1]
 *   How many date labels appear on each page.  Must be 1 or 2.
 *   When 2, the page counter advances by two days per page so every date is
 *   unique across the whole document.
 *
 * @param {Array<{x: number, y: number}>} options.datePositions
 *   Absolute (x, y) coordinates for each date label measured from the
 *   bottom-left corner of the page (pdf-lib convention).
 *   Must contain at least `datesPerPage` entries.
 *
 * @param {string}  [options.font='Helvetica']
 *   Either a key from the built-in font list (e.g. 'Helvetica', 'TimesRoman')
 *   or an absolute / relative filesystem path to a .ttf / .otf font file.
 *   See README for the full list of built-in font names.
 *
 * @param {number}  [options.fontSize=12]
 *   Point size of the date text.
 *
 * @param {{r: number, g: number, b: number}} [options.textColor={r:0,g:0,b:0}]
 *   RGB colour of the date text.  Each channel is in the range 0–1.
 *
 * @param {number}  [options.templatePageIndex=0]
 *   Zero-based index of the page inside the template PDF to use as the
 *   repeating background.  Defaults to the first page.
 *
 * @param {'left' | 'right'} [options.dateXAnchor='left']
 *   Horizontal anchor for each `datePositions[].x` value.
 *   - `left`: `x` is the left edge of the date text.
 *   - `right`: `x` is the right edge of the date text.
 *
 * @param {boolean} [options.templatePageReuse=true]
 *   When true, the template page is embedded once and reused on every output
 *   page. This keeps visual quality and dimensions unchanged while usually
 *   producing much smaller files for large page counts.
 *
 * @returns {Promise<Uint8Array>} The raw bytes of the generated PDF.
 */
export async function generatePlannerSchedule({
  templatePath,
  outputPath,
  startDate,
  totalPages,
  datesPerPage = 1,
  datePositions,
  font = 'Helvetica',
  fontSize = 12,
  textColor = { r: 0, g: 0, b: 0 },
  templatePageIndex = 0,
  dateXAnchor = 'left',
  templatePageReuse = true,
}) {
  validateOptions({
    templatePath,
    outputPath,
    startDate,
    totalPages,
    datesPerPage,
    datePositions,
    templatePageIndex,
    dateXAnchor,
    templatePageReuse,
  });

  const templateBytes = await readFile(templatePath);
  const templateDoc = await PDFDocument.load(templateBytes);

  if (templatePageIndex >= templateDoc.getPageCount()) {
    throw new Error(
      `templatePageIndex ${templatePageIndex} is out of range – template has ${templateDoc.getPageCount()} page(s)`,
    );
  }

  const outputDoc = await PDFDocument.create();
  const embeddedFont = await resolveFont(outputDoc, font);
  const color = rgb(textColor.r, textColor.g, textColor.b);
  const templatePage = templateDoc.getPage(templatePageIndex);
  const { width: templateWidth, height: templateHeight } = templatePage.getSize();
  const reusableTemplatePage = templatePageReuse ? await outputDoc.embedPage(templatePage) : null;

  let currentDate = new Date(startDate);

  for (let pageIndex = 0; pageIndex < totalPages; pageIndex++) {
    let page;

    if (templatePageReuse) {
      page = outputDoc.addPage([templateWidth, templateHeight]);
      page.drawPage(reusableTemplatePage, {
        x: 0,
        y: 0,
        width: templateWidth,
        height: templateHeight,
      });
    } else {
      [page] = await outputDoc.copyPages(templateDoc, [templatePageIndex]);
      outputDoc.addPage(page);
    }

    for (let slot = 0; slot < datesPerPage; slot++) {
      const label = formatDatePtBr(currentDate);
      const { x, y } = datePositions[slot];
      const textWidth = embeddedFont.widthOfTextAtSize(label, fontSize);
      const drawX = dateXAnchor === 'right' ? x - textWidth : x;

      page.drawText(label, { x: drawX, y, size: fontSize, font: embeddedFont, color });

      currentDate = addDays(currentDate, 1);
    }
  }

  const outputBytes = await outputDoc.save({ useObjectStreams: true });
  await writeFile(outputPath, outputBytes);

  return outputBytes;
}
