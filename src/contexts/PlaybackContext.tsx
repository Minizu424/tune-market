import {
  setAudioModeAsync,
  useAudioPlayer,
  useAudioPlayerStatus,
} from "expo-audio";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { addSongPlaySeconds, registerSongPlay } from "@/services/recordSongPlay";
import type { Song } from "@/types";

type PlaybackContextValue = {
  queue: Song[];
  currentIndex: number;
  currentSong: Song | null;
  isPlaying: boolean;
  /** リールなどのキューを設定して再生する（同じ曲なら再生を継続） */
  playQueue: (songs: Song[], startIndex: number) => void;
  /** 単曲を再生する（楽曲詳細の試聴用） */
  playSingle: (song: Song) => void;
  /** 再生/一時停止の切り替え */
  toggle: () => void;
  /** 再生を止めてミニプレイヤーを閉じる */
  stop: () => void;
};

const PlaybackContext = createContext<PlaybackContextValue | null>(null);

/**
 * アプリ全体の音楽再生を管理するプロバイダ。
 * 画面を移動しても再生が続き（YouTubeのミニプレイヤー風）、
 * 曲が最後まで再生されたらキューの次の曲へ自動で進む。
 * 再生数・再生時間の記録（株価の指標）もここで行う。
 */
export function PlaybackProvider({ children }: { children: ReactNode }) {
  const player = useAudioPlayer();
  const status = useAudioPlayerStatus(player);

  const [queue, setQueue] = useState<Song[]>([]);
  const [currentIndex, setCurrentIndex] = useState(-1);

  const queueRef = useRef<Song[]>([]);
  const indexRef = useRef(-1);
  const audioUrlRef = useRef<string | null>(null);
  const registeredSongIdRef = useRef<string | null>(null);

  useEffect(() => {
    // iOSのサイレントモードでも再生できるようにする
    setAudioModeAsync({ playsInSilentMode: true }).catch(console.error);
  }, []);

  const currentSong =
    currentIndex >= 0 ? (queue[currentIndex] ?? null) : null;

  const loadSong = useCallback(
    (song: Song | null) => {
      const url = song?.audioUrl || null;
      if (url) {
        if (audioUrlRef.current !== url) {
          audioUrlRef.current = url;
          player.replace({ uri: url });
        }
        player.loop = false;
        player.play();
      } else {
        // 音源のない曲は表示だけ（再生は止める）
        audioUrlRef.current = null;
        player.pause();
      }
    },
    [player],
  );

  const applyIndex = useCallback(
    (songs: Song[], index: number) => {
      queueRef.current = songs;
      indexRef.current = index;
      setQueue(songs);
      setCurrentIndex(index);
      loadSong(songs[index] ?? null);
    },
    [loadSong],
  );

  const playQueue = useCallback(
    (songs: Song[], startIndex: number) => {
      const target = songs[startIndex];
      if (!target) {
        return;
      }
      const current = queueRef.current[indexRef.current];
      if (current?.id === target.id) {
        // 同じ曲なら再生を止めずにキューだけ差し替える
        queueRef.current = songs;
        indexRef.current = startIndex;
        setQueue(songs);
        setCurrentIndex(startIndex);
        return;
      }
      applyIndex(songs, startIndex);
    },
    [applyIndex],
  );

  const playSingle = useCallback(
    (song: Song) => {
      const current = queueRef.current[indexRef.current];
      if (current?.id === song.id) {
        if (song.audioUrl) {
          player.play();
        }
        return;
      }
      applyIndex([song], 0);
    },
    [applyIndex, player],
  );

  const toggle = useCallback(() => {
    const song = queueRef.current[indexRef.current];
    if (!song?.audioUrl) {
      return;
    }
    if (player.playing) {
      player.pause();
    } else {
      player.play();
    }
  }, [player]);

  const stop = useCallback(() => {
    player.pause();
    audioUrlRef.current = null;
    queueRef.current = [];
    indexRef.current = -1;
    setQueue([]);
    setCurrentIndex(-1);
  }, [player]);

  // 曲が最後まで再生されたら、次の曲（音源のない曲はスキップ）へ進む
  useEffect(() => {
    if (!status.didJustFinish) {
      return;
    }
    const songs = queueRef.current;
    const index = indexRef.current;
    if (songs.length === 0 || index < 0) {
      return;
    }
    if (songs.length === 1) {
      // 単曲再生（詳細画面の試聴など）は最後で停止
      player.pause();
      return;
    }
    for (let step = 1; step <= songs.length; step += 1) {
      const nextIndex = (index + step) % songs.length;
      if (songs[nextIndex]?.audioUrl) {
        applyIndex(songs, nextIndex);
        return;
      }
    }
  }, [status.didJustFinish, applyIndex, player]);

  // 再生記録（株価の指標）: 2秒以上の再生で1再生、再生時間も加算
  const currentSongId = currentSong?.id ?? null;
  useEffect(() => {
    if (!status.playing || !currentSongId) {
      return;
    }
    const songId = currentSongId;
    const startedAt = Date.now();
    const shouldRegister = registeredSongIdRef.current !== songId;
    const timer = shouldRegister
      ? setTimeout(() => {
          registeredSongIdRef.current = songId;
          registerSongPlay(songId);
        }, 2000)
      : null;

    return () => {
      if (timer) {
        clearTimeout(timer);
      }
      const seconds = (Date.now() - startedAt) / 1000;
      if (seconds >= 1) {
        addSongPlaySeconds(songId, seconds);
      }
    };
  }, [status.playing, currentSongId]);

  const value = useMemo(
    () => ({
      queue,
      currentIndex,
      currentSong,
      isPlaying: status.playing,
      playQueue,
      playSingle,
      toggle,
      stop,
    }),
    [queue, currentIndex, currentSong, status.playing, playQueue, playSingle, toggle, stop],
  );

  return (
    <PlaybackContext.Provider value={value}>{children}</PlaybackContext.Provider>
  );
}

export function usePlayback(): PlaybackContextValue {
  const context = useContext(PlaybackContext);
  if (!context) {
    throw new Error("usePlayback must be used within PlaybackProvider");
  }
  return context;
}
