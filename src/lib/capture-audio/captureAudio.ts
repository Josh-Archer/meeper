import { detectSpeechEnd } from "./detectSpeech";
import { recordAudio } from "./record";

export function captureAudio({
  stream,
  audioCtx,
  onAudio,
  minChunkDuration = 5_000,
  mode = "stream",
}: {
  stream: MediaStream;
  audioCtx: AudioContext;
  onAudio: (f: File) => void;
  minChunkDuration?: number;
  mode?: "stream" | "chunks";
}) {
  if (mode === "chunks") {
    const chunks: Blob[] = [];
    const stop = recordAudio({
      stream,
      onDataAvailable: (evt: BlobEvent) => chunks.push(evt.data),
      onError: console.error,
    });

    return () => {
      stop();
      if (!chunks.length) return;
      const blob = new Blob(chunks, { type: "audio/webm;codecs=opus" });
      const file = new File([blob], "meeper_chunk.webm", { type: "audio/webm" });
      onAudio(file);
    };
  }

  let startedAt: number;
  let chunks: Blob[] = [];
  let stopRecord: (() => void) | undefined;
  let releaseTimeout: ReturnType<typeof setTimeout>;

  const onDataAvailable = async (evt: BlobEvent) => {
    clearTimeout(releaseTimeout);
    chunks.push(evt.data);

    if (Date.now() - startedAt > minChunkDuration) {
      releaseAudio();
      return;
    }

    releaseTimeout = setTimeout(releaseAudio, 500);
  };

  const releaseAudio = () => {
    const blob = new Blob(chunks, { type: "audio/webm;codecs=opus" });
    const file = new File([blob], "meeper_chunk.webm", {
      type: "audio/webm",
    });

    startedAt = 0;
    chunks = [];

    onAudio(file);
  };

  const startRecord = () => {
    if (!startedAt) {
      startedAt = Date.now();
    }

    stopRecord = recordAudio({
      stream,
      onDataAvailable,
      onError: console.error,
    });
  };

  const stopSpeechDetect = detectSpeechEnd({
    audioCtx,
    stream,
    onSpeechStart() {
      console.info("[Speech] started.");

      startRecord();
    },
    onSpeechEnd() {
      console.info("[Speech] end.");

      setTimeout(stopRecord!, 30);
    },
  });

  return () => {
    stopSpeechDetect();
    stopRecord?.();
    if (chunks.length) {
      releaseAudio();
    }
  };
}
