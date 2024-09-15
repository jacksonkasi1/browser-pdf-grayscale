'use client';

// Import regenerator-runtime before any other imports
import "regenerator-runtime/runtime";

import React, { useState } from 'react';

import { runWasm } from '@/utils/compress-helper';

const CompressPage: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [compressedFileUrl, setCompressedFileUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      setFile(event.target.files[0]);
      setCompressedFileUrl(null); // Reset previous result
    }
  };

  const handleCompress = async () => {
    if (!file) return;

    setLoading(true);
    try {
      const compressedBlob = await runWasm(file);

      // Create a URL for the compressed PDF file
      const url = URL.createObjectURL(compressedBlob);
      setCompressedFileUrl(url);
    } catch (error) {
      console.error('Compression failed:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div >
      <h1>Compress PDF</h1>

      <input type="file" accept="application/pdf" onChange={handleFileChange} />

      <button onClick={handleCompress} disabled={loading || !file}>
        {loading ? 'Compressing...' : 'Compress PDF'}
      </button>

      {compressedFileUrl && (
        <div style={styles.resultContainer}>
          <a href={compressedFileUrl} download="compressed.pdf">
            Download Compressed PDF
          </a>
        </div>
      )}
    </div>
  );
};

// Simple styling for this page
const styles = {
  container: {
    textAlign: 'center',
    margin: '20px',
  },
  resultContainer: {
    marginTop: '20px',
  },
};

export default CompressPage;
