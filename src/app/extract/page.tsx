"use client";


// Import regenerator-runtime before any other imports
import "regenerator-runtime/runtime";

import React, { useEffect, useState, useCallback } from "react";

// @ts-ignore
import { BFSRequire, configure } from "browserfs";
// @ts-ignore
import { promisifyAll } from "bluebird";

import { downloadFile, readFileAsync, runWasm } from "@/utils/helper";

const Extract = () => {
  const [isExtracting, setIsExtracting] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [selectedMode, setSelectedMode] = useState<string>("meta"); // Default to metadata
  const [extractedData, setExtractedData] = useState<any>(null);
  const [error, setError] = useState<string>("");

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
      setExtractedData(null); // Reset previous data
      setError("");
    }
  };

  // Handle mode selection
  const handleModeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedMode(e.target.value);
    setExtractedData(null); // Reset previous data
    setError("");
  };

  // Extract information
  const extractInformation = async () => {
    setIsExtracting(true);
    setExtractedData(null);
    setError("");

    if (files.length === 0) {
      setError("Please upload at least one PDF file.");
      setIsExtracting(false);
      return;
    }

    const file = files[0]; // For POC, handle single file
    try {
      await readFileAsync(file, files, setFiles);

      const inputPath = `/${file.name}`;
      const outputPath = `./extracted`; // Directory to store extracted data

      // Run pdfcpu to extract information
      const exitCode = await runWasm([
        "pdfcpu.wasm",
        "extract",
        "-m",
        selectedMode,
        "-c",
        "disable",
        inputPath,
        outputPath,
      ]);

      if (exitCode !== 0) {
        setError(`Failed to extract ${selectedMode} from ${file.name}.`);
        setIsExtracting(false);
        return;
      }

      // Depending on the mode, read the extracted data
      let data: any = null;

      switch (selectedMode) {
        case "meta":
          // Read metadata from extracted directory
          data = await readMetadata(outputPath, file.name);
          break;
        case "content":
          // Read content (text) from extracted directory
          data = await readContent(outputPath, file.name);
          break;
        // Add more cases as needed (images, fonts, pages)
        default:
          data = "Extraction mode not supported yet.";
      }

      setExtractedData(data);

      // Cleanup: remove extracted files
      await (window as any).fs.rmdirAsync(outputPath, { recursive: true });
      await (window as any).fs.unlinkAsync(inputPath);
      setFiles([]);
    } catch (err: any) {
      console.error(`Error processing ${file.name}:`, err);
      setError(`Error processing ${file.name}: ${err.message}`);
    }

    setIsExtracting(false);
  };

  // Function to read metadata
  const readMetadata = async (outputDir: string, originalFileName: string) => {
    try {
      const metaFilePath = `${outputDir}/meta.json`; // Assuming pdfcpu outputs metadata as meta.json
      const metaData = await (window as any).fs.readFileAsync(metaFilePath, "utf-8");
      return JSON.parse(metaData);
    } catch (err) {
      console.error("Failed to read metadata:", err);
      return "Failed to read metadata.";
    }
  };

  // Function to read content (text)
  const readContent = async (outputDir: string, originalFileName: string) => {
    try {
      const contentFilePath = `${outputDir}/content.txt`; // Assuming pdfcpu outputs content as content.txt
      const contentData = await (window as any).fs.readFileAsync(contentFilePath, "utf-8");
      return contentData;
    } catch (err) {
      console.error("Failed to read content:", err);
      return "Failed to read content.";
    }
  };

  // Function to copy text to clipboard
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(
      () => {
        alert("Copied to clipboard!");
      },
      (err: any) => {
        alert(`Failed to copy:  ${err?.message || 'Unkown'}`);
      }
    );
  };

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>Extract PDF Information</h1>

      <input
        type="file"
        accept="application/pdf"
        onChange={handleFileChange}
        style={styles.input}
      />

      <div style={styles.modeContainer}>
        <label htmlFor="mode">Select Extraction Mode:</label>
        <select id="mode" value={selectedMode} onChange={handleModeChange} style={styles.select}>
          <option value="meta">Metadata</option>
          <option value="content">Content (Text)</option>
          {/* Add more options as needed */}
        </select>
      </div>

      <button
        onClick={extractInformation}
        disabled={isExtracting || files.length === 0}
        style={styles.button}
      >
        {isExtracting ? "Extracting..." : "Extract"}
      </button>

      {error && <p style={styles.error}>{error}</p>}

      {extractedData && (
        <div style={styles.resultContainer}>
          <h2>Extracted Information:</h2>
          {selectedMode === "meta" && typeof extractedData === "object" ? (
            <pre style={styles.pre}>
              {JSON.stringify(extractedData, null, 2)}
              <button
                onClick={() => copyToClipboard(JSON.stringify(extractedData, null, 2))}
                style={styles.copyButton}
              >
                Copy
              </button>
            </pre>
          ) : selectedMode === "content" && typeof extractedData === "string" ? (
            <div>
              <textarea
                value={extractedData}
                readOnly
                rows={10}
                cols={80}
                style={styles.textarea}
              ></textarea>
              <button
                onClick={() => copyToClipboard(extractedData)}
                style={styles.copyButton}
              >
                Copy
              </button>
            </div>
          ) : (
            <p>{extractedData}</p>
          )}
        </div>
      )}
    </div>
  );
};

// Simple inline styles for basic styling
const styles: { [key: string]: React.CSSProperties } = {
  container: {
    maxWidth: "800px",
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
  modeContainer: {
    marginBottom: "20px",
  },
  select: {
    marginLeft: "10px",
    padding: "5px",
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
  error: {
    color: "red",
    marginTop: "20px",
  },
  resultContainer: {
    marginTop: "30px",
    textAlign: "left",
  },
  pre: {
    backgroundColor: "#f4f4f4",
    padding: "10px",
    borderRadius: "4px",
    position: "relative",
  },
  textarea: {
    width: "100%",
    padding: "10px",
    fontSize: "14px",
    borderRadius: "4px",
    border: "1px solid #ccc",
    resize: "vertical",
  },
  copyButton: {
    position: "absolute",
    top: "10px",
    right: "10px",
    padding: "5px 10px",
    fontSize: "12px",
    cursor: "pointer",
    borderRadius: "4px",
    border: "none",
    backgroundColor: "#48BB78",
    color: "#fff",
  },
};

export default Extract;
