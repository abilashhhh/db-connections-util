import crypto from 'crypto';
import { DEFAULT_ENV_VARS, ERROR_MESSAGES } from './constants.js';

//Generates a cryptographic key from a secret
export const getKeyFromSecret = (secret, algorithm = DEFAULT_ENV_VARS.HASH_ALGORITHM) => {
    if (!secret) {
        throw new Error('Secret is required for key derivation');
    }
    return crypto.createHash(algorithm).update(secret).digest();
};

//Encrypts text using a secret
export const encrypt = (text, secret, algorithm = DEFAULT_ENV_VARS.DB_STRING_ALGORITHM) => {
    try {
        if (!text || !secret) {
            throw new Error('Text and secret are required for encryption');
        }

        const key = getKeyFromSecret(secret);
        const iv = crypto.randomBytes(16);
        const cipher = crypto.createCipheriv(algorithm, key, iv);
        const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
        return iv.toString('hex') + ':' + encrypted.toString('hex');
    } catch (error) {
        throw new Error(`${ERROR_MESSAGES.ENCRYPTION_FAILED}: ${error.message}`);
    }
};

//Decrypts text that was encrypted with the encrypt function
export const decrypt = (encryptedText, secret, algorithm = DEFAULT_ENV_VARS.DB_STRING_ALGORITHM) => {
    try {
        if (!encryptedText || !secret) {
            throw new Error('Encrypted text and secret are required for decryption');
        }

        const key = getKeyFromSecret(secret);
        const [ivHex, encryptedData] = encryptedText.split(':');
        
        if (!ivHex || !encryptedData) {
            throw new Error('Invalid encrypted text format');
        }

        const iv = Buffer.from(ivHex, 'hex');
        const decipher = crypto.createDecipheriv(algorithm, key, iv);
        const decrypted = Buffer.concat([
            decipher.update(Buffer.from(encryptedData, 'hex')),
            decipher.final()
        ]);
        return decrypted.toString('utf8');
    } catch (error) {
        throw new Error(`${ERROR_MESSAGES.DECRYPTION_FAILED}: ${error.message}`);
    }
};