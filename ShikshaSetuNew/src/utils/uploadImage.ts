const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
const lookup = new Uint8Array(256);
for (let i = 0; i < chars.length; i++) {
  lookup[chars.charCodeAt(i)] = i;
}

function decodeBase64(base64: string): ArrayBuffer {
  const cleanBase64 = base64.replace(/[^A-Za-z0-9\+\/=]/g, '');
  let bufferLength = cleanBase64.length * 0.75;
  const len = cleanBase64.length;
  let i;
  let p = 0;
  let encoded1, encoded2, encoded3, encoded4;

  if (cleanBase64[cleanBase64.length - 1] === '=') {
    bufferLength--;
    if (cleanBase64[cleanBase64.length - 2] === '=') {
      bufferLength--;
    }
  }

  const arrayBuffer = new ArrayBuffer(bufferLength);
  const bytes = new Uint8Array(arrayBuffer);

  for (i = 0; i < len; i += 4) {
    encoded1 = lookup[cleanBase64.charCodeAt(i)];
    encoded2 = lookup[cleanBase64.charCodeAt(i + 1)];
    encoded3 = lookup[cleanBase64.charCodeAt(i + 2)];
    encoded4 = lookup[cleanBase64.charCodeAt(i + 3)];

    bytes[p++] = (encoded1 << 2) | (encoded2 >> 4);
    if (p < bufferLength) {
      bytes[p++] = ((encoded2 & 15) << 4) | (encoded3 >> 2);
    }
    if (p < bufferLength) {
      bytes[p++] = ((encoded3 & 3) << 6) | (encoded4 & 63);
    }
  }

  return arrayBuffer;
}

/**
 * Converts a local file URI (e.g., file:// or content://) to an ArrayBuffer.
 * This is the recommended approach for Supabase Storage uploads in React Native
 * to avoid the "Network request failed" error when serializing Blobs over the bridge.
 */
export function uriToArrayBuffer(fileUri: string): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.onload = function () {
      const blob = xhr.response as Blob;
      
      const reader = new FileReader();
      reader.onloadend = () => {
        try {
          const resultStr = reader.result as string;
          const base64 = resultStr.split(',')[1];
          if (!base64) {
            reject(new Error("Failed to extract base64 from file reader"));
            return;
          }
          const arrayBuffer = decodeBase64(base64);
          resolve(arrayBuffer);
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = () => {
        reject(new Error("FileReader failed"));
      };
      reader.readAsDataURL(blob);
    };
    xhr.onerror = function (e) {
      console.error("XHR failed for URI:", fileUri, e);
      reject(new TypeError("Network request failed"));
    };
    xhr.responseType = "blob";
    xhr.open("GET", fileUri, true);
    xhr.send(null);
  });
}
