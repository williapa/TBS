import { Router } from 'express';
import * as gamesController from '../controllers/games.controller.js';

const router = Router();

router.post('/createGame', gamesController.createGame);

router.post('/joinGame', gamesController.joinGame);

router.get('/listGames', gamesController.listGames);

router.get('/game/:id', gamesController.getGameById);

router.get('/game/:id/events', gamesController.listGameEvents);

export default router;
