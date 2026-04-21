let audioInstance = null;

const INCOMING_SOUND_URL =
  "https://actions.google.com/sounds/v1/cartoon/wood_plank_flicks.ogg";

function getAudioInstance() {
  if (typeof window === "undefined") return null;
  if (!audioInstance) {
    audioInstance = new Audio(INCOMING_SOUND_URL);
    audioInstance.preload = "auto";
    audioInstance.volume = 0.45;
  }
  return audioInstance;
}

function playFallbackTone() {
  if (typeof window === "undefined" || !window.AudioContext) return;
  try {
    const context = new window.AudioContext();
    const oscillator = context.createOscillator();
    const gain = context.createGain();

    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(820, context.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(540, context.currentTime + 0.14);

    gain.gain.setValueAtTime(0.0001, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.13, context.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.16);

    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + 0.17);
  } catch {
    // Ignore tone playback failures.
  }
}

export function playIncomingSound() {
  const audio = getAudioInstance();
  if (!audio) return;

  try {
    audio.currentTime = 0;
    const playPromise = audio.play();
    if (playPromise && typeof playPromise.catch === "function") {
      playPromise.catch(() => {
        playFallbackTone();
      });
    }
  } catch {
    playFallbackTone();
  }
}
