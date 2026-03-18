import { Router } from 'express';
import * as usersController from '../controllers/users.controller.js';

const router = Router();

router.post('/createUser', usersController.createUser);

router.get('/user/:email', usersController.getUserProfile);

export default router;
