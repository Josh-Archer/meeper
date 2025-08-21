import { detectSpeechEnd } from "./detectSpeech";
import { recordAudio } from "./record";

export function captureAudio({
  stream,
  audioCtx,
  onAudio,
  minChunkDuration = 1_000,
  mode = "stream",
}: {
  stream: MediaStream;
  audioCtx: AudioContext;
  onAudio: (f: File) => void;
  minChunkDuration?: number;
  mode?: "stream" | "chunks";
}) {
  if (mode === "stream") {
    const stop = recordAudio({
      stream,
      timeslice: 250,
      onDataAvailable: (evt: BlobEvent) => {
        const file = new File([evt.data], `meeper_chunk.webm`, {
          type: "audio/webm",
        });
        onAudio(file);
      },
      onError: console.error,
    });

    return () => {
      stop();
    };
  }

  const chunks: Blob[] = [];
  let startedAt: number;
  let stopRecord: (() => void) | undefined;
  let releaseTimeout: ReturnType<typeof setTimeout>;

  const onDataAvailable = async (evt: BlobEvent) => {
    clearTimeout(releaseTimeout);
    chunks.push(evt.data);

    if (Date.now() - startedAt > minChunkDuration) {
      releaseAudio();
      return;
    }

    releaseTimeout = setTimeout(releaseAudio, 250);
  };

  const releaseAudio = () => {
    const blob = new Blob(chunks, { type: "audio/webm;codecs=opus" });
    const file = new File([blob], "meeper_chunk.webm", {
      type: "audio/webm",
    });

    startedAt = 0;
    chunks.length = 0;

    onAudio(file);
  };

  const startRecord = () => {
    if (!startedAt) {
      startedAt = Date.now();
    }

    stopRecord = recordAudio({
      stream,
      timeslice: 250,
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
