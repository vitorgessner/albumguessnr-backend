const EDITION_KEYWORDS = [
    'remastered',
    'remaster',
    'deluxe',
    'edition',
    'anniversary',
    'radio edit',
    'radio version',
    'live',
    'edit',
    'version',
    'mono',
    'stereo',
    'bonus track',
    'bonus tracks',
    'demo',
    'demos',
    'remix',
    'remixes',
    'outtake',
    'outtakes',
    'session',
    'sessions',
    'expanded',
    'extended',
    'mix',
    'mixes',
    'take',
    'takes',
    'arrangement',
    'arrangements',
    'vocal',
    'vocals',
    'including',
    'included',
    'feat\\.?',
    'feat.?',
    'ft\\.?',
    'ft.?',
    'medley',
    'theme',
    'themes',
    'soundtrack',
    'complete',
    'original motion picture',
].join('|');

const EDITION_REGEX = new RegExp(
    `\\s*[-–]\\s*(?=[^-]*\\b(?:${EDITION_KEYWORDS})\\b)[^-]*$` +
        '|' +
        `\\s*\\((?=[^)]*\\b(?:${EDITION_KEYWORDS})\\b)[^)]*\\)`,
    'gi'
);

export const normalizeAlbumName = (name: string): string => {
    return name.replace(EDITION_REGEX, '').trim().toLowerCase();
};

export const normalizeArtistName = (name: string): string => {
    return name.trim().toLowerCase();
};
