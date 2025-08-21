import hark from "hark";

export function detectSpeechEnd({
  audioCtx,
  stream,
  onSpeechStart,
  onSpeechEnd,
  voiceMinDecibels = -50,
  silenceDuration = 10_000,
}: {
  audioCtx: AudioContext;
  stream: MediaStream;
  onSpeechStart: () => void;
  onSpeechEnd: () => void;
  voiceMinDecibels?: number;
  /** ms of silence before triggering speech end */
  silenceDuration?: number;
}) {
  const speechDetector = hark(stream, {
    audioContext: audioCtx,
    threshold: voiceMinDecibels,
    interval: 150,
    play: false,
  });

  let silenceTimeout: ReturnType<typeof setTimeout> | undefined;

  speechDetector.on("speaking", () => {
    clearTimeout(silenceTimeout);
    onSpeechStart();
  });

  speechDetector.on("stopped_speaking", () => {
    clearTimeout(silenceTimeout);
    silenceTimeout = setTimeout(onSpeechEnd, silenceDuration);
  });

  return () => {
    clearTimeout(silenceTimeout);
    speechDetector.stop();
  };
}
