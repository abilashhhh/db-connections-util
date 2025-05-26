# Database Connection Utils

A comprehensive utility package for parsing, encrypting, and reconstructing database connection strings across multiple database types.

## Features

- 🔍 **Parse connection strings** for multiple database types
- 🔒 **Encrypt/decrypt sensitive data** in connection strings
- 🔄 **Reconstruct connection strings** from parsed data
- 🌐 **Multi-database support** with cloud and on-premise options
- 📊 **Type detection** with detailed connection information
- 🛡️ **Security-first** approach with built-in encryption

## Supported Databases

- **MongoDB** (Atlas & Compass)
- **Azure CosmosDB** (MongoDB & SQL API)
- **MySQL**
- **PostgreSQL** 
- **Redis** (including cluster support)
- **SQL Server** (with instance support)

## Installation

```bash
npm install db-connections-util
```
 
## Quick Start

```javascript
import { parseDatabaseConnection, reconstructConnectionString } from 'db-connections-util';

// Parse a connection string
const connectionString = 'postgres://user:pass@localhost:5432/mydb';
const parsed = parseDatabaseConnection(connectionString, 'your-secret-key');

console.log(parsed);
// Output: Detailed parsed object with encrypted sensitive data

// Reconstruct the connection string
const reconstructed = reconstructConnectionString(parsed, 'your-secret-key');
console.log(reconstructed);
// Output: postgres://user:pass@localhost:5432/mydb
```

## API Reference

### `parseDatabaseConnection(connectionString, secret?)`

Parses a database connection string into a structured object.

**Parameters:**
- `connectionString` (string): The database connection string to parse
- `secret` (string, optional): Secret key for encrypting sensitive data

**Returns:** Object with the following structure:
```javascript
{
  dbType: string,           // Database type (e.g., 'postgresql', 'mongodb atlas')
  isCloud: boolean,         // Whether it's a cloud database
  protocol: string,         // Protocol used (e.g., 'postgres', 'mongodb+srv')
  username: string,         // Username (encrypted if secret provided)
  password: string,         // Password (encrypted if secret provided)
  host: string,            // Database host
  port: string,            // Database port
  dbName: string,          // Database name
  params: object,          // Additional parameters
  originalString: string   // Original connection string (encrypted if secret provided)
}
```

### `reconstructConnectionString(parsedData, secret?)`

Reconstructs a connection string from parsed data.

**Parameters:**
- `parsedData` (object): Parsed connection data object
- `secret` (string, optional): Secret key for decrypting sensitive data

**Returns:** Reconstructed connection string

### `encrypt(data, secret)`

Encrypts sensitive data using AES-256-CBC encryption.

**Parameters:**
- `data` (string): Data to encrypt
- `secret` (string): Secret key for encryption

**Returns:** Encrypted string in format `iv:encryptedData`

### `decrypt(encryptedData, secret)`

Decrypts encrypted data.

**Parameters:**
- `encryptedData` (string): Encrypted data in format `iv:encryptedData`
- `secret` (string): Secret key for decryption

**Returns:** Decrypted string

## Usage Examples

### PostgreSQL

```javascript
import { parseDatabaseConnection, reconstructConnectionString } from 'db-connections-util';

const connectionString = 'postgres://user:pass@localhost:5432/mydb?sslmode=require';
const secret = 'my-secret-key';

const parsed = parseDatabaseConnection(connectionString, secret);
console.log('Parsed:', parsed);
/*
Output:
{
  "dbType": "postgresql",
  "isCloud": false,
  "protocol": "postgres",
  "username": "user",
  "password": "52f4ae52f12452966f4426d9962cc36b:6c0501fd7f90c0812ce5a090c25b1461",
  "host": "localhost",
  "port": "5432",
  "dbName": "mydb",
  "params": { "sslmode": "require" },
  "originalString": "4102019b64b82780351c364f553f051f:5619b4598700f8a2c497862b88e2bd56..."
}
*/

const reconstructed = reconstructConnectionString(parsed, secret);
console.log('Reconstructed:', reconstructed);
// Output: postgres://user:pass@localhost:5432/mydb?sslmode=require
```

### MongoDB Atlas

```javascript
const mongoAtlas = 'mongodb+srv://user:pass@cluster.mongodb.net/mydb?retryWrites=true&w=majority';
const parsed = parseDatabaseConnection(mongoAtlas, 'secret-key');

console.log('Database Type:', parsed.dbType); // mongodb atlas
console.log('Is Cloud:', parsed.isCloud);     // true
console.log('Host:', parsed.host);            // cluster.mongodb.net
```

### MongoDB Local

