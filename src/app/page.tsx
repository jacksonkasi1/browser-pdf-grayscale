
'use client';

import React, { useState } from 'react';
import { compressPDF } from '@/utils/compress-helper';
import 'regenerator-runtime/runtime'; // Ensure regenerator-runtime is loaded for async functions

const CompressPage: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [compressedFileUrl, setCompressedFileUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string>('');
  const [progress, setProgress] = useState<number>(0);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      setFile(event.target.files[0]);
      setCompressedFileUrl(null); // Reset previous result
      setStatus('');
      setProgress(0);
    }
  };

  const handleCompress = async () => {
    if (!file) return;

    setLoading(true);
    setStatus('');
    setProgress(0);

    try {
      await compressPDF(
        file,
        (pdfDataURL: string) => {
          setCompressedFileUrl(pdfDataURL);
          setStatus('Compression completed successfully.');
        },
        (finished: boolean, progressValue: number, totalValue: number) => {
          setProgress(progressValue);
        },
        (text: string) => {
          setStatus(text);
        }
      );
    } catch (error: any) {
      console.error('Compression failed:', error);
      setStatus(`Compression failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <h1>Compress PDF</h1>

      <input type="file" accept="application/pdf" onChange={handleFileChange} />

      <button onClick={handleCompress} disabled={loading || !file}>
        {loading ? 'Compressing...' : 'Compress PDF'}
      </button>

      {status && <p style={styles.status}>{status}</p>}

      {loading && (
        <div style={styles.progressContainer}>
          <progress value={progress} max={100}></progress>
          <span>{progress.toFixed(2)}%</span>
        </div>
      )}

      {compressedFileUrl && (
        <div style={styles.resultContainer}>
          <a href={compressedFileUrl} download={file?.name.replace('.pdf', '-compressed.pdf')}>
            Download Compressed PDF
          </a>
        </div>
      )}
    </div>
  );
};

// Simple styling for this page
const styles: { [key: string]: React.CSSProperties } = {
  container: {
    textAlign: 'center',
    margin: '20px',
  },
  resultContainer: {
    marginTop: '20px',
  },
  progressContainer: {
    marginTop: '20px',
  },
  status: {
    marginTop: '20px',
    color: 'green',
  },
};

export default CompressPage;
