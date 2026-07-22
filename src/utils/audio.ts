/**
 * Web Audio API Synth Sound Generator
 * Generates futuristic, retro-modern cryptographic sound effects dynamically.
 */

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  // Resume context if suspended (browser security autoplays policy)
  if (audioCtx.state === "suspended") {
    audioCtx.resume();
  }
  return audioCtx;
}

export const playSound = (type: "click" | "ai_open" | "mission_complete" | "level_up") => {
  try {
    if (localStorage.getItem("chainquest_sound_muted") === "true") {
      return;
    }
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    switch (type) {
      case "click": {
        // Quick subtle high-tech click
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        
        osc.type = "sine";
        osc.frequency.setValueAtTime(1200, now);
        osc.frequency.exponentialRampToValueAtTime(600, now + 0.05);
        
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
        
        osc.connect(gain);
        gain.connect(ctx.destination);
        
        osc.start(now);
        osc.stop(now + 0.06);
        break;
      }

      case "ai_open": {
        // Futuristic gentle ambient chime/swell
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gain = ctx.createGain();

        osc1.type = "sine";
        osc1.frequency.setValueAtTime(440, now); // A4
        osc1.frequency.exponentialRampToValueAtTime(880, now + 0.3); // Smooth sweep up

        osc2.type = "triangle";
        osc2.frequency.setValueAtTime(554.37, now); // C#5
        osc2.frequency.exponentialRampToValueAtTime(1108.73, now + 0.3);

        gain.gain.setValueAtTime(0.001, now);
        gain.gain.linearRampToValueAtTime(0.12, now + 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(ctx.destination);

        osc1.start(now);
        osc2.start(now);
        osc1.stop(now + 0.45);
        osc2.stop(now + 0.45);
        break;
      }

      case "mission_complete": {
        // Upward energetic cryptographic arpeggio (C Major add9)
        const notes = [261.63, 329.63, 392.00, 523.25, 587.33, 659.25]; // C4, E4, G4, C5, D5, E5
        notes.forEach((freq, index) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          const startTime = now + index * 0.07;
          
          osc.type = "sine";
          osc.frequency.setValueAtTime(freq, startTime);
          
          gain.gain.setValueAtTime(0.12, startTime);
          gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.25);
          
          osc.connect(gain);
          gain.connect(ctx.destination);
          
          osc.start(startTime);
          osc.stop(startTime + 0.28);
        });
        break;
      }

      case "level_up": {
        // Grand, triumphant golden-ratio crescendo sweep with double-layered frequencies
        const chords = [130.81, 196.00, 261.63, 392.00, 523.25, 783.99, 1046.50]; // Low C up to super high C
        
        chords.forEach((freq, index) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          const startTime = now + index * 0.04;
          
          osc.type = index % 2 === 0 ? "triangle" : "sine";
          osc.frequency.setValueAtTime(freq, startTime);
          osc.frequency.exponentialRampToValueAtTime(freq * 2, startTime + 0.6); // Octave jump for hype!
          
          gain.gain.setValueAtTime(0.001, startTime);
          gain.gain.linearRampToValueAtTime(0.1, startTime + 0.1);
          gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.7);
          
          osc.connect(gain);
          gain.connect(ctx.destination);
          
          osc.start(startTime);
          osc.stop(startTime + 0.75);
        });
        break;
      }
    }
  } catch (err) {
    console.warn("Web Audio API not supported or autoplay policy restricted trigger:", err);
  }
};
