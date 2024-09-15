// utils/pdfProcessor.ts

import { PDFDocument, rgb, grayscale, PDFName, PDFNumber } from 'pdf-lib';

export async function convertPdfToGrayscale(pdfBytes: Uint8Array): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.load(pdfBytes);
  const pages = pdfDoc.getPages();

  for (const page of pages) {
    const { context, dictionary } = page.node;

    // Safely check if 'Resources' and 'XObject' exist
    const resources = dictionary.lookup(PDFName.of('Resources'), PDFName) as any;
    if (!resources) {
      console.warn('No resources found on this page, skipping...');
      continue; // Skip to the next page if no resources
    }

    const xObjects = resources.lookup(PDFName.of('XObject'), PDFName) as any;

    if (xObjects) {
      const xObjectNames = xObjects.keys();
      for (const xObjectName of xObjectNames) {
        const xObject = xObjects.lookup(xObjectName, PDFName);
        const subtype = xObject.lookup(PDFName.of('Subtype'), PDFName)?.value();

        if (subtype === 'Image') {
          // Convert image to grayscale (if applicable)
          // Skipping actual implementation for now
        }
      }
    }

    // Modify the page's content stream to convert colors to grayscale
    const operators = page.node.getOperators();

    operators.forEach((op: any) => {
      if (op.getName() === 'rg' || op.getName() === 'RG') {
        // Set non-stroking or stroking color to grayscale
        const r = op.getOperands()[0];
        const g = op.getOperands()[1];
        const b = op.getOperands()[2];

        // Convert RGB to grayscale using the luminosity method
        const gray = 0.299 * r + 0.587 * g + 0.114 * b;

        // Replace the color with grayscale
        op.setOperands([gray, gray, gray]);
      }
    });
  }

  const modifiedPdfBytes = await pdfDoc.save();
  return modifiedPdfBytes;
}
