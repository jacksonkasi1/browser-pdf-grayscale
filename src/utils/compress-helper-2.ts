// utils/compress-helper.ts

export const compressPDF = async (
    inputFile: File,
    onResponse: (data: any) => void,
    onProgress: (finished: boolean, progress: number, total: number) => void,
    onStatus: (text: string) => void
  ): Promise<void> => {
    return new Promise((resolve, reject) => {
      // Initialize the Web Worker
      const worker = new Worker(new URL('/ghostscript-worker.js', window.location.origin), { type: 'module' });
  
      // Handle messages from the worker
      worker.onmessage = (e) => {
        const data = e.data;
        if (data.status) {
          onStatus(data.status);
        }
        if (data.progress !== undefined) {
          onProgress(false, data.progress, 100);
        }
        if (data.pdfDataURL) {
          onResponse(data.pdfDataURL);
          onProgress(true, 100, 100);
          resolve();
          worker.terminate();
        }
        if (data.error) {
          reject(new Error(data.error));
          worker.terminate();
        }
      };
  
      worker.onerror = (e) => {
        reject(new Error(e.message));
        worker.terminate();
      };
  
      // Read the file as ArrayBuffer and send it to the worker
      const reader = new FileReader();
      reader.onload = () => {
        const arrayBuffer = reader.result as ArrayBuffer;
        worker.postMessage({ inputFile: arrayBuffer });
      };
      reader.onerror = () => {
        reject(new Error('Failed to read the file.'));
        worker.terminate();
      };
      reader.readAsArrayBuffer(inputFile);
    });
  };
  