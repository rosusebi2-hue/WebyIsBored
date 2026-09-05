export class AudioEngine {
  constructor(settings) { this.settings = settings; this.context = null; this.last = {}; }
  unlock() {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!this.context && AudioContext) this.context = new AudioContext();
      if (this.context?.state === 'suspended') this.context.resume().catch(() => {});
    } catch { this.context = null; }
  }
  tone(frequency, duration = .1, type = 'sine', volume = .035, end = frequency) {
    if (!this.settings.sound || !this.context || this.context.state !== 'running') return;
    const c = this.context, o = c.createOscillator(), gain = c.createGain(), now = c.currentTime;
    o.type = type; o.frequency.setValueAtTime(frequency, now); o.frequency.exponentialRampToValueAtTime(Math.max(25, end), now + duration);
    gain.gain.setValueAtTime(.0001, now); gain.gain.exponentialRampToValueAtTime(volume, now + .007); gain.gain.exponentialRampToValueAtTime(.0001, now + duration);
    o.connect(gain); gain.connect(c.destination); o.start(now); o.stop(now + duration + .02);
    o.onended = () => { o.disconnect(); gain.disconnect(); };
  }
  event(e) {
    const now = this.context?.currentTime || 0;
    if (now - (this.last[e.type] ?? -9) < .035) return;
    this.last[e.type] = now;
    const sounds = {
      swing: [210 + (e.combo || 1) * 80, .12, 'triangle', .035, 70],
      hit: [100, .08, 'triangle', .065, 40], kill: [220, .16, 'triangle', .035, 90],
      dash: [460, .15, 'sine', .025, 95], block: [155, .12, 'square', .025, 90],
      parry: [740, .28, 'sine', .06, 1108], hurt: [90, .2, 'sawtooth', .04, 40],
      shoot: [330, .08, 'triangle', .018, 165], slam: [75, .3, 'triangle', .075, 27],
      clear: [523, .3, 'sine', .05, 784], lessonComplete: [587, .22, 'sine', .04, 880],
      upgrade: [440, .25, 'sine', .04, 880], death: [150, .6, 'triangle', .05, 40],
      victory: [523, .7, 'sine', .055, 1046], bossPhase: [120, .5, 'sawtooth', .025, 55],
    };
    if (sounds[e.type]) this.tone(...sounds[e.type]);
  }
}
