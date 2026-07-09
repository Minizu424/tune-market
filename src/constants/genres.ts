export const GENRES = ["Lo-fi", "Pop", "Rock", "EDM", "Hip Hop", "R&B", "その他"] as const;
export type Genre = (typeof GENRES)[number];
