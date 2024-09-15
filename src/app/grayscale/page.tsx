"use client";

// Import regenerator-runtime before any other imports
import "regenerator-runtime/runtime";

import React, { useEffect, useState, useCallback } from "react";
// @ts-ignore
import { BFSRequire, configure } from "browserfs";
// @ts-ignore
import { promisifyAll } from "bluebird";
import { downloadFile, readFileAsync, runWasm } from "@/utils/helper";

const Grayscale = () => {
  const [isConverting, setIsConverting] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [message, setMessage] = useState<string>("");

  // Initialize BrowserFS
  const init = useCallback(async () => {
    configure(
      {
        fs: "InMemory",
      },
      function (e: any) {
        if (e) {
          console.error("BrowserFS configuration error:", e);
          return;
        }
        const fs = promisifyAll(BFSRequire("fs"));
        (window as any).fs = fs;
        (window as any).Buffer = BFSRequire("buffer").Buffer;
      }
    );
  }, []);

  useEffect(() => {
    init();
  }, [init]);

  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);
      setFiles(selectedFiles);
    }
  };

  // Convert PDFs to Grayscale
  const convertToGrayscale = async () => {
    setIsConverting(true);
    setMessage("Starting conversion...");

    for (const file of files) {
      setMessage(`Processing ${file.name}...`);
      try {
        await readFileAsync(file, files, setFiles);

        const inputPath = `/${file.name}`;
        const outputPath = `/${file.name.replace(/\.[^/.]+$/, "")}-grayscale.pdf`;

        // Run pdfcpu to convert to grayscale
        const exitCode = await runWasm([
          "pdfcpu.wasm",
          "colorspace",
          "-mode",
          "grayscale",
          inputPath,
          outputPath,
        ]);

        if (exitCode !== 0) {
          setMessage(`Failed to convert ${file.name}`);
          continue;
        }

        // Download the converted file
        await downloadFile((window as any).fs, outputPath);

        // Clean up
        await (window as any).fs.unlinkAsync(inputPath);
        await (window as any).fs.unlinkAsync(outputPath);

        setMessage(`Successfully converted ${file.name}`);
      } catch (error) {
        console.error(`Error processing ${file.name}:`, error);
        setMessage(`Error processing ${file.name}`);
      }
    }

    setIsConverting(false);
    setFiles([]);
    setMessage("Conversion completed.");
  };

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>Convert PDF to Grayscale</h1>
      <input
        type="file"
        accept="application/pdf"
        multiple
        onChange={handleFileChange}
        style={styles.input}
      />
      {files.length > 0 && (
        <div style={styles.fileList}>
          <h3>Selected Files:</h3>
          <ul>
            {files.map((file, index) => (
              <li key={index}>{file.name}</li>
            ))}
          </ul>
        </div>
      )}
      <button
        onClick={convertToGrayscale}
        disabled={isConverting || files.length === 0}
        style={styles.button}
      >
        {isConverting ? "Converting..." : "Convert to Grayscale"}
      </button>
      {message && <p style={styles.message}>{message}</p>}
    </div>
  );
};

// Simple inline styles for basic styling
const styles: { [key: string]: React.CSSProperties } = {
  container: {
    maxWidth: "600px",
    margin: "50px auto",
    padding: "20px",
    border: "1px solid #ddd",
    borderRadius: "8px",
    textAlign: "center",
    fontFamily: "Arial, sans-serif",
  },
  title: {
    marginBottom: "20px",
  },
  input: {
    marginBottom: "20px",
  },
  fileList: {
    textAlign: "left",
    marginBottom: "20px",
  },
  button: {
    padding: "10px 20px",
    fontSize: "16px",
    cursor: "pointer",
    borderRadius: "4px",
    border: "none",
    backgroundColor: "#3182CE",
    color: "#fff",
  },
  message: {
    marginTop: "20px",
    color: "#2D3748",
  },
};

export default Grayscale;