```javascript
const mongoLocal = 'mongodb://user:pass@localhost:27017/mydb?authSource=admin';
const parsed = parseDatabaseConnection(mongoLocal);

console.log('Database Type:', parsed.dbType); // mongodb compass
console.log('Port:', parsed.port);            // 27017
console.log('Auth Source:', parsed.params.authSource); // admin
```

### MySQL

```javascript
const mysql = 'mysql://user:pass@localhost:3306/mydb?charset=utf8mb4&timezone=UTC';
const parsed = parseDatabaseConnection(mysql);

console.log('Database Type:', parsed.dbType); // mysql
console.log('Charset:', parsed.params.charset); // utf8mb4
```

### Redis

```javascript
// Standard Redis
const redis = 'redis://user:pass@localhost:6379/0';
const parsed = parseDatabaseConnection(redis);

console.log('Database Type:', parsed.dbType); // redis
console.log('DB Number:', parsed.dbName);     // 0

// Redis Cluster
const redisCluster = 'redis://user:pass@host1:6379,host2:6379,host3:6379';
const parsedCluster = parseDatabaseConnection(redisCluster);

console.log('Is Cluster:', parsedCluster.params.isCluster); // true
console.log('Cluster Hosts:', parsedCluster.params.clusterHosts);
```

### SQL Server

```javascript
// Standard SQL Server
const sqlServer = 'mssql://user:pass@localhost:1433/mydb';
const parsed = parseDatabaseConnection(sqlServer);

// SQL Server with Instance
const sqlServerInstance = 'mssql://user:pass@localhost\\INSTANCE_NAME:1433/mydb';
const parsedInstance = parseDatabaseConnection(sqlServerInstance);

console.log('Instance:', parsedInstance.params.instance); // INSTANCE_NAME

// Semicolon format
const sqlServerSemicolon = 'Server=localhost;Database=mydb;User Id=user;Password=pass;';
const parsedSemicolon = parseDatabaseConnection(sqlServerSemicolon);
```

### Azure CosmosDB

```javascript
// CosmosDB MongoDB API
const cosmosDB = 'mongodb://account:key@account.mongo.cosmos.azure.com:10255/mydb?ssl=true&replicaSet=globaldb';
const parsed = parseDatabaseConnection(cosmosDB);

// CosmosDB SQL API
const cosmosSQL = 'AccountEndpoint=https://account.documents.azure.com:443/;AccountKey=key;Database=mydb';
const parsedSQL = parseDatabaseConnection(cosmosSQL);

console.log('Database Type:', parsedSQL.dbType); // azure cosmosdb
console.log('Is Cloud:', parsedSQL.isCloud);     // true
```

## Security Features

### Encryption

When you provide a secret key, sensitive data is automatically encrypted:

```javascript
const secret = 'your-secret-key';
const parsed = parseDatabaseConnection(connectionString, secret);

// Password and original string are encrypted
console.log('Encrypted password:', parsed.password);
// Output: "iv:encryptedData" format

// Manually encrypt/decrypt
import { encrypt, decrypt } from 'db-connections-util';

const sensitive = "my-password";
const encrypted = encrypt(sensitive, secret);
const decrypted = decrypt(encrypted, secret);

console.log('Original:', sensitive);
console.log('Encrypted:', encrypted);
console.log('Decrypted:', decrypted);
```
 

## Error Handling

The package throws descriptive errors for various scenarios:

```javascript
try {
  // Invalid connection string
  parseDatabaseConnection('invalid-string');
} catch (error) {
  console.log(error.message); // "Invalid connection string provided"
}

try {
  // Unsupported database type
  reconstructConnectionString({ dbType: 'unsupported' });
} catch (error) {
  console.log(error.message); // "Unsupported database type"
}
```


## Performance

The package is optimized for performance:

- Minimal dependencies
- Efficient parsing algorithms
- Cached regex patterns
- Memory-efficient encryption

Benchmark (approximate):
- Parse: ~0.1ms per connection string
- Reconstruct: ~0.05ms per operation
- Encrypt/Decrypt: ~0.2ms per operation

## Contributing

We welcome contributions! Please see our [Contributing Guidelines](CONTRIBUTING.md) for details.

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Support

- 📧 Email: [abilashnarayanan2001@gmail.com](mailto:abilashnarayanan2001@gmail.com)
- 🐛 Issues: [GitHub Issues](https://github.com/your-username/db-connections-util/issues)
- 📖 Documentation: [GitHub Wiki](https://github.com/your-username/db-connections-util/wiki)

## Changelog

### v1.0.0
- Initial release
- Support for 6 database types
- Encryption/decryption functionality
- Connection string reconstruction
- Comprehensive error handling