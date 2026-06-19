/**
 * Converts a file URI (local path or content provider URI) to a Blob.
 * React Native's XMLHttpRequest is used because the standard fetch API
 * does not support file:// or content:// schemes on all platforms.
 */
export function uriToBlob(fileUri: string): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.onload = function () {
      resolve(xhr.response);
    };
    xhr.onerror = function (e) {
      console.error("XHR conversion failed for URI:", fileUri, e);
      reject(new TypeError("Network request failed"));
    };
    xhr.responseType = "blob";
    xhr.open("GET", fileUri, true);
    xhr.send(null);
  });
}
