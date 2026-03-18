import { Router } from 'express';
import * as mapsController from '../controllers/maps.controller.js';

const router = Router();

router.post('/createMap', mapsController.createMap);

router.get('/listMaps', mapsController.listMaps);

export default router;
