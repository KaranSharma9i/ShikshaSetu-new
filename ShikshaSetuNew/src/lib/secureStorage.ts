import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import * as Crypto from "expo-crypto";

const ENCRYPTION_KEY_STORE_KEY = "margam_session_encryption_key";

// Helper: Convert string to UTF-8 byte array
function stringToUtf8ByteArray(str: string): number[] {
  const bytes: number[] = [];
  for (let i = 0; i < str.length; i++) {
    let code = str.charCodeAt(i);
    if (code < 0x80) {
      bytes.push(code);
    } else if (code < 0x800) {
      bytes.push(0xc0 | (code >> 6), 0x80 | (code & 0x3f));
    } else if (code < 0xd800 || code >= 0xe000) {
      bytes.push(0xe0 | (code >> 12), 0x80 | ((code >> 6) & 0x3f), 0x80 | (code & 0x3f));
    } else {
      i++;
      code = 0x10000 + (((code & 0x3ff) << 10) | (str.charCodeAt(i) & 0x3ff));
      bytes.push(0xf0 | (code >> 18), 0x80 | ((code >> 12) & 0x3f), 0x80 | ((code >> 6) & 0x3f), 0x80 | (code & 0x3f));
    }
  }
  return bytes;
}

// Helper: Convert UTF-8 byte array to string
function utf8ByteArrayToString(bytes: number[]): string {
  let str = "";
  let i = 0;
  while (i < bytes.length) {
    const b = bytes[i++];
    if (b < 0x80) {
      str += String.fromCharCode(b);
    } else if (b < 0xe0) {
      str += String.fromCharCode(((b & 0x1f) << 6) | (bytes[i++] & 0x3f));
    } else if (b < 0xf0) {
      str += String.fromCharCode(((b & 0x0f) << 12) | ((bytes[i++] & 0x3f) << 6) | (bytes[i++] & 0x3f));
    } else {
      let code = ((b & 0x07) << 18) | ((bytes[i++] & 0x3f) << 12) | ((bytes[i++] & 0x3f) << 6) | (bytes[i++] & 0x3f);
      code -= 0x10000;
      str += String.fromCharCode(0xd800 | (code >> 10), 0xdc00 | (code & 0x3ff));
    }
  }
  return str;
}

// Helper: Convert bytes to hex string
function bytesToHex(bytes: number[]): string {
  return bytes.map(b => b.toString(16).padStart(2, "0")).join("");
}

// Helper: Convert hex string to bytes
function hexToBytes(hex: string): number[] {
  const bytes: number[] = [];
  for (let i = 0; i < hex.length; i += 2) {
    const hexSlice = hex.slice(i, i + 2);
    bytes.push(parseInt(hexSlice, 16));
  }
  return bytes;
}

// Helper: Encrypt plaintext using SHA-256 CTR stream cipher
async function encrypt(plaintext: string, secretKey: string): Promise<string> {
  const plaintextBytes = stringToUtf8ByteArray(plaintext);
  const nonce = Crypto.randomUUID().replace(/-/g, "").slice(0, 32);
  const ciphertextBytes: number[] = [];
  const blockSize = 32;

  for (let i = 0; i < plaintextBytes.length; i += blockSize) {
    const blockIndex = Math.floor(i / blockSize);
    const hashHex = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA_256,
      secretKey + nonce + blockIndex
    );
    const keystreamBytes = hexToBytes(hashHex);

    for (let j = 0; j < blockSize && (i + j) < plaintextBytes.length; j++) {
      ciphertextBytes.push(plaintextBytes[i + j] ^ keystreamBytes[j]);
    }
  }

  return nonce + bytesToHex(ciphertextBytes);
}

// Helper: Decrypt ciphertext using SHA-256 CTR stream cipher
async function decrypt(encryptedText: string, secretKey: string): Promise<string> {
  if (encryptedText.length < 32) {
    throw new Error("Invalid encrypted text format");
  }

  const nonce = encryptedText.slice(0, 32);
  const ciphertextHex = encryptedText.slice(32);
  const ciphertextBytes = hexToBytes(ciphertextHex);
  const plaintextBytes: number[] = [];
  const blockSize = 32;

  for (let i = 0; i < ciphertextBytes.length; i += blockSize) {
    const blockIndex = Math.floor(i / blockSize);
    const hashHex = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA_256,
      secretKey + nonce + blockIndex
    );
    const keystreamBytes = hexToBytes(hashHex);

    for (let j = 0; j < blockSize && (i + j) < ciphertextBytes.length; j++) {
      plaintextBytes.push(ciphertextBytes[i + j] ^ keystreamBytes[j]);
    }
  }

  return utf8ByteArrayToString(plaintextBytes);
}

// Get or create the unique session encryption key from SecureStore
async function getOrCreateEncryptionKey(): Promise<string> {
  try {
    let key = await SecureStore.getItemAsync(ENCRYPTION_KEY_STORE_KEY);
    if (!key) {
      key = Crypto.randomUUID();
      await SecureStore.setItemAsync(ENCRYPTION_KEY_STORE_KEY, key);
    }
    return key;
  } catch (error) {
    console.error("Failed to retrieve or generate encryption key from SecureStore:", error);
    // Fallback to a transient key if SecureStore fails
    return "transient-fallback-key-32186717-380d-4560-84cf-ea5a83a0429f";
  }
}

export const secureStorage = {
  getItem: async (key: string): Promise<string | null> => {
    try {
      const encryptedValue = await AsyncStorage.getItem(key);
      if (!encryptedValue) return null;

      const secretKey = await getOrCreateEncryptionKey();
      return await decrypt(encryptedValue, secretKey);
    } catch (error) {
      console.error("Failed to decrypt or read session from secureStorage:", error);
      return null;
    }
  },

  setItem: async (key: string, value: string): Promise<void> => {
    try {
      const secretKey = await getOrCreateEncryptionKey();
      const encryptedValue = await encrypt(value, secretKey);
      await AsyncStorage.setItem(key, encryptedValue);
    } catch (error) {
      console.error("Failed to encrypt or save session to secureStorage:", error);
    }
  },

  removeItem: async (key: string): Promise<void> => {
    try {
      await AsyncStorage.removeItem(key);
    } catch (error) {
      console.error("Failed to remove session from secureStorage:", error);
    }
  },
};
