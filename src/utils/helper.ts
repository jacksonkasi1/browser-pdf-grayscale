// utils/helper.ts

import download from "downloadjs";
import JSZip from "jszip";
import path from "path";

declare global {
  interface Window {
    cachedWasmResponse?: ArrayBuffer;
    go: any;
  }
}

declare var fs: any;

// Download a single file
export const downloadFile = async (fs: any, file: string): Promise<void> => {
  try {
    const data = await fs.readFileAsync(file);
    const blob = new Blob([data], { type: "application/pdf" });
    download(blob, file.replace(/^\.\//, ""), "application/pdf");
  } catch (error) {
    console.error("Download failed:", error);
    throw error;
  }
};

// Read and validate a file asynchronously
export const readFileAsync = (
  file: File,
  files: File[],
  setFiles: React.Dispatch<React.SetStateAction<File[]>>
): Promise<ArrayBuffer | void> => {
  return new Promise((resolve, reject) => {
    console.log(`Writing ${file.name} to disk`);
    if ((file as any).isLoaded) return resolve();

    const reader = new FileReader();
    (reader as any).fileName = file.name;

    reader.onload = async (e: ProgressEvent<FileReader>) => {
      try {
        const result = e.target?.result;
        if (!result) throw new Error("File reading failed");

        const data = (result as ArrayBuffer).slice(0);
        await fs.writeFileAsync(`/${(reader as any).fileName}`, Buffer.from(data));

        const exitCode = await runWasm([
          "pdfcpu.wasm",
          "validate",
          "-c",
          "disable",
          `/${(reader as any).fileName}`,
        ]);

        if (exitCode !== 0) {
          return reject(new Error("Validation failed"));
        }

        const updatedFiles = files.map((f) => {
          if (f.name === path.basename((reader as any).fileName)) {
            (f as any).validated = true;
            (f as any).isLoaded = true;
          }
          return f;
        });

        setFiles(updatedFiles);
        resolve(reader.result);
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = () => {
      reject(new Error("File reading failed"));
    };

    reader.readAsArrayBuffer(file);
  });
};

// Download and zip a folder
export const downloadAndZipFolder = async (
  fs: any,
  mode: string,
  downloadName: string
): Promise<void> => {
  try {
    let files = await fs.readdirAsync(`./${mode}`);
    files = files.map((filename: string) => path.join(`./${mode}`, filename));

    const zip = new JSZip();
    for (const filePath of files) {
      const data = await fs.readFileAsync(filePath);
      await fs.unlinkAsync(filePath);
      zip.file(filePath.replace(`${mode}/`, ""), data);
    }

    const blob = await zip.generateAsync({ type: "blob" });
    download(blob, `${downloadName}.zip`, "application/zip");

    await fs.rmdirAsync(`./${mode}`);
  } catch (error) {
    console.error("Zipping failed:", error);
    throw error;
  }
};

// Load and run WebAssembly with given parameters
export const runWasm = async (params: string[]): Promise<number> => {
  try {
    // Load wasm_exec.js if Go is not defined
    if (typeof window.go === "undefined") {
      await new Promise<void>((resolve, reject) => {
        const script = document.createElement("script");
        script.src = "/wasm_exec.js"; // Ensure this path is correct
        script.onload = () => {
            // @ts-ignore
          if (typeof Go !== "undefined") {
            // @ts-ignore
            window.go = new Go();
            resolve();
          } else {
            reject(new Error("Go is not defined after wasm_exec.js load"));
          }
        };
        script.onerror = () => {
          reject(new Error("Failed to load wasm_exec.js"));
        };
        document.body.appendChild(script);
      });
    }

    if (window.cachedWasmResponse === undefined) {
      const response = await fetch("/pdfcpu.wasm");
      const buffer = await response.arrayBuffer();
      window.cachedWasmResponse = buffer;
    }

    const { instance } = await WebAssembly.instantiate(
      window.cachedWasmResponse,
      window.go.importObject
    );
    window.go.argv = params;
    await window.go.run(instance);
    return window.go.exitCode;
  } catch (error) {
    console.error("WASM execution failed:", error);
    return 1;
  }
};
