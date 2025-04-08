// Utilities for handling encryption and key exchange using Diffie-Hellman
import CryptoJS from 'crypto-js';

const isBigIntSupported = typeof BigInt !== 'undefined';


if (!isBigIntSupported) {
  console.error('BigInt is not supported in this environment. The application may not work correctly.');
}

const safeBigInt = (value) => {
  if (!isBigIntSupported) {
    throw new Error('BigInt is not supported in this browser. Please use a modern browser.');
  }
  return BigInt(value);
};

const PRIME = safeBigInt('115792089237316195423570985008687907853269984665640564039457584007908834671663');
const GENERATOR = safeBigInt(2);

export const generatePrivateKey = () => {
  try {
    const privateKeyBytes = new Uint8Array(32);
    window.crypto.getRandomValues(privateKeyBytes);
    
    let privateKeyBigInt = safeBigInt(0);
    for (let i = 0; i < privateKeyBytes.length; i++) {
      privateKeyBigInt = (privateKeyBigInt << safeBigInt(8)) + safeBigInt(privateKeyBytes[i]);
    }
    
    return privateKeyBigInt.toString();
  } catch (error) {
    console.error('Error generating private key:', error);
    throw new Error('Failed to generate cryptographic key. Please use a modern browser.');
  }
};

export const calculatePublicKey = (privateKey) => {
  try {
    const privateKeyBigInt = safeBigInt(privateKey);
    let result = safeBigInt(1);
    let base = GENERATOR;
    let exponent = privateKeyBigInt;
    
    while (exponent > safeBigInt(0)) {
      if (exponent % safeBigInt(2) === safeBigInt(1)) {
        result = (result * base) % PRIME;
      }
      
      base = (base * base) % PRIME;
      exponent = exponent >> safeBigInt(1);
    }
    
    return result.toString();
  } catch (error) {
    console.error('Error calculating public key:', error);
    throw new Error('Failed to calculate public key. Please use a modern browser.');
  }
};

export const calculateSharedSecret = (privateKey, peerPublicKey) => {
  try {
    const privateKeyBigInt = safeBigInt(privateKey);
    const peerPublicKeyBigInt = safeBigInt(peerPublicKey);
    
    let result = safeBigInt(1);
    let base = peerPublicKeyBigInt;
    let exponent = privateKeyBigInt;
    
    while (exponent > safeBigInt(0)) {
      if (exponent % safeBigInt(2) === safeBigInt(1)) {
        result = (result * base) % PRIME;
      }
      
      base = (base * base) % PRIME;
      exponent = exponent >> safeBigInt(1);
    }
    
    return result.toString();
  } catch (error) {
    console.error('Error calculating shared secret:', error);
    throw new Error('Failed to calculate shared secret. Please use a modern browser.');
  }
};

export const deriveEncryptionKey = (sharedSecret) => {
  try {
    return CryptoJS.SHA256(sharedSecret).toString();
  } catch (error) {
    console.error('Error deriving encryption key:', error);
    throw new Error('Failed to derive encryption key.');
  }
};

export const encryptMessage = (message, encryptionKey) => {
  try {
    const ivWordArray = CryptoJS.lib.WordArray.random(16);
    const iv = CryptoJS.enc.Hex.stringify(ivWordArray);
    
    const encrypted = CryptoJS.AES.encrypt(message, encryptionKey, {
      iv: CryptoJS.enc.Hex.parse(iv),
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7
    });
    
    return {
      encryptedMessage: encrypted.toString(),
      iv
    };
  } catch (error) {
    console.error('Error encrypting message:', error);
    throw new Error('Failed to encrypt message.');
  }
};

export const decryptMessage = (encryptedMessage, iv, encryptionKey) => {
  try {
    const ivParsed = CryptoJS.enc.Hex.parse(iv);
    
    const decrypted = CryptoJS.AES.decrypt(encryptedMessage, encryptionKey, {
      iv: ivParsed,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7
    });
    
    const result = decrypted.toString(CryptoJS.enc.Utf8);
    
    if (!result) {
      console.error('Decryption produced empty result');
      return 'Message decryption failed';
    }
    
    return result;
  } catch (error) {
    console.error('Failed to decrypt message:', error, 'IV:', iv);
    return 'Message decryption failed';
  }
};