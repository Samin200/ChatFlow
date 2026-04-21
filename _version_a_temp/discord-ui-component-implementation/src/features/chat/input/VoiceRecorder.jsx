import { useState, useRef, useEffect, useCallback } from "react";
import { Mic, Square, Send } from "lucide-react";
import { clamp, generateWaveBars } from "../../../utils/helpers.js";

/**
 * VoiceRecorder — encapsulates MediaRecorder logic.
 * Returns actual audio Blob + duration to parent via onRecordingComplete.
 *
 * Props:
 *   disabled        — if true, recording is blocked
 *   onRecordingComplete({ blob, duration }) — called with the audio blob and seconds
 */
export default function VoiceRecorder({ disabled, onRecordingComplete }) {
  const [recording, setRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const streamRef = useRef(null);
  const recordStartRef = useRef(0);
  const recordTickerRef = useRef(null);
  const holdTimerRef = useRef(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearTimeout(holdTimerRef.current);
      clearInterval(recordTickerRef.current);
      stopMediaStream();
    };
  }, []);

  function stopMediaStream() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }

  async function startRecording() {
    if (disabled) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Prefer webm/opus for broad browser support, fallback to whatever the browser supports
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/webm")
        ? "audio/webm"
        : "audio/mp4";

      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: mimeType });
        const elapsed = Math.floor((Date.now() - recordStartRef.current) / 1000);
        const duration = clamp(elapsed || 1, 1, 120);

        stopMediaStream();
        audioChunksRef.current = [];

        if (blob.size > 0) {
          onRecordingComplete?.({ blob, duration });
        }
      };

      recorder.start(250); // collect data every 250ms
      recordStartRef.current = Date.now();
      setRecordSeconds(0);
      setRecording(true);

      recordTickerRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - recordStartRef.current) / 1000);
        setRecordSeconds(elapsed);
      }, 300);
    } catch (err) {
      console.error("[VoiceRecorder] Microphone access denied:", err);
      stopMediaStream();
    }
  }

  function stopRecording() {
    clearInterval(recordTickerRef.current);
    setRecording(false);
    setRecordSeconds(0);

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
  }

  // Hold-to-record: start after 220ms hold, stop on release
  const handlePointerDown = useCallback(() => {
    if (disabled || recording) return;
    clearTimeout(holdTimerRef.current);
    holdTimerRef.current = setTimeout(() => {
      startRecording();
    }, 220);
  }, [disabled, recording]);

  const handlePointerUp = useCallback(() => {
    clearTimeout(holdTimerRef.current);
    if (recording) {
      stopRecording();
    }
  }, [recording]);

  return (
    <>
      {recording && (
        <div className="flex items-center gap-3 rounded-xl bg-white/5 border border-white/10 px-3 py-2 animate-message-in">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500" />
          </span>
          <span className="text-rose-400 text-xs font-medium tabular-nums">
            Recording {recordSeconds}s
          </span>
          <div className="flex items-end gap-0.5 h-5">
            {generateWaveBars(16).map((bar, index) => (
              <span
                key={`${bar}-${index}`}
                className="w-0.5 bg-teal-400/70 rounded-full animate-wave"
                style={{ height: `${bar}px`, animationDelay: `${index * 60}ms` }}
              />
            ))}
          </div>
          <button
            type="button"
            onClick={stopRecording}
            className="ml-auto h-8 w-8 flex items-center justify-center rounded-full bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 transition-colors"
            aria-label="Stop recording"
          >
            <Square className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {!recording && (
        <button
          type="button"
          onMouseDown={handlePointerDown}
          onMouseUp={handlePointerUp}
          onMouseLeave={handlePointerUp}
          onTouchStart={handlePointerDown}
          onTouchEnd={handlePointerUp}
          disabled={disabled}
          className="w-12 h-12 flex items-center justify-center flex-shrink-0 rounded-full border bg-white/10 border-white/10 hover:bg-white/20 transition-all disabled:opacity-40"
          style={{ color: "var(--color-text)" }}
          title="Hold to record voice message"
          aria-label="Hold to record"
        >
          <Mic className="w-6 h-6" />
        </button>
      )}
    </>
  );
}
