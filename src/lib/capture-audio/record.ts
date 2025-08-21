export function recordAudio({
  stream,
  onDataAvailable,
  onStop,
  onError,
  timeslice = 0,
}: {
  stream: MediaStream;
  onDataAvailable: (be: BlobEvent) => void;
  onStop?: () => void;
  onError?: (err: any) => void;
  /** Interval in ms at which data should be captured */
  timeslice?: number;
}) {
  const mediaRecorder = new MediaRecorder(stream);

  mediaRecorder.ondataavailable = onDataAvailable;

  if (onStop) mediaRecorder.onstop = onStop;
  if (onError) mediaRecorder.onerror = onError;

  mediaRecorder.start(timeslice);

  return () => {
    if (mediaRecorder.state !== "inactive") {
      mediaRecorder.stop();
    }
  };
}
