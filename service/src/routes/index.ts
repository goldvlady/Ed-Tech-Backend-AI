import dotenv from 'dotenv';
dotenv.config({
  path: process.env.NODE_ENV === 'development' ? '.env.development' : '.env'
});
import config from '../../config/index';
import express from 'express';
import * as Sentry from '@sentry/node';
import { Response } from 'express';
import subscriptionCheck from '../middleware/subscriptionCheck';
import Middleware from '../middleware/index';
import notes from './notes';
import quizzes from './quizzes';
import flashCards from './flashCards';
import { Pinecone } from '@pinecone-database/pinecone';
import mnemonics from './mnemonics';
import highlights from './highlights';
import studyPlan from './studyPlan';
import { OpenAIEmbeddings } from '@langchain/openai';
import { OpenAI } from '@langchain/openai';
import cors from 'cors';
import http from 'http';
import ProcessStudyPlanService from '../services/processStudyPlanResources';
 
type VectorOperationsApi = ReturnType<
  Pinecone["index"]
>;

const ai = express();

Sentry.init({
  dsn: 'https://4dfb549205c39ec5b438fbcea829986c@o4505637412995072.ingest.sentry.io/4505783448043520',
  integrations: [
    new Sentry.Integrations.Http({
      tracing: true
    }),
    new Sentry.Integrations.Express({
      app: ai
    })
  ],
  tracesSampleRate: 1.0
});

ai.use(Sentry.Handlers.requestHandler());
ai.use(Sentry.Handlers.tracingHandler());

const PORT = 3000;
const SOCKET_PORT = 9000;

const { auth, error } = Middleware;

const corsOptions = {
  origin: '*',
  optionsSuccessStatus: 200
};

ai.use(cors(corsOptions));

ai.get('/status', (_, res: Response) => {
  const alive = {
    status: 200,
    message: 'The shepherd is alive',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  };
  res.send(alive);
});

const server = http.createServer(ai);

server.listen(SOCKET_PORT, () => {
  console.log(`Socket is plugged-in at localhost:${SOCKET_PORT}`);
});

// Configs are now shared among the routes!
ai.locals.config = config;

console.log(`🤖 Application config file loaded\n`);

// @ts-ignore
const { apikey: openAIApiKey, model: modelName } = config.openai;

const embedding = new OpenAIEmbeddings({
  openAIApiKey,
  batchSize: 2048,
  stripNewLines: true
});

const model = new OpenAI({
  openAIApiKey,
  modelName,
  temperature: 0.4
});

let pineconeIndex: VectorOperationsApi;

const preparePinecone = async () => {
  const { apikey, index } = config.pinecone;
  const pinecone = new Pinecone({
    apiKey: apikey,
  });

  const vectorIndex = pinecone.Index(index);
  ai.locals.pineconeIndex = vectorIndex;

  pineconeIndex = vectorIndex;
};

preparePinecone();

console.log(`\n🤖 Vector store OK \n`);

ai.locals.embeddingAI = embedding;
ai.locals.chatModel = model;

const processStudyPlanService = new ProcessStudyPlanService();
processStudyPlanService.init();

ai.use(auth);
ai.use(express.json());
ai.use('/notes', notes);
ai.use('/flash-cards', subscriptionCheck, flashCards);
ai.use('/mnemonics', mnemonics);
ai.use('/highlights', highlights);
ai.use('/quizzes', subscriptionCheck, quizzes);
ai.use('/study-plans', studyPlan);

ai.use(Sentry.Handlers.errorHandler());
ai.use(error);

export { ai, PORT, server, embedding, config, model, pineconeIndex };
