import DatabaseError from '../../shared/errors/DatabaseError';
import { DailyAlbumService } from '../dailyAlbum/DailyAlbumService';
import AlbumRepository from './AlbumRepository';

export class AlbumService {
    constructor(
        private albumRepo: AlbumRepository,
        private dailyAlbumService: DailyAlbumService
    ) {}

    getAlbum = async (albumId: string) => {
        const album = await this.albumRepo.get(albumId);
        if (!album) {
            throw new DatabaseError(404, `Album with id "${albumId}" was not found`);
        }

        const { dailyAlbum } = await this.dailyAlbumService.getDailyAlbum();
        const count = await this.albumRepo.getDailyAlbumTries(albumId, dailyAlbum.albumId);

        return { album, count };
    };
}
