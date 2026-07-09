import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { storage } from "@/lib/firebase";

/**
 * ローカルURI（expo-image-picker / expo-document-picker で取得）を
 * Firebase Storage にアップロードし、ダウンロードURLを返す。
 */
export async function uploadFileToStorage(
  localUri: string,
  storagePath: string,
  contentType?: string,
): Promise<string> {
  const response = await fetch(localUri);
  const blob = await response.blob();

  const storageRef = ref(storage, storagePath);
  await uploadBytes(storageRef, blob, contentType ? { contentType } : undefined);

  return getDownloadURL(storageRef);
}

export function buildJacketPath(artistId: string, fileName: string): string {
  return `jackets/${artistId}/${Date.now()}_${fileName}`;
}

export function buildAudioPath(artistId: string, fileName: string): string {
  return `audio/${artistId}/${Date.now()}_${fileName}`;
}
