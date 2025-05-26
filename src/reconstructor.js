
import { DB_TYPES, ERROR_MESSAGES } from './constants.js';
import { decrypt } from './encryption.js';

//Reconstructs a database connection string from parsed data
export const reconstructConnectionStringFromParsedData = (parsed, secret) => {
    try {
        if (!parsed) {
            throw new Error('Parsed data is required');
        }

        const {
            dbType = DB_TYPES.UNKNOWN,
            protocol = '',
            username = null,
            host = '',
            port = null,
            dbName = null,
            password = null,
            originalString = null
        } = parsed;

        const params = parsed.params || {};

        let decryptedPassword = password;
        if (secret && password && password.includes(':')) {
            try {
                decryptedPassword = decrypt(password, secret);
            } catch (e) {
                // Continue with encrypted password if decryption fails
            }
        }

        let reconstructed = '';

        // Handle MongoDB Atlas (SRV) connections
        if (dbType === DB_TYPES.MONGODB_ATLAS) {
            const auth = username && decryptedPassword
                ? `${encodeURIComponent(username)}:${encodeURIComponent(decryptedPassword)}@`
                : '';

            const dbPath = dbName ? `/${dbName}` : '';

            const queryParams = Object.keys(params);
            const query = queryParams.length > 0
                ? '?' + queryParams.map(k => `${k}=${params[k]}`).join('&')
                : '';

            reconstructed = `mongodb+srv://${auth}${host}${dbPath}${query}`;
        }
        // Handle MongoDB Compass (standard) connections
        else if (dbType === DB_TYPES.MONGODB_COMPASS) {
            const auth = username && decryptedPassword
                ? `${encodeURIComponent(username)}:${encodeURIComponent(decryptedPassword)}@`
                : '';

            const queryParams = Object.keys(params);
            const dbPath = dbName ? `/${dbName}` : (queryParams.length > 0 ? '/' : '');

            const query = queryParams.length > 0
                ? '?' + queryParams.map(k => `${k}=${params[k]}`).join('&')
                : '';

            const portPart = port ? `:${port}` : '';

            reconstructed = `mongodb://${auth}${host}${portPart}${dbPath}${query}`;
        }
        // Handle Azure CosmosDB
        else if (dbType === DB_TYPES.AZURE_COSMOS) {
            const endpoint = params.originalEndpoint ||
                `https://${host}${port ? `:${port}` : ''}/`;

            const cleanParams = { ...params };
            delete cleanParams.originalEndpoint;

            const paramsKeys = Object.keys(cleanParams);

            const parts = [
                `AccountEndpoint=${endpoint}`,
                `AccountKey=${decryptedPassword}`,
                dbName ? `Database=${dbName}` : null,
                ...paramsKeys.map(k => `${k}=${cleanParams[k]}`)
            ].filter(Boolean);

            reconstructed = parts.join(';');
        }
        // Handle SQL Server
        else if (dbType === DB_TYPES.SQL_SERVER) {
            // Build semicolon-separated connection string
            const parts = [];

            // Handle server with instance
            if (params.instance) {
                parts.push(`Server=${host}\\${params.instance}`);
            } else if (port) {
                parts.push(`Server=${host},${port}`);
            } else {
                parts.push(`Server=${host}`);
            }

            if (dbName) {
                parts.push(`Database=${dbName}`);
            }

            if (username) {
                parts.push(`User Id=${username}`);
            }

            if (decryptedPassword) {
                parts.push(`Password=${decryptedPassword}`);
            }

            // Add other parameters (excluding special ones we already handled)
            const cleanParams = { ...params };
            delete cleanParams.instance;

            Object.keys(cleanParams).forEach(key => {
                if (cleanParams[key] !== undefined && cleanParams[key] !== null) {
                    parts.push(`${key}=${cleanParams[key]}`);
                }
            });

            reconstructed = parts.join(';');
        }
        // Handle Redis (including cluster)
        else if (dbType === DB_TYPES.REDIS) {
            // Handle Redis cluster format
            if (params.isCluster && params.clusterHosts) {
                reconstructed = params.clusterHosts.join(',');
            } else {
                // Standard Redis connection
                const auth = username && decryptedPassword
                    ? `${encodeURIComponent(username)}:${encodeURIComponent(decryptedPassword)}@`
                    : decryptedPassword
                        ? `:${encodeURIComponent(decryptedPassword)}@`
                        : '';

                const dbPath = dbName ? `/${dbName}` : '';

                const cleanParams = { ...params };
                delete cleanParams.isCluster;
                delete cleanParams.clusterHosts;

                const queryParams = Object.keys(cleanParams);
                const query = queryParams.length > 0
                    ? '?' + queryParams.map(k => `${k}=${cleanParams[k]}`).join('&')
                    : '';

                const protocolPrefix = protocol ? `${protocol}://` : 'redis://';
                reconstructed = `${protocolPrefix}${auth}${host}${port ? `:${port}` : ''}${dbPath}${query}`;
            }
        }
        // Handle MySQL, PostgreSQL
        else if ([DB_TYPES.MYSQL, DB_TYPES.POSTGRESQL].includes(dbType)) {
            const auth = username && decryptedPassword
                ? `${encodeURIComponent(username)}:${encodeURIComponent(decryptedPassword)}@`
                : '';

            const dbPath = dbName ? `/${dbName}` : '';

            const queryParams = Object.keys(params);
            const query = queryParams.length > 0
                ? '?' + queryParams.map(k => `${k}=${params[k]}`).join('&')
                : '';

            reconstructed = `${protocol}://${auth}${host}${port ? `:${port}` : ''}${dbPath}${query}`;
        } else {
            throw new Error(ERROR_MESSAGES.UNSUPPORTED_DB_TYPE);
        }

        return reconstructed;
    } catch (error) {
        throw new Error(`Failed to reconstruct connection string: ${error.message}`);
    }
};