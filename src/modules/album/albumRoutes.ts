import { Router } from 'express';
import { AlbumController } from './AlbumController';

export const albumRoutes = (controller: AlbumController) => {
    const router = Router();

    router.get('/:albumId', (req, res) => controller.getAlbum(req, res));

    return router;
};
