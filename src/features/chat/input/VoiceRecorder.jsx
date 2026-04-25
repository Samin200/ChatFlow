import { useState, useRef, useEffect } from "react";
import { Mic, Send, Trash2 } from "lucide-react";
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
  const isCancelledRef = useRef(false);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
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

      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/webm")
        ? "audio/webm"
        : "audio/mp4";

      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];
      isCancelledRef.current = false;

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

        if (blob.size > 0 && !isCancelledRef.current) {
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

  function cancelRecording() {
    isCancelledRef.current = true;
    stopRecording();
  }

  function finishRecording() {
    isCancelledRef.current = false;
    stopRecording();
  }

  return (
    <>
      {recording && (
        <div className="absolute right-2 sm:right-3 bottom-[calc(env(safe-area-inset-bottom)+8px)] md:bottom-[calc(env(safe-area-inset-bottom)+12px)] z-50 flex items-center justify-between gap-2 sm:gap-3 rounded-[30px] px-3 py-1.5 animate-message-in w-[calc(100%-16px)] sm:w-[calc(100%-24px)] max-w-[340px] shadow-lg backdrop-blur-md"
             style={{ backgroundColor: "color-mix(in srgb, var(--color-surface) 95%, black 5%)", border: "1px solid color-mix(in srgb, var(--color-accent) 40%, transparent)" }}>
          
          {/* Cancel button */}
          <button
            type="button"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); cancelRecording(); }}
            className="h-10 w-10 flex items-center justify-center rounded-full text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors flex-shrink-0"
            aria-label="Cancel recording"
          >
            <Trash2 className="w-5 h-5" />
          </button>

          {/* Center Info */}
          <div className="flex items-center gap-3 flex-1 min-w-0 justify-center">
            {/* Red recording dot */}
            <span className="relative flex h-2.5 w-2.5 flex-shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500" />
            </span>

            {/* Time */}
            <span className="text-rose-400 text-sm font-medium tabular-nums whitespace-nowrap">
              {recordSeconds}s
            </span>

            {/* Waveform */}
            <div className="flex items-end gap-[3px] h-5 min-w-0 overflow-hidden px-1">
              {generateWaveBars(10).map((bar, index) => (
                <span
                  key={`${bar}-${index}`}
                  className="w-0.5 bg-rose-400/70 rounded-full animate-wave flex-shrink-0"
                  style={{ height: `${bar}px`, animationDelay: `${index * 60}ms` }}
                />
              ))}
            </div>
          </div>

          {/* Send button */}
          <button
            type="button"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); finishRecording(); }}
            className="h-10 w-10 flex items-center justify-center rounded-full text-white shadow-md transition-transform hover:scale-105 active:scale-95 flex-shrink-0"
            style={{
              backgroundImage: "linear-gradient(135deg, var(--color-primary), color-mix(in srgb, var(--color-accent) 88%, white 12%))",
            }}
            aria-label="Send recording"
          >
            <Send className="w-5 h-5 -ml-0.5" />
          </button>
        </div>
      )}

      {!recording && (
        <button
          type="button"
          onClick={startRecording}
          disabled={disabled}
          className="w-12 h-12 flex items-center justify-center flex-shrink-0 rounded-full text-white shadow-lg transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
          style={{
            backgroundImage: "linear-gradient(135deg, var(--color-primary), color-mix(in srgb, var(--color-accent) 88%, white 12%))",
            boxShadow: "0 12px 26px color-mix(in srgb, var(--color-accent) 28%, transparent)",
          }}
          title="Click to record voice message"
          aria-label="Click to record"
        >
          <Mic className="w-6 h-6" />
        </button>
      )}
    </>
  );
}
