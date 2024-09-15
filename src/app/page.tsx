// app/page.tsx

'use client';

import { useState } from 'react';
import { convertPdfToGrayscale } from '@/utils/pdfProcessor';

export default function Home() {
  const [originalPdf, setOriginalPdf] = useState<Uint8Array | null>(null);
  const [grayscalePdf, setGrayscalePdf] = useState<Uint8Array | null>(null);
  const [processing, setProcessing] = useState(false);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async () => {
        const arrayBuffer = reader.result as ArrayBuffer;
        setOriginalPdf(new Uint8Array(arrayBuffer));
      };
      reader.readAsArrayBuffer(file);
    }
  };

  const handleConvert = async () => {
    if (!originalPdf) return;
    setProcessing(true);
    try {
      const result = await convertPdfToGrayscale(originalPdf);
      setGrayscalePdf(result);
    } catch (error) {
      console.error('Conversion failed:', error);
      alert('Failed to convert PDF to grayscale.');
    }
    setProcessing(false);
  };

  const handleDownload = () => {
    if (!grayscalePdf) return;
    const blob = new Blob([grayscalePdf], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'grayscale.pdf';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ padding: '2rem' }}>
      <h1>PDF Color to Grayscale Converter</h1>
      <input type="file" accept="application/pdf" onChange={handleFileUpload} />
      {originalPdf && (
        <div style={{ marginTop: '1rem' }}>
          <button onClick={handleConvert} disabled={processing}>
            {processing ? 'Converting...' : 'Convert to Grayscale'}
          </button>
        </div>
      )}
      {grayscalePdf && (
        <div style={{ marginTop: '1rem' }}>
          <button onClick={handleDownload}>Download Grayscale PDF</button>
        </div>
      )}
    </div>
  );
}
