import { PauseIcon, PlayIcon, PowerIcon, CameraIcon } from "lucide-react";

import { Button } from "./ui/button";

export default function ControlButtons({
  streamActive,
  recording,
  start,
  pause,
  stop,
  captureScreenshot,
}: {
  streamActive: boolean;
  recording: boolean;
  start: () => void;
  pause: () => void;
  stop: () => void;
  captureScreenshot?: () => void;
}) {
  return (
    <>
      {captureScreenshot && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="mr-2"
          disabled={!streamActive}
          onClick={() => captureScreenshot()}
        >
          <CameraIcon className="mr-2 h-5 w-auto" />
          Shot
        </Button>
      )}

      <Button
        type="button"
        variant="outline"
        size="sm"
        className="mr-2"
        disabled={!streamActive}
        onClick={() => (recording ? pause() : start())}
      >
        {recording || !streamActive ? (
          <>
            <PauseIcon className="mr-2 h-5 w-auto" />
            Pause
          </>
        ) : (
          <>
            <PlayIcon className="mr-2 h-5 w-auto" />
            Continue
          </>
        )}
      </Button>

      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={!streamActive}
        onClick={() => stop()}
      >
        <PowerIcon className="mr-2 h-5 w-auto" />
        Stop
      </Button>
    </>
  );
}
