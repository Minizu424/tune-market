import {
  collection,
  doc,
  increment,
  serverTimestamp,
  writeBatch,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

export type AddSongCommentInput = {
  songId: string;
  userId: string;
  userName: string;
  text: string;
};

const MAX_COMMENT_LENGTH = 300;

/**
 * 楽曲にコメントを投稿する。
 * songs/{songId}/comments に保存し、songs.commentCount を +1 する。
 * コメント数は株価更新（updateSongPrices）で価格に反映される。
 */
export async function addSongComment(input: AddSongCommentInput): Promise<string> {
  const text = input.text.trim();

  if (!text) {
    throw new Error("コメントを入力してください。");
  }
  if (text.length > MAX_COMMENT_LENGTH) {
    throw new Error(`コメントは${MAX_COMMENT_LENGTH}文字以内で入力してください。`);
  }

  const batch = writeBatch(db);
  const commentRef = doc(collection(db, "songs", input.songId, "comments"));

  batch.set(commentRef, {
    songId: input.songId,
    userId: input.userId,
    userName: input.userName || "名無しのリスナー",
    text,
    createdAt: serverTimestamp(),
  });

  batch.update(doc(db, "songs", input.songId), {
    commentCount: increment(1),
  });

  await batch.commit();
  return commentRef.id;
}
