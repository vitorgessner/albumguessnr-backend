import { Router, type Request, type Response } from 'express';

const gameRoutes = () => {
    const router = Router();

    router.get('/', (req: Request, res: Response) => {
        res.json({ message: 'aoba' });
    });

    return router;
};

export default gameRoutes;
