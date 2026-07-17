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
import type { AudioPlayer } from "expo-audio";
import { addSongPlaySeconds, registerSongPlay } from "@/services/recordSongPlay";
import type { Song } from "@/types";

type PlaybackContextValue = {
  /** シークバーなどが直接ステータス購読するためのplayer本体 */
  player: AudioPlayer;
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
  // useAudioPlayerの戻り値は描画ごとに参照が変わることがあるため、
  // コールバックからはrefを通して常に最新のplayerを使う（無限ループ防止）
  const playerRef = useRef(player);
  playerRef.current = player;
  // 1回の再生終了につき1回だけ次の曲へ進むためのガード
  const finishHandledRef = useRef(false);

  useEffect(() => {
    // サイレントモードでの再生 + バックグラウンド再生を有効にする
    setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: true,
      interruptionMode: "doNotMix",
    }).catch(console.error);
  }, []);

  const currentSong =
    currentIndex >= 0 ? (queue[currentIndex] ?? null) : null;

  const loadSong = useCallback((song: Song | null) => {
    const currentPlayer = playerRef.current;
    finishHandledRef.current = false;
    const url = song?.audioUrl || null;
    if (url) {
      if (audioUrlRef.current !== url) {
        audioUrlRef.current = url;
        currentPlayer.replace({ uri: url });
      }
      currentPlayer.loop = false;
      currentPlayer.play();
    } else {
      // 音源のない曲は表示だけ（再生は止める）
      audioUrlRef.current = null;
      currentPlayer.pause();
    }
  }, []);

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
      // 内容が同じキューで再セットされても状態更新しない（無限ループ防止）
      const sameQueue =
        songs.length === queueRef.current.length &&
        songs.every((song, i) => song.id === queueRef.current[i]?.id);

      const current = queueRef.current[indexRef.current];
      if (current?.id === target.id) {
        // 同じ曲なら再生を止めずにキューだけ差し替える
        queueRef.current = songs;
        indexRef.current = startIndex;
        if (!sameQueue) {
          setQueue(songs);
        }
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
          playerRef.current.play();
        }
        return;
      }
      applyIndex([song], 0);
    },
    [applyIndex],
  );

  const toggle = useCallback(() => {
    const song = queueRef.current[indexRef.current];
    if (!song?.audioUrl) {
      return;
    }
    if (playerRef.current.playing) {
      playerRef.current.pause();
    } else {
      playerRef.current.play();
    }
  }, []);

  const stop = useCallback(() => {
    playerRef.current.pause();
    audioUrlRef.current = null;
    queueRef.current = [];
    indexRef.current = -1;
    setQueue([]);
    setCurrentIndex(-1);
  }, []);

  // 曲が最後まで再生されたら、次の曲（音源のない曲はスキップ）へ進む
  useEffect(() => {
    if (!status.didJustFinish) {
      finishHandledRef.current = false;
      return;
    }
    if (finishHandledRef.current) {
      return; // この終了はすでに処理済み（多重発火防止）
    }
    finishHandledRef.current = true;

    const songs = queueRef.current;
    const index = indexRef.current;
    if (songs.length === 0 || index < 0) {
      return;
    }
    if (songs.length === 1) {
      // 単曲再生（詳細画面の試聴など）は最後で停止
      playerRef.current.pause();
      return;
    }
    for (let step = 1; step <= songs.length; step += 1) {
      const nextIndex = (index + step) % songs.length;
      if (songs[nextIndex]?.audioUrl) {
        applyIndex(songs, nextIndex);
        return;
      }
    }
  }, [status.didJustFinish, applyIndex]);

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
      player,
      queue,
      currentIndex,
      currentSong,
      isPlaying: status.playing,
      playQueue,
      playSingle,
      toggle,
      stop,
    }),
    [player, queue, currentIndex, currentSong, status.playing, playQueue, playSingle, toggle, stop],
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
