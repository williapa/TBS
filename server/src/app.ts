// app.ts defines the routes and configuration of the express app
// see server.ts for the code that starts the server
import express, { type Express } from 'express';
import cors from 'cors';
import {
  usersRouter,
  mapsRouter,
  gamesRouter
} from './routes/index.js';

const app: Express = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

app.use(usersRouter);
app.use(mapsRouter);
app.use(gamesRouter);

export default app;
