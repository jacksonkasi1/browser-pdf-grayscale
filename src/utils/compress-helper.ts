// utils/helper.ts

export const loadWasmScript = (url: string) => {
  return new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = url;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load wasm_exec.js"));
    document.body.appendChild(script);
  });
};

export const runWasm = async (inputFile: Blob): Promise<Blob> => {
  await loadWasmScript("/wasm_exec.js");

  return new Promise((resolve, reject) => {
    if (typeof Go === "undefined") {
      return reject(new Error("Go is not defined after wasm_exec.js load"));
    }

    const go = new Go(); // Go runtime object from wasm_exec.js

    fetch("/gs.wasm")
      .then((response) => response.arrayBuffer())
      .then((bytes) => WebAssembly.instantiate(bytes, go.importObject))
      .then((result) => {
        console.log("result.module"); // Check what imports it expects
        console.log(result.module); // Check what imports it expects

        const instance = result.instance;
        go.run(instance); // Run Go WebAssembly

        const fileReader = new FileReader();
        fileReader.onload = function (event) {
          const fileData = new Uint8Array(event.target?.result as ArrayBuffer);

          // Pass the file data to the WebAssembly function and compress the PDF
          const compressedFile = instance.exports.compressFile(fileData);

          // Convert the output to a Blob and resolve it
          const outputBlob = new Blob([compressedFile], {
            type: "application/pdf",
          });
          resolve(outputBlob);
        };

        fileReader.readAsArrayBuffer(inputFile);
      })
      .catch(reject);
  });
};
