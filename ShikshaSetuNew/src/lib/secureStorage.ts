import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import * as Crypto from "expo-crypto";
import * as aesjs from "aes-js";

const ENCRYPTION_KEY_STORE_KEY = "margam_session_encryption_key";

// Get or create the unique session encryption master key from SecureStore
async function getOrCreateMasterKey(): Promise<string> {
  try {
    let key = await SecureStore.getItemAsync(ENCRYPTION_KEY_STORE_KEY);
    if (!key) {
      key = Crypto.randomUUID();
      await SecureStore.setItemAsync(ENCRYPTION_KEY_STORE_KEY, key);
    }
    return key;
  } catch (error) {
    console.error("Failed to retrieve or generate master key from SecureStore:", error);
    return "transient-fallback-key-32186717-380d-4560-84cf-ea5a83a0429f";
  }
}

// Derive key bytes and MAC key from the master key
async function deriveKeys(masterKey: string) {
  const encryptionKeyHex = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    masterKey + "encryption"
  );
  const macKeyHex = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    masterKey + "mac"
  );
  const keyBytes = aesjs.utils.hex.toBytes(encryptionKeyHex);
  return {
    keyBytes,
    macKeyHex,
  };
}

// Encrypt plaintext using aes-js CTR mode with integrity check
async function encrypt(plaintext: string, masterKey: string): Promise<string> {
  const { keyBytes, macKeyHex } = await deriveKeys(masterKey);
  const textBytes = aesjs.utils.utf8.toBytes(plaintext);

  // Generate a random 16-byte IV for the CTR counter
  const iv = new Uint8Array(16);
  Crypto.getRandomValues(iv);

  // Encrypt with AES-CTR
  const aesCtr = new aesjs.ModeOfOperation.ctr(keyBytes, new aesjs.Counter(iv));
  const encryptedBytes = aesCtr.encrypt(textBytes);

  // Convert to hex
  const ivHex = aesjs.utils.hex.fromBytes(iv);
  const ciphertextHex = aesjs.utils.hex.fromBytes(encryptedBytes);

  // Calculate integrity MAC
  const macHex = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    macKeyHex + ivHex + ciphertextHex
  );

  // Stored format: IV (32 hex chars) + Ciphertext + MAC (64 hex chars)
  return ivHex + ciphertextHex + macHex;
}

// Decrypt ciphertext using aes-js CTR mode with integrity verification
async function decrypt(encryptedText: string, masterKey: string): Promise<string | null> {
  // IV is 16 bytes = 32 hex characters. MAC is 32 bytes = 64 hex characters.
  if (encryptedText.length < 96) {
    console.warn("secureStorage: Invalid encrypted text format (too short)");
    return null;
  }

  const ivHex = encryptedText.slice(0, 32);
  const ciphertextHex = encryptedText.slice(32, -64);
  const macHex = encryptedText.slice(-64);

  const { keyBytes, macKeyHex } = await deriveKeys(masterKey);

  // Verify integrity MAC
  const expectedMacHex = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    macKeyHex + ivHex + ciphertextHex
  );

  if (macHex !== expectedMacHex) {
    console.warn("secureStorage: Session payload integrity check failed (possible corruption or tampering)");
    return null;
  }

  // Decrypt
  const iv = aesjs.utils.hex.toBytes(ivHex);
  const ciphertext = aesjs.utils.hex.toBytes(ciphertextHex);

  const aesCtr = new aesjs.ModeOfOperation.ctr(keyBytes, new aesjs.Counter(iv));
  const decryptedBytes = aesCtr.decrypt(ciphertext);

  return aesjs.utils.utf8.fromBytes(decryptedBytes);
}

export const secureStorage = {
  getItem: async (key: string): Promise<string | null> => {
    try {
      const encryptedValue = await AsyncStorage.getItem(key);
      if (!encryptedValue) return null;

      const masterKey = await getOrCreateMasterKey();
      return await decrypt(encryptedValue, masterKey);
    } catch (error) {
      console.error("Failed to decrypt or read session from secureStorage:", error);
      return null;
    }
  },

  setItem: async (key: string, value: string): Promise<void> => {
    try {
      const masterKey = await getOrCreateMasterKey();
      const encryptedValue = await encrypt(value, masterKey);
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
