import {
  collection,
  getDocs,
  limit,
  orderBy,
  query,
  startAfter,
  type QueryDocumentSnapshot,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Comment } from "@/types";

/**
 * コメントは songs/{songId}/comments のサブコレクションに保存する。
 * サブコレクションなら orderBy(createdAt) に複合インデックスが不要で、
 * カーソルを使ったページング（無限スクロール）ができる。
 */

export const COMMENTS_PAGE_SIZE = 15;

export type CommentsPage = {
  comments: Comment[];
  /** 次ページ読み込み用のカーソル（最後のドキュメント） */
  cursor: QueryDocumentSnapshot | null;
  /** まだ続きがあるか */
  hasMore: boolean;
};

/**
 * 楽曲のコメントを新しい順にページ単位で取得する。
 * cursor に前ページの戻り値を渡すと、その続きから読み込む。
 */
export async function getSongCommentsPage(
  songId: string,
  cursor: QueryDocumentSnapshot | null = null,
  pageSize = COMMENTS_PAGE_SIZE,
): Promise<CommentsPage> {
  const commentsRef = collection(db, "songs", songId, "comments");

  const commentsQuery = cursor
    ? query(
        commentsRef,
        orderBy("createdAt", "desc"),
        startAfter(cursor),
        limit(pageSize),
      )
    : query(commentsRef, orderBy("createdAt", "desc"), limit(pageSize));

  const snapshot = await getDocs(commentsQuery);

  const comments = snapshot.docs.map((commentDoc) => ({
    id: commentDoc.id,
    ...commentDoc.data(),
  })) as Comment[];

  return {
    comments,
    cursor: snapshot.docs.length > 0 ? snapshot.docs[snapshot.docs.length - 1] : null,
    hasMore: snapshot.docs.length === pageSize,
  };
}
