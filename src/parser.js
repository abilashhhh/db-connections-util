import { DB_TYPES, ERROR_MESSAGES } from './constants.js';
import { encrypt } from './encryption.js';

//Parses a MongoDB connection string
const parseMongoDBConnection = (connectionString, result) => {
    const withoutProtocol = connectionString.slice(result.protocol.length + 3);
    const [credentialsAndHost, params] = withoutProtocol.split('?');
    const atSplit = credentialsAndHost.split('@');

    if (atSplit.length === 2) {
        const [credentials, host] = atSplit;
        const hostParts = host.split('/');
        result.host = hostParts[0];

        if (!connectionString.startsWith('mongodb+srv') && result.host.includes(':')) {
            const [hostname, port] = result.host.split(':');
            result.host = hostname;
            result.port = port;
        }

        const colonSplit = credentials.split(':');
        if (colonSplit.length === 2) {
            result.username = decodeURIComponent(colonSplit[0]);
            result.password = decodeURIComponent(colonSplit[1]);
        }

        if (hostParts.length > 1 && hostParts[1]) {
            result.dbName = hostParts[1].split('?')[0];
        }
    } else {
        const hostParts = credentialsAndHost.split('/');
        result.host = hostParts[0];

        if (hostParts.length > 1 && hostParts[1]) {
            result.dbName = hostParts[1].split('?')[0];
        }
    }

    if (params) {
        const paramsObj = new URLSearchParams(params);
        paramsObj.forEach((value, key) => {
            result.params[key] = value;
        });
    }
};

//Parses an Azure CosmosDB connection string
const parseAzureCosmosConnection = (connectionString, result) => {
    const parts = connectionString.split(';');
    parts.forEach(part => {
        const [key, value] = part.split('=');
        if (key && value) {
            switch (key.toLowerCase()) {
                case 'accountendpoint':
                    try {
                        const url = new URL(value);
                        result.host = url.hostname;
                        result.port = url.port || '';
                        result.protocol = url.protocol.replace(':', '');
                        result.params.originalEndpoint = value;
                    } catch {
                        result.host = value;
                    }
                    break;
                case 'accountkey':
                    result.password = value;
                    break;
                case 'databasename':
                case 'database':
                    result.dbName = value;
                    break;
                default:
                    result.params[key] = value;
            }
        }
    });
};

