// utils/compress-helper.ts

export const compressPDF = (
    pdfFile: File,
    filename: string,
    responseCallback: (element: any) => void,
    progressCallback: (finished: boolean, progress: number, total: number) => void,
    statusUpdateCallback: (text: string) => void
  ): Promise<void> => {
    return new Promise((resolve, reject) => {
      const fileReader = new FileReader();
  
      fileReader.onload = function (event: ProgressEvent<FileReader>) {
        const arrayBuffer = event.target?.result as ArrayBuffer;
        const uint8Array = new Uint8Array(arrayBuffer);
  
        // Create a temporary URL for the input PDF
        const inputBlob = new Blob([uint8Array], { type: "application/pdf" });
        const psDataURL = URL.createObjectURL(inputBlob);
  
        // Define the Module object for Emscripten
        (window as any).Module = {
          preRun: [
            function () {
              const FS = (window as any).FS;
              // Load the input PDF into the virtual filesystem
              fetch(psDataURL)
                .then((response) => response.arrayBuffer())
                .then((arrayBuffer) => {
                  const data = new Uint8Array(arrayBuffer);
                  FS.writeFile("input.pdf", data);
                })
                .catch((error) => {
                  console.error("Failed to load input.pdf:", error);
                  reject(error);
                });
            },
          ],
          postRun: [
            function () {
              const FS = (window as any).FS;
              try {
                const uarray = FS.readFile("output.pdf", { encoding: "binary" }); // Uint8Array
                const blob = new Blob([uarray], { type: "application/octet-stream" });
                const pdfDataURL = window.URL.createObjectURL(blob);
                responseCallback({ pdfDataURL: pdfDataURL, url: filename });
                resolve();
              } catch (error) {
                console.error("Failed to read output.pdf:", error);
                reject(error);
              }
            },
          ],
          arguments: [
            "-sDEVICE=pdfwrite",
            "-dCompatibilityLevel=1.4",
            "-dPDFSETTINGS=/ebook",
            "-dNOPAUSE",
            "-dQUIET",
            "-dBATCH",
            "-sOutputFile=output.pdf",
            "input.pdf",
          ],
          print: function (text: string) {
            statusUpdateCallback(text);
          },
          printErr: function (text: string) {
            statusUpdateCallback("Error: " + text);
            console.error(text);
          },
          setStatus: function (text: string) {
            if (!(Module.setStatus.last)) {
              Module.setStatus.last = { time: Date.now(), text: "" };
            }
            if (text === Module.setStatus.last.text) return;
            const m = text.match(/([^(]+)\((\d+(\.\d+)?)\/(\d+)\)/);
            const now = Date.now();
            if (m && now - Module.setStatus.last.time < 30)
              // if this is a progress update, skip it if too soon
              return;
            Module.setStatus.last.time = now;
            Module.setStatus.last.text = text;
            if (m) {
              text = m[1];
              progressCallback(false, parseInt(m[2]) * 100, parseInt(m[4]) * 100);
            } else {
              progressCallback(true, 0, 0);
            }
            statusUpdateCallback(text);
          },
          totalDependencies: 0,
        };
  
        // Load gs.js to trigger the WebAssembly processing
        const script = document.createElement("script");
        script.src = "/gs.js"; // Ensure gs.js is in public/
        script.onload = () => {
          console.log("gs.js loaded and running");
          // Ghostscript will start processing automatically via Emscripten's Module
        };
        script.onerror = () => {
          console.error("Failed to load gs.js");
          reject(new Error("Failed to load gs.js"));
        };
        document.body.appendChild(script);
      };
  
      fileReader.onerror = function () {
        reject(new Error("Failed to read the file"));
      };
  
      fileReader.readAsArrayBuffer(pdfFile);
    });
  };
  