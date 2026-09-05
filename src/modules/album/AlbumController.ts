import type { Request, Response } from 'express';
import ValidationError from '../../shared/errors/ValidationError';
import { AlbumService } from './AlbumService';

export class AlbumController {
    constructor(private albumService: AlbumService) {}

    getAlbum = async (req: Request, res: Response) => {
        const albumId = req.params.albumId;
        if (!albumId || typeof albumId !== 'string') {
            throw new ValidationError(400, 'Album id was not provided or is invalid');
        }
        const album = await this.albumService.getAlbum(albumId);

        return res.status(200).json({ status: 'success', message: 'fetched album', album });
    };
}
