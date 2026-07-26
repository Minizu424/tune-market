import { createAudioPlayer, type AudioPlayer } from "expo-audio";
import { useEffect, useRef } from "react";
import { Platform } from "react-native";

/**
 * 音源の先読み。
 *
 * リールは縦スクロールで次々に曲が切り替わるため、切り替えた瞬間に
 * ダウンロードを始めると音が出るまで待たされる。表示中の曲の前後ぶんを
 * あらかじめ読み込んでおくことで、この待ちを消す。
 *
 * - Web    … 非表示の Audio 要素に preload="auto" を指定してブラウザのキャッシュを温める
 * - ネイティブ … ミュートしたプレイヤーを生成しておく（生成時点でバッファリングが始まる）
 *
 * どちらも再生はしない。表示範囲から外れたものは解放する。
 */

type WebAudioLike = { src: string; preload: string; load: () => void };

export function useAudioPrefetch(urls: (string | null | undefined)[]) {
  const nativeCacheRef = useRef(new Map<string, AudioPlayer>());
  const webCacheRef = useRef(new Map<string, WebAudioLike>());

  // 依存配列を安定させるためにキー化する
  const key = urls.filter(Boolean).join("|");

  useEffect(() => {
    const wanted = new Set(key ? key.split("|") : []);

    if (Platform.OS === "web") {
      const cache = webCacheRef.current;
      for (const [url, element] of cache) {
        if (!wanted.has(url)) {
          element.src = "";
          cache.delete(url);
        }
      }
      for (const url of wanted) {
        if (cache.has(url)) {
          continue;
        }
        try {
          const AudioCtor = (globalThis as { Audio?: new () => WebAudioLike }).Audio;
          if (!AudioCtor) {
            break;
          }
          const element = new AudioCtor();
          element.preload = "auto";
          element.src = url;
          element.load();
          cache.set(url, element);
        } catch (error) {
          console.warn("音源の先読みに失敗:", error);
        }
      }
      return;
    }

    const cache = nativeCacheRef.current;
    for (const [url, player] of cache) {
      if (!wanted.has(url)) {
        try {
          player.remove();
        } catch {
          // 解放済みなら無視してよい
        }
        cache.delete(url);
      }
    }
    for (const url of wanted) {
      if (cache.has(url)) {
        continue;
      }
      try {
        const player = createAudioPlayer({ uri: url }, { updateInterval: 1000 });
        player.muted = true;
        cache.set(url, player);
      } catch (error) {
        console.warn("音源の先読みに失敗:", error);
      }
    }
  }, [key]);

  // 画面を離れるときにまとめて解放する
  useEffect(() => {
    const nativeCache = nativeCacheRef.current;
    const webCache = webCacheRef.current;
    return () => {
      for (const player of nativeCache.values()) {
        try {
          player.remove();
        } catch {
          // 解放済みなら無視してよい
        }
      }
      nativeCache.clear();
      for (const element of webCache.values()) {
        element.src = "";
      }
      webCache.clear();
    };
  }, []);
}

/** 表示中の曲を中心に、前後 range 曲ぶんのURLを取り出す（表示中の曲自身は除く） */
export function neighborAudioUrls<T>(
  items: T[],
  activeIndex: number,
  getUrl: (item: T) => string | undefined,
  range = 2,
): string[] {
  const urls: string[] = [];
  for (let offset = -range; offset <= range; offset += 1) {
    if (offset === 0) {
      continue;
    }
    const item = items[activeIndex + offset];
    if (!item) {
      continue;
    }
    const url = getUrl(item);
    if (url && !urls.includes(url)) {
      urls.push(url);
    }
  }
  return urls;
}
