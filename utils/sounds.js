/**
 * Sound manager for Soroban
 */

class SoundManager {
  constructor() {
    this.sounds = {};
    this.enabled = true;
    this.volume = 0.3;
    
    this.loadSounds();
  }

  loadSounds() {
    const soundFiles = {
      beadClick: './assets/sounds/bead-click.mp3',
      beadSnap: './assets/sounds/bead-snap.mp3',
      reset: './assets/sounds/reset.mp3',
      valueChange: './assets/sounds/value-change.mp3'
    };

    for (const [name, path] of Object.entries(soundFiles)) {
      const audio = new Audio(path);
      audio.volume = this.volume;
      this.sounds[name] = audio;
    }
  }

  play(soundName) {
    if (!this.enabled) return;
    
    const sound = this.sounds[soundName];
    if (sound) {
      sound.currentTime = 0;
      sound.play().catch(e => console.warn('Sound play failed:', e));
    }
  }

  setVolume(volume) {
    this.volume = Math.max(0, Math.min(1, volume));
    for (const sound of Object.values(this.sounds)) {
      sound.volume = this.volume;
    }
  }

  toggle() {
    this.enabled = !this.enabled;
  }
}

export const soundManager = new SoundManager();
