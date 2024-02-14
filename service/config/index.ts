const config = {
  openai: {
    apikey: process.env.OPENAI_APIKEY as string,
    model: process.env.OPENAI_MODEL as string
  },
  pinecone: {
    environment: process.env.PINECONE_ENVIRONMENT as string,
    apikey: process.env.PINECONE_APIKEY as string,
    index: process.env.PINECONE_INDEX as string,
    namespace: process.env.PINECONE_NAMESPACE as string
  },
  localAuth: process.env.LOCALAUTH as string,
  postgres: {
    database: process.env.POSTGRES_DATABASE as string,
    username: process.env.POSTGRES_USERNAME as string,
    password: process.env.POSTGRES_PASSWORD as string,
    host: process.env.POSTGRES_HOST as string,
    dialect: process.env.POSTGRES_DIALECT as string
  },
  textExtractor: {
    bucketName: process.env.TEXT_EXTRACTOR_BUCKETNAME as string,
    outputBucketName: process.env.TEXT_EXTRACTOR_OUTPUTBUCKETNAME as string,
    snsTopicArn: process.env.TEXT_EXTRACTOR_SNSTOPICARN as string,
    snsRoleArn: process.env.TEXT_EXTRACTOR_SNSROLEARN as string
  }
};

console.log('POSTGRES USERNAME', process.env.POSTGRES_USERNAME);

export default config;
