/**
 * Example usage of planner-schedule-generator.
 *
 * Run with:  node example.js
 *
 * Generates a 7-page PDF from template.pdf.  Each page has two date labels
 * so the output covers 14 consecutive days starting from 2026-03-17.
 */

import { generatePlannerSchedule } from './src/index.js';

await generatePlannerSchedule({
  templatePath: './template.pdf',
  outputPath: './output.pdf',

  // First date that will appear in the schedule
  startDate: new Date(2026, 2, 17),

  // How many pages to generate
  totalPages: 7,

  // Two date labels per page – the counter advances by 2 days each page
  datesPerPage: 2,

  // Coordinates (x, y) measured from the bottom-left corner of the page
  datePositions: [
    { x: 60, y: 680 }, // top half of the page
    { x: 60, y: 370 }, // bottom half of the page
  ],

  // Built-in font name (no external file needed)
  font: 'Helvetica',

  fontSize: 14,

  // Black text (each channel 0–1)
  textColor: { r: 0, g: 0, b: 0 },

  // Use the first page of template.pdf as the repeating background
  templatePageIndex: 0,
});

console.log('output.pdf generated successfully');
