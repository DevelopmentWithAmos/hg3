import { AnimationStyle, ArenaId } from '../types/game';

export type MusicMode = 'menu' | 'battle' | 'victory' | 'silent';
export type CharacterReactionKind =
  | 'hurt'
  | 'dodge'
  | 'special'
  | 'victory'
  | 'defeat';

/**
 * Procedural Web Audio API synthesizer for MEME FIGHT ARENA.
 * Synthesizes funny punch/kick/bonk SFX, character voice chirps, arena hazard SFX,
 * and a dynamic multi-track arcade background music sequencer.
 * Zero external audio assets required — works offline and in sandboxed iframes.
 */
class SoundEngine {
  private ctx: AudioContext | null = null;
  private sfxGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;

  private enabled = true;
  private volume = 0.65;
  private sfxVolume = 0.85;
  private musicEnabled = true;
  private musicVolume = 0.45;
  private musicDucked = false;

  private musicMode: MusicMode = 'menu';
  private arenaId: ArenaId = 'wrestling';
  private musicTimerId: number | null = null;
  private nextStepTime = 0;
  private stepIndex = 0;

  private lastStepTime = 0;
  private lastReactionTime = 0;

  private ensureContext(allowWhenMuted = false): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!allowWhenMuted && !this.enabled) return null;

    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      if (!AudioCtx) return null;
      this.ctx = new AudioCtx();

      this.sfxGain = this.ctx.createGain();
      this.musicGain = this.ctx.createGain();
      this.sfxGain.connect(this.ctx.destination);
      this.musicGain.connect(this.ctx.destination);

      // Pre-build a 0.35s white-noise buffer once for percussive whooshes & snares
      const len = Math.floor(this.ctx.sampleRate * 0.35);
      const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < len; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      this.noiseBuffer = buf;
      this.applyBusGains();
    }

    if (this.ctx.state === 'suspended') {
      void this.ctx.resume().catch(() => {});
    }

    return this.ctx;
  }

  private applyBusGains(): void {
    if (!this.ctx || !this.sfxGain || !this.musicGain) return;
    const now = this.ctx.currentTime;
    const sfxTarget = this.enabled ? this.volume * this.sfxVolume : 0;
    const duckMult = this.musicDucked ? 0.35 : 1;
    const musicTarget =
      this.enabled && this.musicEnabled
        ? this.volume * this.musicVolume * duckMult * 0.55
        : 0;

    this.sfxGain.gain.setTargetAtTime(sfxTarget, now, 0.025);
    this.musicGain.gain.setTargetAtTime(musicTarget, now, 0.04);
  }

  /** Called on first user gesture so BGM starts cleanly without autoplay errors */
  public unlock(): void {
    const ctx = this.ensureContext(true);
    if (!ctx) return;
    this.applyBusGains();
    if (this.musicMode !== 'silent' && this.musicTimerId === null) {
      this.startSequencer();
    }
  }

  public setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    this.applyBusGains();
  }

  public setVolume(volume: number): void {
    this.volume = Math.max(0, Math.min(1, volume));
    this.applyBusGains();
  }

  public setSfxVolume(volume: number): void {
    this.sfxVolume = Math.max(0, Math.min(1, volume));
    this.applyBusGains();
  }

  public setMusicEnabled(enabled: boolean): void {
    this.musicEnabled = enabled;
    this.applyBusGains();
    if (enabled && this.musicMode !== 'silent' && this.ctx && this.musicTimerId === null) {
      this.startSequencer();
    }
  }

  public setMusicVolume(volume: number): void {
    this.musicVolume = Math.max(0, Math.min(1, volume));
    this.applyBusGains();
  }

  public setMusicDucked(ducked: boolean): void {
    this.musicDucked = ducked;
    this.applyBusGains();
  }

  public setMusicState(mode: MusicMode, arenaId: ArenaId = 'wrestling'): void {
    const changed = this.musicMode !== mode || this.arenaId !== arenaId;
    this.musicMode = mode;
    this.arenaId = arenaId;

    if (mode === 'silent') {
      this.stopSequencer();
      return;
    }

    if (changed) {
      this.stepIndex = 0;
      if (this.ctx) {
        this.nextStepTime = this.ctx.currentTime + 0.06;
      }
    }

    if (this.ctx && this.musicTimerId === null) {
      this.startSequencer();
    }
  }

  private startSequencer(): void {
    if (typeof window === 'undefined' || this.musicTimerId !== null) return;
    if (this.ctx) {
      this.nextStepTime = this.ctx.currentTime + 0.05;
    }
    this.musicTimerId = window.setInterval(() => {
      this.scheduleMusicAhead();
    }, 65);
  }

  private stopSequencer(): void {
    if (this.musicTimerId !== null && typeof window !== 'undefined') {
      window.clearInterval(this.musicTimerId);
      this.musicTimerId = null;
    }
  }

  private midiToFreq(midi: number): number {
    return 440 * Math.pow(2, (midi - 69) / 12);
  }

  private scheduleMusicAhead(): void {
    if (!this.ctx || !this.musicGain) return;
    if (!this.enabled || !this.musicEnabled || this.musicMode === 'silent') return;
    if (this.ctx.state !== 'running') return;

    const tempo =
      this.musicMode === 'battle'
        ? this.arenaId === 'rooftop'
          ? 138
          : this.arenaId === 'cricket_stadium'
            ? 140
            : this.arenaId === 'studio_set'
              ? 136
              : this.arenaId === 'street' || this.arenaId === 'dhaba_highway'
                ? 134
                : 130
        : this.musicMode === 'victory'
          ? 124
          : 108;
    const stepDur = 60 / tempo / 2; // eighth notes

    while (this.nextStepTime < this.ctx.currentTime + 0.16) {
      this.triggerMusicStep(this.stepIndex, this.nextStepTime, stepDur);
      this.nextStepTime += stepDur;
      this.stepIndex = (this.stepIndex + 1) % 32;
    }
  }

  private triggerMusicStep(step: number, time: number, dur: number): void {
    const ctx = this.ctx;
    const out = this.musicGain;
    if (!ctx || !out) return;

    // Slight key transpose per arena so each stage feels musically distinct
    const arenaTranspose =
      this.arenaId === 'street'
        ? 2
        : this.arenaId === 'rooftop'
          ? -3
          : this.arenaId === 'wedding'
            ? 5
            : this.arenaId === 'cricket_stadium'
              ? 4
              : this.arenaId === 'studio_set'
                ? 7
                : this.arenaId === 'dhaba_highway'
                  ? -2
                  : this.arenaId === 'parliament_hall'
                    ? -5
                    : 0;

    if (this.musicMode === 'menu') {
      // Laid-back bouncy funk-arcade menu groove
      const bassPattern = [36, 0, 36, 43, 41, 0, 39, 43, 36, 0, 48, 0, 43, 41, 39, 43];
      const leadPattern = [72, 0, 75, 0, 79, 0, 75, 77, 72, 0, 0, 79, 75, 0, 72, 67];
      const bassMidi = bassPattern[step % 16];
      const leadMidi = leadPattern[step % 16];

      if (bassMidi > 0) {
        this.playMusicTone(this.midiToFreq(bassMidi + arenaTranspose), 'triangle', time, dur * 0.85, 0.22);
      }
      if (leadMidi > 0 && (step < 16 || step % 4 === 0)) {
        this.playMusicTone(this.midiToFreq(leadMidi + arenaTranspose), 'sine', time, dur * 0.72, 0.1);
      }
      if (step % 4 === 0) {
        this.playMusicDrum('kick', time, 0.16);
      } else if (step % 4 === 2) {
        this.playMusicDrum('hat', time, 0.05);
      }
      return;
    }

    if (this.musicMode === 'victory') {
      // Upbeat celebratory trophy groove
      const bassPattern = [48, 0, 52, 0, 55, 0, 52, 55, 53, 0, 57, 0, 55, 0, 52, 48];
      const fanfare = [72, 76, 79, 84, 0, 79, 84, 0, 77, 81, 84, 86, 84, 0, 79, 0];
      const b = bassPattern[step % 16];
      const f = fanfare[step % 16];
      if (b > 0) this.playMusicTone(this.midiToFreq(b), 'triangle', time, dur * 0.8, 0.2);
      if (f > 0) this.playMusicTone(this.midiToFreq(f), 'square', time, dur * 0.65, 0.08);
      if (step % 2 === 0) this.playMusicDrum(step % 4 === 0 ? 'kick' : 'hat', time, 0.12);
      return;
    }

    // High-energy combat groove
    const battleBass = [
      36, 36, 48, 36, 39, 39, 46, 39, 41, 41, 48, 41, 43, 46, 43, 39,
      36, 36, 48, 36, 43, 43, 50, 43, 41, 41, 48, 41, 46, 43, 41, 39,
    ];
    const battleLead = [
      72, 0, 75, 77, 79, 0, 75, 0, 77, 0, 75, 72, 74, 0, 67, 0,
      72, 75, 79, 0, 84, 0, 79, 77, 75, 0, 77, 79, 75, 72, 67, 0,
    ];

    const bMidi = battleBass[step];
    const lMidi = battleLead[step];
    if (bMidi > 0) {
      this.playMusicTone(this.midiToFreq(bMidi + arenaTranspose), 'sawtooth', time, dur * 0.72, 0.14);
    }
    if (lMidi > 0) {
      this.playMusicTone(this.midiToFreq(lMidi + arenaTranspose), 'square', time, dur * 0.68, 0.075);
    }

    if (step % 4 === 0) {
      this.playMusicDrum('kick', time, 0.22);
    } else if (step % 4 === 2) {
      this.playMusicDrum('snare', time, 0.12);
    } else {
      this.playMusicDrum('hat', time, 0.05);
    }
  }

  private playMusicTone(
    freq: number,
    type: OscillatorType,
    time: number,
    duration: number,
    amp: number,
  ): void {
    const ctx = this.ctx;
    const out = this.musicGain;
    if (!ctx || !out) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, time);

    gain.gain.setValueAtTime(0.001, time);
    gain.gain.linearRampToValueAtTime(amp, time + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.001, time + duration);

    osc.connect(gain);
    gain.connect(out);
    osc.start(time);
    osc.stop(time + duration + 0.02);
  }

  private playMusicDrum(
    kind: 'kick' | 'snare' | 'hat',
    time: number,
    amp: number,
  ): void {
    const ctx = this.ctx;
    const out = this.musicGain;
    if (!ctx || !out) return;

    if (kind === 'kick') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(140, time);
      osc.frequency.exponentialRampToValueAtTime(42, time + 0.11);
      gain.gain.setValueAtTime(amp, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.12);
      osc.connect(gain);
      gain.connect(out);
      osc.start(time);
      osc.stop(time + 0.13);
      return;
    }

    if (!this.noiseBuffer) return;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer;

    const filter = ctx.createBiquadFilter();
    filter.type = kind === 'hat' ? 'highpass' : 'bandpass';
    filter.frequency.setValueAtTime(kind === 'hat' ? 6200 : 1800, time);

    const gain = ctx.createGain();
    const len = kind === 'hat' ? 0.04 : 0.1;
    gain.gain.setValueAtTime(amp, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + len);

    src.connect(filter);
    filter.connect(gain);
    gain.connect(out);
    src.start(time);
    src.stop(time + len + 0.01);
  }

  private playFilteredNoise(
    freq: number,
    q: number,
    duration: number,
    amp: number,
    type: BiquadFilterType = 'bandpass',
  ): void {
    const ctx = this.ctx;
    const out = this.sfxGain;
    if (!ctx || !out || !this.noiseBuffer) return;
    const now = ctx.currentTime;

    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer;

    const filter = ctx.createBiquadFilter();
    filter.type = type;
    filter.frequency.setValueAtTime(freq, now);
    filter.Q.setValueAtTime(q, now);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(amp, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    src.connect(filter);
    filter.connect(gain);
    gain.connect(out);
    src.start(now);
    src.stop(now + duration + 0.02);
  }

  public playUiClick(): void {
    const ctx = this.ensureContext();
    const out = this.sfxGain;
    if (!ctx || !out) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(540, now);
    osc.frequency.exponentialRampToValueAtTime(920, now + 0.06);

    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.075);

    osc.connect(gain);
    gain.connect(out);
    osc.start(now);
    osc.stop(now + 0.08);
  }

  public playUiHover(): void {
    const ctx = this.ensureContext();
    const out = this.sfxGain;
    if (!ctx || !out) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(430, now);
    osc.frequency.exponentialRampToValueAtTime(510, now + 0.035);

    gain.gain.setValueAtTime(0.05, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

    osc.connect(gain);
    gain.connect(out);
    osc.start(now);
    osc.stop(now + 0.045);
  }

  public playMatchStartBell(): void {
    const ctx = this.ensureContext();
    const out = this.sfxGain;
    if (!ctx || !out) return;
    const now = ctx.currentTime;

    const freqs = [880, 1320, 1760, 2240];
    freqs.forEach((f, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = idx % 2 === 0 ? 'sine' : 'triangle';
      osc.frequency.setValueAtTime(f, now);

      const amp = 0.16 / (idx + 1);
      gain.gain.setValueAtTime(amp, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.58);

      osc.connect(gain);
      gain.connect(out);
      osc.start(now);
      osc.stop(now + 0.6);
    });
  }

  public playKO(): void {
    const ctx = this.ensureContext();
    const out = this.sfxGain;
    if (!ctx || !out) return;
    const now = ctx.currentTime;

    [660, 520, 390].forEach((f, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      const t0 = now + idx * 0.11;
      osc.frequency.setValueAtTime(f, t0);
      osc.frequency.exponentialRampToValueAtTime(f * 0.84, t0 + 0.3);

      gain.gain.setValueAtTime(0.2, t0);
      gain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.32);

      osc.connect(gain);
      gain.connect(out);
      osc.start(t0);
      osc.stop(t0 + 0.34);
    });
  }

  public playFootstep(running: boolean): void {
    const ctx = this.ensureContext();
    const out = this.sfxGain;
    if (!ctx || !out) return;
    const now = ctx.currentTime;
    const minInterval = running ? 0.21 : 0.34;
    if (now - this.lastStepTime < minInterval) return;
    this.lastStepTime = now;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    const baseFreq = running ? 145 : 110;
    osc.frequency.setValueAtTime(baseFreq + Math.random() * 25, now);
    osc.frequency.exponentialRampToValueAtTime(45, now + 0.065);

    gain.gain.setValueAtTime(running ? 0.11 : 0.065, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);

    osc.connect(gain);
    gain.connect(out);
    osc.start(now);
    osc.stop(now + 0.075);
  }

  public playJump(): void {
    const ctx = this.ensureContext();
    const out = this.sfxGain;
    if (!ctx || !out) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(210, now);
    osc.frequency.exponentialRampToValueAtTime(540, now + 0.14);

    gain.gain.setValueAtTime(0.14, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);

    osc.connect(gain);
    gain.connect(out);
    osc.start(now);
    osc.stop(now + 0.17);
  }

  public playLand(): void {
    const ctx = this.ensureContext();
    const out = this.sfxGain;
    if (!ctx || !out) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(140, now);
    osc.frequency.exponentialRampToValueAtTime(42, now + 0.1);

    gain.gain.setValueAtTime(0.16, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.11);

    osc.connect(gain);
    gain.connect(out);
    osc.start(now);
    osc.stop(now + 0.12);
  }

  /** Funny cartoon punch: snappy air whoosh + rubbery glove pop */
  public playPunch(comboStep: number): void {
    const ctx = this.ensureContext();
    const out = this.sfxGain;
    if (!ctx || !out) return;
    const now = ctx.currentTime;

    this.playFilteredNoise(comboStep % 2 === 0 ? 1400 : 1750, 1.5, 0.08, 0.14);

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    const startFreq = comboStep % 2 === 0 ? 440 : 520;
    osc.frequency.setValueAtTime(startFreq, now);
    osc.frequency.exponentialRampToValueAtTime(680, now + 0.025);
    osc.frequency.exponentialRampToValueAtTime(110, now + 0.1);

    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.11);

    osc.connect(gain);
    gain.connect(out);
    osc.start(now);
    osc.stop(now + 0.12);
  }

  /** Funny cartoon kick: whistling sweep + deep comical thwack */
  public playKick(): void {
    const ctx = this.ensureContext();
    const out = this.sfxGain;
    if (!ctx || !out) return;
    const now = ctx.currentTime;

    this.playFilteredNoise(920, 1.2, 0.14, 0.17);

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(320, now);
    osc.frequency.exponentialRampToValueAtTime(520, now + 0.045);
    osc.frequency.exponentialRampToValueAtTime(75, now + 0.16);

    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.17);

    osc.connect(gain);
    gain.connect(out);
    osc.start(now);
    osc.stop(now + 0.18);
  }

  public playSpecialWindup(
    animType: 'slam' | 'helicopter' | 'hurricane' | 'popup' = 'slam',
  ): void {
    const ctx = this.ensureContext();
    const out = this.sfxGain;
    if (!ctx || !out) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    if (animType === 'helicopter') {
      osc.type = 'square';
      osc.frequency.setValueAtTime(160, now);
      osc.frequency.exponentialRampToValueAtTime(560, now + 0.28);
    } else if (animType === 'hurricane') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(340, now);
      osc.frequency.exponentialRampToValueAtTime(1020, now + 0.2);
    } else if (animType === 'popup') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(280, now);
      osc.frequency.exponentialRampToValueAtTime(1120, now + 0.22);
    } else {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(240, now);
      osc.frequency.exponentialRampToValueAtTime(780, now + 0.24);
    }

    gain.gain.setValueAtTime(0.14, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);

    osc.connect(gain);
    gain.connect(out);
    osc.start(now);
    osc.stop(now + 0.29);
  }

  public playSpecialSlam(
    animType: 'slam' | 'helicopter' | 'hurricane' | 'popup' = 'slam',
  ): void {
    const ctx = this.ensureContext();
    const out = this.sfxGain;
    if (!ctx || !out) return;
    const now = ctx.currentTime;

    this.playFilteredNoise(450, 0.8, 0.2, 0.22, 'lowpass');

    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = animType === 'hurricane' ? 'sine' : 'triangle';
    osc1.frequency.setValueAtTime(animType === 'helicopter' ? 180 : 220, now);
    osc1.frequency.exponentialRampToValueAtTime(42, now + 0.28);
    gain1.gain.setValueAtTime(0.28, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
    osc1.connect(gain1);
    gain1.connect(out);
    osc1.start(now);
    osc1.stop(now + 0.32);

    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    if (animType === 'popup') {
      // Toaster DING overtone!
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(1320, now);
      osc2.frequency.exponentialRampToValueAtTime(880, now + 0.22);
    } else if (animType === 'hurricane') {
      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(640, now);
      osc2.frequency.exponentialRampToValueAtTime(220, now + 0.2);
    } else {
      osc2.type = 'square';
      osc2.frequency.setValueAtTime(480, now);
      osc2.frequency.exponentialRampToValueAtTime(110, now + 0.18);
    }
    gain2.gain.setValueAtTime(0.14, now);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.23);
    osc2.connect(gain2);
    gain2.connect(out);
    osc2.start(now);
    osc2.stop(now + 0.24);
  }

  public playBlockStart(): void {
    const ctx = this.ensureContext();
    const out = this.sfxGain;
    if (!ctx || !out) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(380, now);
    osc.frequency.exponentialRampToValueAtTime(640, now + 0.07);

    gain.gain.setValueAtTime(0.1, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);

    osc.connect(gain);
    gain.connect(out);
    osc.start(now);
    osc.stop(now + 0.1);
  }

  public playBlockHit(): void {
    const ctx = this.ensureContext();
    const out = this.sfxGain;
    if (!ctx || !out) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(760, now);
    osc.frequency.exponentialRampToValueAtTime(320, now + 0.09);

    gain.gain.setValueAtTime(0.13, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

    osc.connect(gain);
    gain.connect(out);
    osc.start(now);
    osc.stop(now + 0.11);
  }

  public playDodge(): void {
    const ctx = this.ensureContext();
    const out = this.sfxGain;
    if (!ctx || !out) return;
    const now = ctx.currentTime;
    this.playFilteredNoise(2100, 1.8, 0.11, 0.12);
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(520, now);
    osc.frequency.exponentialRampToValueAtTime(190, now + 0.14);

    gain.gain.setValueAtTime(0.13, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

    osc.connect(gain);
    gain.connect(out);
    osc.start(now);
    osc.stop(now + 0.16);
  }

  /** Signature comical BONK / BOINK impact with cartoon slap transient */
  public playBonkHit(heavy: boolean): void {
    const ctx = this.ensureContext();
    const out = this.sfxGain;
    if (!ctx || !out) return;
    const now = ctx.currentTime;

    this.playFilteredNoise(heavy ? 1100 : 1900, 1.1, 0.06, heavy ? 0.18 : 0.12);

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(heavy ? 185 : 290, now);
    osc.frequency.exponentialRampToValueAtTime(heavy ? 540 : 660, now + 0.05);
    osc.frequency.exponentialRampToValueAtTime(85, now + 0.15);

    gain.gain.setValueAtTime(heavy ? 0.25 : 0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);

    osc.connect(gain);
    gain.connect(out);
    osc.start(now);
    osc.stop(now + 0.17);
  }

  /** Expressive funny character voice/emote chirps by animation archetype */
  public playCharacterReaction(
    kind: CharacterReactionKind,
    style: AnimationStyle = 'brawler',
  ): void {
    const ctx = this.ensureContext();
    const out = this.sfxGain;
    if (!ctx || !out) return;
    const now = ctx.currentTime;

    if (kind !== 'victory' && kind !== 'defeat' && now - this.lastReactionTime < 0.22) {
      return;
    }
    this.lastReactionTime = now;

    const pitchScale =
      style === 'bouncy'
        ? 1.32
        : style === 'martial'
          ? 1.12
          : style === 'heavy'
            ? 0.72
            : 1.0;

    if (kind === 'hurt') {
      // Funny "OOF / YIPE!" warble
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = style === 'bouncy' ? 'square' : 'sawtooth';
      osc.frequency.setValueAtTime(420 * pitchScale, now);
      osc.frequency.exponentialRampToValueAtTime(610 * pitchScale, now + 0.045);
      osc.frequency.exponentialRampToValueAtTime(190 * pitchScale, now + 0.16);

      gain.gain.setValueAtTime(0.11, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.17);
      osc.connect(gain);
      gain.connect(out);
      osc.start(now);
      osc.stop(now + 0.18);
      return;
    }

    if (kind === 'dodge') {
      // Cheeky "WHEE!" slide
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(480 * pitchScale, now);
      osc.frequency.exponentialRampToValueAtTime(920 * pitchScale, now + 0.12);
      gain.gain.setValueAtTime(0.09, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.13);
      osc.connect(gain);
      gain.connect(out);
      osc.start(now);
      osc.stop(now + 0.14);
      return;
    }

    if (kind === 'special') {
      // Energetic 2-note battle hype chirp
      [520, 780].forEach((f, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const t0 = now + idx * 0.075;
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(f * pitchScale, t0);
        osc.frequency.exponentialRampToValueAtTime(f * 1.18 * pitchScale, t0 + 0.09);
        gain.gain.setValueAtTime(0.12, t0);
        gain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.1);
        osc.connect(gain);
        gain.connect(out);
        osc.start(t0);
        osc.stop(t0 + 0.11);
      });
      return;
    }

    if (kind === 'victory') {
      // Cheerful 4-note cartoon celebration trill
      [523, 659, 784, 1046].forEach((f, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const t0 = now + idx * 0.09;
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(f * pitchScale, t0);
        osc.frequency.exponentialRampToValueAtTime(f * 1.06 * pitchScale, t0 + 0.14);
        gain.gain.setValueAtTime(0.14, t0);
        gain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.16);
        osc.connect(gain);
        gain.connect(out);
        osc.start(t0);
        osc.stop(t0 + 0.17);
      });
      return;
    }

    // Defeat: classic cartoon "wah-wah-waaaah" slide!
    [392, 370, 349, 311].forEach((f, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const t0 = now + idx * 0.22;
      const dur = idx === 3 ? 0.45 : 0.19;
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(f * pitchScale, t0);
      if (idx === 3) {
        osc.frequency.exponentialRampToValueAtTime(f * 0.82 * pitchScale, t0 + dur);
      }
      gain.gain.setValueAtTime(0.11, t0);
      gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
      osc.connect(gain);
      gain.connect(out);
      osc.start(t0);
      osc.stop(t0 + dur + 0.02);
    });
  }

  public playPauseToggle(paused: boolean): void {
    const ctx = this.ensureContext();
    const out = this.sfxGain;
    if (!ctx || !out) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    if (paused) {
      osc.frequency.setValueAtTime(480, now);
      osc.frequency.setValueAtTime(320, now + 0.06);
    } else {
      osc.frequency.setValueAtTime(320, now);
      osc.frequency.setValueAtTime(520, now + 0.06);
    }

    gain.gain.setValueAtTime(0.075, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);

    osc.connect(gain);
    gain.connect(out);
    osc.start(now);
    osc.stop(now + 0.15);
  }

  public playSpringBoing(): void {
    const ctx = this.ensureContext();
    const out = this.sfxGain;
    if (!ctx || !out) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(190, now);
    osc.frequency.exponentialRampToValueAtTime(620, now + 0.14);
    osc.frequency.exponentialRampToValueAtTime(340, now + 0.24);

    gain.gain.setValueAtTime(0.17, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
    osc.connect(gain);
    gain.connect(out);
    osc.start(now);
    osc.stop(now + 0.26);
  }

  public playSteamWhoosh(): void {
    const ctx = this.ensureContext();
    const out = this.sfxGain;
    if (!ctx || !out) return;
    const now = ctx.currentTime;
    this.playFilteredNoise(2200, 0.9, 0.22, 0.18);
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(320, now);
    osc.frequency.exponentialRampToValueAtTime(840, now + 0.18);

    gain.gain.setValueAtTime(0.13, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.24);
    osc.connect(gain);
    gain.connect(out);
    osc.start(now);
    osc.stop(now + 0.25);
  }

  public playZap(): void {
    const ctx = this.ensureContext();
    const out = this.sfxGain;
    if (!ctx || !out) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(920, now);
    osc.frequency.exponentialRampToValueAtTime(210, now + 0.14);

    gain.gain.setValueAtTime(0.14, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
    osc.connect(gain);
    gain.connect(out);
    osc.start(now);
    osc.stop(now + 0.17);
  }

  public playSlipWhoop(): void {
    const ctx = this.ensureContext();
    const out = this.sfxGain;
    if (!ctx || !out) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(360, now);
    osc.frequency.exponentialRampToValueAtTime(880, now + 0.08);
    osc.frequency.exponentialRampToValueAtTime(220, now + 0.2);

    gain.gain.setValueAtTime(0.16, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
    osc.connect(gain);
    gain.connect(out);
    osc.start(now);
    osc.stop(now + 0.23);
  }

  public playPropSmash(): void {
    const ctx = this.ensureContext();
    const out = this.sfxGain;
    if (!ctx || !out) return;
    const now = ctx.currentTime;
    this.playFilteredNoise(1300, 0.9, 0.14, 0.2);
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(260, now);
    osc.frequency.exponentialRampToValueAtTime(75, now + 0.15);

    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
    osc.connect(gain);
    gain.connect(out);
    osc.start(now);
    osc.stop(now + 0.17);
  }
}

export const soundEngine = new SoundEngine();
