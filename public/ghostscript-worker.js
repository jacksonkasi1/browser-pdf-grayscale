// public/ghostscript-worker.js

self.onmessage = async (e) => {
    const { inputFile } = e.data;
  
    try {
      // Dynamically import gs.js as an ES module
      const ModuleFactory = await import('/gs.js'); // Ensure gs.js is in public/
  
      // Initialize the Emscripten Module
      const Module = await ModuleFactory.default({
        preRun: [
          () => {
            const FS = Module.FS;
            // Write the input PDF to the virtual filesystem
            const data = new Uint8Array(inputFile);
            FS.writeFile('input.pdf', data);
          },
        ],
        postRun: [
          () => {
            const FS = Module.FS;
            try {
              // Read the compressed PDF from the virtual filesystem
              const uarray = FS.readFile('output.pdf', { encoding: 'binary' }); // Uint8Array
              const blob = new Blob([uarray], { type: 'application/pdf' });
              const reader = new FileReader();
              reader.onload = function () {
                const pdfDataURL = reader.result;
                // Send the compressed PDF back to the main thread
                self.postMessage({ success: true, pdfDataURL });
              };
              reader.readAsDataURL(blob);
            } catch (error) {
              console.error('Failed to read output.pdf:', error);
              self.postMessage({ success: false, error: error.message });
            }
          },
        ],
        arguments: [
          '-sDEVICE=pdfwrite',
          '-dCompatibilityLevel=1.4',
          '-dPDFSETTINGS=/ebook',
          '-dNOPAUSE',
          '-dQUIET',
          '-dBATCH',
          '-sOutputFile=output.pdf',
          'input.pdf',
        ],
        print: function (text) {
          // Send status updates to the main thread
          self.postMessage({ status: text });
        },
        printErr: function (text) {
          self.postMessage({ status: 'Error: ' + text });
          console.error(text);
        },
        setStatus: function (text) {
          const m = text.match(/([^(]+)\((\d+(\.\d+)?)\/(\d+)\)/);
          if (m) {
            const progress = (parseFloat(m[2]) / parseFloat(m[4])) * 100;
            self.postMessage({ progress });
          }
        },
        locateFile: (path, prefix) => {
          if (path.endsWith('.wasm')) {
            return '/gs.wasm'; // gs.wasm is in public/
          }
          return `${prefix}${path}`;
        },
      });
  
      // Execute the main function of the Module
      Module.callMain(Module.arguments);
    } catch (error) {
      console.error('Compression failed:', error);
      self.postMessage({ success: false, error: error.message });
    }
  };
  