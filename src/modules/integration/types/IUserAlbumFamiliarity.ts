export interface IUserAlbumFamiliarity {
    id: string;
    playcount: number;
    lastTimeListened: Date | null;
    tracksListened: number | null;
}
