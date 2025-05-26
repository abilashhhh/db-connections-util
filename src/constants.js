export const DB_TYPES = {
    MONGODB_ATLAS: 'mongodb atlas',
    MONGODB_COMPASS: 'mongodb compass',
    AZURE_COSMOS: 'azure cosmosdb',
    MYSQL: 'mysql',
    POSTGRESQL: 'postgresql',
    REDIS: 'redis',
    SQL_SERVER: 'sql server',
    UNKNOWN: 'unknown'
};

export const DEFAULT_ENV_VARS = {
    DB_STRING_SECRET_KEY: 'DB_STRING_SECRET_KEY',
    HASH_ALGORITHM: 'sha256',
    DB_STRING_ALGORITHM: 'aes-256-cbc'
};

export const ERROR_MESSAGES = {
    INVALID_CONNECTION_STRING: 'Invalid connection string provided',
    DECRYPTION_FAILED: 'Failed to decrypt sensitive data',
    ENCRYPTION_FAILED: 'Failed to encrypt sensitive data',
    UNSUPPORTED_DB_TYPE: 'Unsupported database type'
};