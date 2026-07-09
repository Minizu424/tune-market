import {
  createArtist,
  getArtistByUserId,
  type CreateArtistInput,
} from "@/repositories/artistsRepository";
import { updateUserRole } from "@/repositories/usersRepository";

/**
 * アーティスト登録。
 * artists にドキュメントを作成し、users.role を artist に変更する。
 */
export async function registerArtist(input: CreateArtistInput): Promise<string> {
  const existing = await getArtistByUserId(input.userId);
  if (existing) {
    throw new Error("すでにアーティスト登録されています。");
  }

  if (!input.artistName.trim()) {
    throw new Error("アーティスト名を入力してください。");
  }

  const artistId = await createArtist(input);
  await updateUserRole(input.userId, "artist");

  return artistId;
}
