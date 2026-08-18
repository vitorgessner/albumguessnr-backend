export interface IUserAlbumFamiliarity {
    id: string;
    playcount: number | null;
    lastTimeListened: Date | null;
    tracksListened: number | null;
    familiarityScore: number;
}