//Parses a SQL Server connection string
const parseSqlServerConnection = (connectionString, result) => {
    // Handle both semicolon-separated and URL-style connection strings
    if (connectionString.includes(';')) {
        // Semicolon-separated format (e.g., "Server=localhost;Database=mydb;User Id=user;Password=pass;")
        const parts = connectionString.split(';').filter(part => part.trim());
        parts.forEach(part => {
            const [key, ...valueParts] = part.split('=');
            const value = valueParts.join('='); // Handle values that contain '='
            if (key && value) {
                const lowerKey = key.toLowerCase().trim();
                switch (lowerKey) {
                    case 'server':
                    case 'data source':
                    case 'datasource':
                        // Handle server with instance (e.g., "localhost\SQLEXPRESS")
                        if (value.includes('\\')) {
                            const [host, instance] = value.split('\\');
                            result.host = host;
                            result.params.instance = instance;
                        } else if (value.includes(',')) {
                            // Handle server with port (e.g., "localhost,1433")
                            const [host, port] = value.split(',');
                            result.host = host;
                            result.port = port;
                        } else {
                            result.host = value;
                        }
                        break;
                    case 'database':
                    case 'initial catalog':
                        result.dbName = value;
                        break;
                    case 'user id':
                    case 'userid':
                    case 'uid':
                        result.username = value;
                        break;
                    case 'password':
                    case 'pwd':
                        result.password = value;
                        break;
                    case 'port':
                        result.port = value;
                        break;
                    default:
                        result.params[key.trim()] = value;
                }
            }
        });
    } else {
        try {
            // Handle instance name in URL format
            if (connectionString.includes('\\')) {
                const [protocolAndAuth, hostAndPath] = connectionString.split('@');
                const [protocol, auth] = protocolAndAuth.split('://');
                const [username, password] = auth.split(':');
                const [hostWithInstance, ...pathParts] = hostAndPath.split('/');
                const [host, instance] = hostWithInstance.split('\\');

                result.protocol = protocol;
                result.username = username;
                result.password = password;
                result.host = host;
                result.params.instance = instance;
                result.port = hostWithInstance.includes(':')
                    ? hostWithInstance.split(':')[1].split('\\')[0]
                    : '1433';
                result.dbName = pathParts[0] || null;
            } else {
                const url = new URL(connectionString);
                result.host = url.hostname;
                result.port = url.port;
                result.username = url.username;
                result.password = url.password;
                result.dbName = url.pathname ? url.pathname.replace(/^\//, '') : null;

                url.searchParams.forEach((value, key) => {
                    result.params[key] = value;
                });
            }
        } catch (e) {
            throw new Error('Invalid SQL Server connection string format');
        }
    }
};

//Parses a Redis connection string (including cluster support)
const parseRedisConnection = (connectionString, result) => {
    // Handle Redis cluster format (multiple hosts separated by commas)
    if ((connectionString.includes(',') && !connectionString.startsWith('redis://') && !connectionString.startsWith('rediss://')) ||
        (connectionString.startsWith('redis://') && connectionString.split('@')[1]?.includes(','))) {
        // Cluster format: "host1:port1,host2:port2,host3:port3" or "redis://user:pass@host1:port1,host2:port2"
        const authPart = connectionString.includes('@') ? connectionString.split('@')[0] : '';
        const hostsPart = connectionString.includes('@') ? connectionString.split('@')[1] : connectionString;

        const hosts = hostsPart.split(',').map(host => host.trim());

        if (authPart) {
            const [username, password] = authPart.replace('redis://', '').split(':');
            result.username = username;
            result.password = password;
        }

        result.host = hosts[0].split(':')[0];
        result.port = hosts[0].includes(':') ? hosts[0].split(':')[1] : '6379';
        result.params.clusterHosts = hosts;
        result.params.isCluster = true;
    } else {
        // Standard URL format or simple host:port
        try {
            if (connectionString.startsWith('redis://') || connectionString.startsWith('rediss://')) {
                const url = new URL(connectionString);
                result.protocol = url.protocol.replace(':', '');
                result.host = url.hostname;
                result.port = url.port || '6379';
                result.username = url.username;
                result.password = url.password;

                // Redis database number from pathname
                if (url.pathname && url.pathname !== '/') {
                    result.dbName = url.pathname.replace(/^\//, '');
                }

                url.searchParams.forEach((value, key) => {
                    result.params[key] = value;
                });
            } else {
                // Simple host:port format
                if (connectionString.includes(':')) {
                    const [host, port] = connectionString.split(':');
                    result.host = host;
                    result.port = port;
                } else {
                    result.host = connectionString;
                    result.port = '6379';
                }
            }
        } catch (e) {
            throw new Error('Invalid Redis connection string format');
        }
    }
};

//Parses a database connection string
export const parseDatabaseConnection = (connectionString, secret) => {
    const result = {
        dbType: DB_TYPES.UNKNOWN,
        isCloud: false,
        protocol: null,
        username: null,
        password: null,
        host: null,
        port: null,
        dbName: null,
        params: {},
        originalString: connectionString
    };

    if (!connectionString) {
        return result;
    }

    try {
        if (connectionString.startsWith('mongodb+srv://')) {
            result.dbType = DB_TYPES.MONGODB_ATLAS;
            result.isCloud = true;
            result.protocol = 'mongodb+srv';
            parseMongoDBConnection(connectionString, result);
        } else if (connectionString.startsWith('mongodb://')) {
            result.dbType = DB_TYPES.MONGODB_COMPASS;
            result.protocol = 'mongodb';
            parseMongoDBConnection(connectionString, result);
        } else if (connectionString.includes('AccountEndpoint=') ||
            connectionString.includes('.documents.azure.com')) {
            result.dbType = DB_TYPES.AZURE_COSMOS;
            result.isCloud = true;
            parseAzureCosmosConnection(connectionString, result);
        } else if (connectionString.toLowerCase().includes('server=') ||
            connectionString.toLowerCase().includes('data source=') ||
            connectionString.startsWith('mssql://') ||
            connectionString.startsWith('sqlserver://')) {
            result.dbType = DB_TYPES.SQL_SERVER;
            result.protocol = connectionString.startsWith('mssql://') ? 'mssql' :
                connectionString.startsWith('sqlserver://') ? 'sqlserver' : 'mssql';
            parseSqlServerConnection(connectionString, result);
        } else if (connectionString.startsWith('redis://') ||
            connectionString.startsWith('rediss://') ||
            // Check for Redis cluster format or simple host:port without protocol
            (!connectionString.includes('://') &&
                (connectionString.includes(':') || connectionString.includes(',')))) {
            result.dbType = DB_TYPES.REDIS;
            result.protocol = connectionString.startsWith('rediss://') ? 'rediss' : 'redis';
            parseRedisConnection(connectionString, result);
        } else {
            try {
                const url = new URL(connectionString);
                result.protocol = url.protocol.replace(':', '');
                result.host = url.hostname;
                result.port = url.port;
                result.username = url.username;
                result.password = url.password;
                result.dbName = url.pathname ? url.pathname.replace(/^\//, '') : null;

                url.searchParams.forEach((value, key) => {
                    result.params[key] = value;
                });

                if (result.protocol.includes('mysql')) result.dbType = DB_TYPES.MYSQL;
                else if (result.protocol.includes('postgres')) result.dbType = DB_TYPES.POSTGRESQL;
                else if (result.protocol.includes('redis')) result.dbType = DB_TYPES.REDIS;
                else if (result.protocol.includes('mssql') || result.protocol.includes('sqlserver')) result.dbType = DB_TYPES.SQL_SERVER;
            } catch (e) {
                throw new Error(ERROR_MESSAGES.INVALID_CONNECTION_STRING);
            }
        }

        if (secret) {
            // Store encrypted password
            if (result.password) {
                result.password = encrypt(result.password, secret);
            }
            // Store encrypted connection string
            if (result.originalString) {
                result.originalString = encrypt(result.originalString, secret);
            }
        }

        return result;
    } catch (error) {
        throw new Error(`${ERROR_MESSAGES.INVALID_CONNECTION_STRING}: ${error.message}`);
    }
};