const crypto = require('crypto');
const pubHex = "85D293622C6A936F7335ADD27A129DCB8D5A67F70E37636CA27E1596D8AE2960";
const pubBytes = Buffer.from(pubHex, 'hex');
const data = Buffer.concat([pubBytes, Buffer.from([0x00])]);
const hash = crypto.createHash('sha3-256').update(data).digest('hex');
console.log(`0x${hash}`);
