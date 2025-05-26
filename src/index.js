import { DB_TYPES, DEFAULT_ENV_VARS } from './constants.js';
import * as encryption from './encryption.js';
import * as parser from './parser.js';
import * as reconstructor from './reconstructor.js';

export {
    DB_TYPES,
    DEFAULT_ENV_VARS,
    encryption,
    parser,
    reconstructor
};

// Convenience exports
export const parseDatabaseConnection = parser.parseDatabaseConnection;
export const reconstructConnectionString = reconstructor.reconstructConnectionStringFromParsedData;
export const { encrypt, decrypt, getKeyFromSecret } = encryption;