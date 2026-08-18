export interface ITopAlbumsResponse {
    topalbums: {
        '@attr': {
            totalPages: number;
            total: number;
            page: number;
        };
        album: ITopAlbumResponse[];
    };
}

export interface ITopAlbumResponse {
    artist: {
        name: string;
        mbid: string;
    };
    image: {
        '#text': string;
    }[];
    mbid: string;
    playcount: string;
    name: string;
}

export interface IAlbumInfo {
    tags: {
        tag: [
            {
                url: string;
                name: string;
            },
        ];
    };
    tracks: {
        track:
            | [
                  {
                      duration: string;
                      url: string;
                      name: string;
                      '@attr': {
                          rank: number;
                      };
                      artist: {
                          url: string;
                          name: string;
                          mbid: string;
                      };
                  },
              ]
            | {
                  duration: string;
                  url: string;
                  name: string;
                  '@attr': {
                      rank: number;
                  };
                  artist: {
                      url: string;
                      name: string;
                      mbid: string;
                  };
              };
    };
}
