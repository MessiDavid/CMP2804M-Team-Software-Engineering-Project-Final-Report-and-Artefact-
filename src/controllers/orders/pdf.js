const PDFDocument = require("pdfkit");
const fs = require("fs");

// Create a document
const doc = new PDFDocument();

doc.pipe(fs.createWriteStream("output.pdf"));

doc
  .fontSize(10)
  .text(
    "Here is some vector graphics...\nHere is some vector graphics...",
    100,
    100
  );

// Finalize PDF file
doc.end();
