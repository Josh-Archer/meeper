import { detectSpeechEnd } from "./detectSpeech";
import { recordAudio } from "./record";

export function captureAudio({
  stream,
  audioCtx,
  onAudio,
  silenceDuration = 10_000,
}: {
  stream: MediaStream;
  audioCtx: AudioContext;
  onAudio: (f: File) => void;
  /** ms of silence before considering speech ended */
  silenceDuration?: number;
}) {
  let stopRecord: (() => void) | undefined;

  const startRecord = () => {
    stopRecord = recordAudio({
      stream,
      timeslice: 100,
      onDataAvailable: (evt: BlobEvent) => {
        const file = new File([evt.data], "meeper_chunk.webm", {
          type: "audio/webm",
        });
        onAudio(file);
      },
      onError: console.error,
    });
  };

  const stopSpeechDetect = detectSpeechEnd({
    audioCtx,
    stream,
    silenceDuration,
    onSpeechStart() {
      console.info("[Speech] started.");
      startRecord();
    },
    onSpeechEnd() {
      console.info("[Speech] end.");
      setTimeout(() => stopRecord?.(), 30);
    },
  });

  return () => {
    stopSpeechDetect();
    stopRecord?.();
  };
}
