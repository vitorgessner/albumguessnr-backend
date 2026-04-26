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
    'medley',
    'theme',
    'themes',
    'soundtrack',
    'complete',
    'original motion picture',
    'original',
].join('|');

const EDITION_REGEX = new RegExp(
    `\\s*[-–]\\s*(?=[^-]*\\b(?:${EDITION_KEYWORDS})\\b)[^-]*$` +
        '|' +
        `\\s*\\((?=[^)]*\\b(?:${EDITION_KEYWORDS})\\b)[^)]*\\)` +
        '|' +
        `\\s*\\[(?=[^\\]]*\\b(?:${EDITION_KEYWORDS})\\b)[^\\]]*\\]`,
    'gi'
);

const FEAT_REGEX = /\s*[([]\s*(?:feat\.?|ft\.?)\s+[^)\]]*[)\]]?/gi;

export const normalizeAlbumName = (name: string): string => {
    const nameWithoutEdition = name.replace(FEAT_REGEX, '').replace(EDITION_REGEX, '');
    return nameWithoutEdition.trim().toLowerCase();
};

export const normalizeTrackName = (name: string): string => {
    const nameWithoutEdition = name.replace(FEAT_REGEX, '').replace(EDITION_REGEX, '');
    return nameWithoutEdition.trim().toLowerCase();
};

export const normalizeArtistName = (name: string): string => {
    return name.trim().toLowerCase();
};

export const normalizeTagName = (name: string): string => {
    return name.trim().toLowerCase();
};
