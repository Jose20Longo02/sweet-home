const AWS = require('aws-sdk');

const rawEndpoint = (process.env.DO_SPACES_ENDPOINT || '').replace(/^https?:\/\//, '');
const spacesEndpoint = new AWS.Endpoint(rawEndpoint);
const s3 = new AWS.S3({
  endpoint: spacesEndpoint,
  accessKeyId: process.env.DO_SPACES_ACCESS_KEY,
  secretAccessKey: process.env.DO_SPACES_SECRET_KEY,
  region: process.env.DO_SPACES_REGION
});

module.exports = s3;
