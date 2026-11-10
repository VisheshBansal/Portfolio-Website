/**
 * A Ferrari V12 rev, synthesized so no recording ships with the site. A crank answers the throttle; two banks of six
 * fire in the 65-degree V12's 65/55 rhythm into their own pipes, silencers and bypass valves; the pulses steepen into
 * rasp under load; flow noise, valvetrain and afterfire ride on top; then the ground, the walls and a close phone mic.
 * It renders in a worker as the ticket nears view, so a press only plays it.
 */

/** Pedal over time (s, 0-1): idle, a short blip, the main stab into the limiter, lift off. */
const PEDAL = [
  [0, 0],
  [0.2, 1],
  [0.32, 0],
  [0.62, 1],
  [1.14, 0],
] as const;
const LENGTH = 3.2;
const FADE = { in: 0.005, out: 0.35 } as const;
/** Idle, limiter and fuel-resume speeds (rpm); crank inertia (kg m2); limiter cut (s). */
const ENGINE = { idle: 1000, limit: 9250, resume: 1400, inertia: 0.3, cut: 0.025 } as const;
/** Full-throttle torque curve (rpm, Nm). */
const TORQUE = [
  [0, 300],
  [1000, 450],
  [2500, 540],
  [5000, 650],
  [6750, 700],
  [9000, 625],
  [10000, 520],
] as const;
/** Firing angles in the 720-degree cycle: bank A every 120, bank B 65 later. Even index is bank A. */
const FIRING = [0, 65, 120, 185, 240, 305, 360, 425, 480, 545, 600, 665] as const;
/** One exhaust per bank: pipe loop (ms), loop gain, and bank B arriving later and quieter at the mic. */
const PIPES = [
  { ms: 7.3, feedback: 0.66 },
  { ms: 7.9, feedback: 0.6 },
] as const;
const BANK_B = { delayMs: 0.4, gain: 0.8 } as const;
/** Fixed exhaust resonances (Hz, Q, gain): the boom, the body, the bark. */
const FORMANTS = [
  [150, 1, 1.3],
  [480, 1.5, 0.45],
  [1300, 2, 0.3],
] as const;
/** Ground bounce per channel (ms), wall reflections (ms, gain), and a short outdoor tail. */
const GROUND = { ms: [1.5, 1.7], gain: 0.7 } as const;
const WALLS = [
  [9, 0.25],
  [17, 0.18],
  [31, 0.14],
  [47, 0.1],
] as const;
const TAIL = { combs: [29.7, 37.1, 43.7], allpasses: [5, 1.7], seconds: 0.8, wet: 0.045 } as const;
/** The phone: how hard the rev drives its input, and its limiter. */
const MIC = { level: 1.6, bias: 0.25, threshold: 0.5, attack: 0.002, release: 0.6 } as const;
const SLOTS = 4;
const POPS = 8;

/** A small seeded generator (mulberry32), so the rev sounds the same every time. */
function seeded(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let mixed = Math.imul(state ^ (state >>> 15), 1 | state);
    mixed = (mixed + Math.imul(mixed ^ (mixed >>> 7), 61 | mixed)) ^ mixed;
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
  };
}

const clamp = (value: number, low: number, high: number) => Math.min(high, Math.max(low, value));

function torqueAt(rpm: number): number {
  for (let i = 1; i < TORQUE.length; i++) {
    const [r1, t1] = TORQUE[i] ?? [0, 0];
    const [r0, t0] = TORQUE[i - 1] ?? [0, 0];
    if (rpm <= r1) return t0 + ((t1 - t0) * (rpm - r0)) / (r1 - r0);
  }
  return TORQUE[TORQUE.length - 1]?.[1] ?? 0;
}

function pedalAt(t: number): number {
  let value = 0;
  for (const [at, throttle] of PEDAL) if (t >= at) value = throttle;
  return value;
}

/** A delay line on a power-of-two ring. */
function delayLine(samples: number) {
  const size = 2 ** Math.ceil(Math.log2(samples + 2));
  return { data: new Float32Array(size), mask: size - 1, at: 0, delay: Math.round(samples), store: 0 };
}
type Line = ReturnType<typeof delayLine>;

/** One sample of a Schroeder tail: parallel damped combs, then two allpasses. */
function diffuse(tail: { combs: (Line & { feedback: number })[]; allpasses: Line[] }, send: number): number {
  let sum = 0;
  for (const comb of tail.combs) {
    const out = comb.data[(comb.at - comb.delay) & comb.mask] ?? 0;
    comb.store = out * 0.6 + comb.store * 0.4;
    comb.data[comb.at] = send + comb.store * comb.feedback;
    comb.at = (comb.at + 1) & comb.mask;
    sum += out;
  }
  for (const pass of tail.allpasses) {
    const held = pass.data[(pass.at - pass.delay) & pass.mask] ?? 0;
    pass.data[pass.at] = sum + held * 0.5;
    pass.at = (pass.at + 1) & pass.mask;
    sum = held - sum;
  }
  return sum;
}

/** The rev as [left, right] at the given rate, peaking at 0.9. */
export function renderRev(sampleRate: number): Float32Array<ArrayBuffer>[] {
  const random = seeded(65);
  const uniform = () => random() * 2 - 1;
  const gauss = () => (random() + random() + random() - 1.5) * 2;
  const length = Math.round(LENGTH * sampleRate);
  const left = new Float32Array(length);
  const right = new Float32Array(length);
  const block = Math.round(sampleRate / 1000);
  const dt = block / sampleRate;
  const ms = (value: number) => (value * sampleRate) / 1000;
  const onePole = (hz: number) => 1 - Math.exp((-2 * Math.PI * hz) / sampleRate);
  const rpmPerNm = 60 / (2 * Math.PI * ENGINE.inertia);

  // The car's own fingerprint: every cylinder a little different, the same on every press.
  const cylinderGain = FIRING.map(() => 1 + 0.12 * uniform());
  const cylinderLag = FIRING.map(() => 0.5 * uniform());

  const pipes = PIPES.map(({ ms: period, feedback }) => ({ ...delayLine(ms(period)), feedback, apX: 0, apY: 0 }));
  const late = delayLine(ms(BANK_B.delayMs));
  const formants = FORMANTS.map(([hz, q, gain]) => {
    const w = (2 * Math.PI * hz) / sampleRate;
    const alpha = Math.sin(w) / (2 * q);
    const a0 = 1 + alpha;
    return { b0: alpha / a0, a1: (-2 * Math.cos(w)) / a0, a2: (1 - alpha) / a0, gain, x1: 0, x2: 0, y1: 0, y2: 0 };
  });
  const history = [delayLine(ms(50)), delayLine(ms(50))];
  const tails = [0, 1].map((side) => ({
    combs: TAIL.combs.map((period) => ({
      ...delayLine(ms(period * (side ? 1.023 : 1))),
      feedback: 10 ** ((-3 * period) / 1000 / TAIL.seconds),
    })),
    allpasses: TAIL.allpasses.map((period) => delayLine(ms(period * (side ? 1.031 : 1)))),
  }));
  const groundAt = GROUND.ms.map((value) => Math.round(ms(value)));
  const walls = WALLS.map(([at, gain]) => ({ near: Math.round(ms(at)), far: Math.round(ms(at * 1.07)), gain }));

  const pulseStart = new Float64Array(2 * SLOTS).fill(-1e9);
  const pulseAmp = new Float64Array(2 * SLOTS);
  const pulseRise = new Float64Array(2 * SLOTS).fill(1);
  const pulseDecay = new Float64Array(2 * SLOTS).fill(1);
  const pulseSlot = new Uint8Array(2);
  const env = new Float64Array(2);
  const previous = new Float64Array(2);
  const silencer = new Float64Array(4);
  const popStart = new Float64Array(POPS).fill(-1e9);
  const popAmp = new Float64Array(POPS);
  const popBank = new Uint8Array(POPS);
  const popDecay = new Float64Array(POPS);
  const popHz = new Float64Array(POPS);
  const popIn = new Float64Array(2);
  let popSlot = 0;
  let popsLive = -1;
  let popsLeft = 6;
  const pop = (at: number, strength: number) => {
    popsLive = Math.max(popsLive, at + 0.06 * sampleRate);
    popStart[popSlot] = at;
    popAmp[popSlot] = strength;
    popBank[popSlot] = random() < 0.5 ? 0 : 1;
    popDecay[popSlot] = 0.005 + 0.012 * random();
    popHz[popSlot] = 70 + 40 * random();
    popSlot = (popSlot + 1) % POPS;
  };

  const loadK = 1 - Math.exp(-dt / 0.03);
  const valveK = 1 - Math.exp(-dt / 0.2);
  const pulseEnv = Math.exp(-1 / (sampleRate * 0.0015));
  const tickDecay = Math.exp(-1 / (sampleRate * 0.0003));
  const attack = 1 - Math.exp(-1 / (sampleRate * MIC.attack));
  const release = Math.exp(-1 / (sampleRate * MIC.release));
  const [pipeK, silencerK, noiseHiK, noiseLoK, hashHiK, hashLoK, sideK, groundK, ambienceK, highpassK] = [
    onePole(1500),
    onePole(2000),
    onePole(800),
    onePole(7000),
    onePole(4000),
    onePole(9000),
    onePole(1000),
    onePole(5000),
    onePole(900),
    onePole(45),
  ];
  const micBias = Math.tanh(MIC.bias);

  let rpm: number = ENGINE.idle;
  let [pedal, load, integral, wobble, wobbleTarget, cut, valve, sinceLift, lastPedal] = [0, 0.22, 0, 1, 1, 0, 0, 9, 0];
  let [angle, nextAngle, fireIndex, speed, burning, gate] = [0, 0, 0, 0, true, 0];
  let [noiseLo1, noiseLo2, hashLo1, hashLo2, tick, ambience, sideLow] = [0, 0, 0, 0, 0, 0, 0];
  let [groundL, groundR, highL, highR, level, dcL, dcR, lastL, lastR] = [0, 0, 0, 0, 0, 0, 0, 0, 0];

  for (let n = 0; n < length; n++) {
    if (n % block === 0) {
      // Once a millisecond: pedal and throttle, idle control, fuel cut, limiter, the crank and the valves.
      const t = n / sampleRate;
      const target = pedalAt(t);
      if (target === 0 && lastPedal > 0.5) sinceLift = 0;
      lastPedal = target;
      pedal += clamp(target - pedal, -dt / 0.06, dt / 0.08);
      const error = ENGINE.idle - rpm;
      integral = clamp(integral + error * 2e-6, -0.08, 0.08);
      const idleAir = clamp(0.216 + 0.0005 * error + integral, 0, 0.45);
      const throttle = Math.max(pedal, idleAir);
      burning = !(pedal < 0.01 && rpm > ENGINE.resume) && cut <= 0;
      load += ((burning ? throttle : 0) - load) * loadK;
      if (n % (block * 80) === 0) wobbleTarget = 1 + 0.025 * uniform();
      wobble += (wobbleTarget - wobble) * 0.04;
      if (rpm >= ENGINE.limit && cut <= 0) cut = ENGINE.cut;
      const drag = 60 + 1.7e-6 * rpm * rpm + 45 * (1 - throttle);
      rpm = Math.max(400, rpm + (torqueAt(rpm) * load * wobble - drag) * rpmPerNm * dt);
      cut -= dt;
      sinceLift += dt;
      speed = rpm / 9000;
      const open = rpm > 4000 && throttle > 0.3 ? 1 : sinceLift > 0.5 || rpm < 3000 ? 0 : valve > 0.5 ? 1 : 0;
      valve += (open - valve) * valveK;
      gate = (load * speed) ** 2;
    }

    // Firing: 12 per 720 degrees, banks alternating 65 then 55 degrees apart.
    angle += (6 * rpm) / sampleRate;
    while (angle >= nextAngle) {
      const index = fireIndex;
      const bank = index % 2;
      const late = (angle - nextAngle) / ((6 * rpm) / sampleRate);
      fireIndex = (fireIndex + 1) % FIRING.length;
      nextAngle += ((FIRING[fireIndex] ?? 0) - (FIRING[index] ?? 0) + 720) % 720;
      const lagDeg = (cylinderLag[index] ?? 0) + gauss() * (burning ? 0.3 + 0.7 * (1 - load) : 1);
      const at = n - late + Math.max(0, lagDeg / (6 * rpm) + 0.00002 * gauss()) * sampleRate;
      const scatter = burning ? 0.04 + 0.06 * (1 - load) : 0.15;
      const strength = (burning ? Math.max(0.06, load) ** 1.15 : 0.08) * (cylinderGain[index] ?? 1) * (1 + scatter * gauss());
      const slot = bank * SLOTS + (pulseSlot[bank] ?? 0);
      pulseSlot[bank] = ((pulseSlot[bank] ?? 0) + 1) % SLOTS;
      pulseStart[slot] = at;
      pulseAmp[slot] = strength;
      // Rise fixed in time and sharp under load; decay about 40 crank degrees.
      pulseRise[slot] = Math.max(0.00006, 0.0006 * (1 - 0.85 * load * Math.min(1, speed)));
      pulseDecay[slot] = Math.max(0.0006, 40 / (6 * rpm));
      tick = 0.012;
      // Afterfire: a few bangs between 0.15 and 0.8 s after lift, while the valves are open.
      if (!burning && popsLeft > 0 && sinceLift > 0.15 && sinceLift < 0.8 && rpm > 4000 && valve > 0.5) {
        if (random() < 0.09 * Math.exp(-(sinceLift - 0.15) / 0.4)) {
          popsLeft--;
          pop(at + random() * ms(3), 0.18 * Math.exp(0.7 * gauss()));
        }
      }
    }

    popIn[0] = 0;
    popIn[1] = 0;
    let crack = 0;
    for (let k = 0; n <= popsLive && k < POPS; k++) {
      const age = (n - (popStart[k] ?? -1e9)) / sampleRate;
      if (age < 0 || age > 0.06) continue;
      const strength = popAmp[k] ?? 0;
      const burst = strength * uniform() * Math.exp(-age / (popDecay[k] ?? 0.01)) * Math.min(1, age / 0.0002);
      const thump = strength * 0.45 * Math.sin(2 * Math.PI * (popHz[k] ?? 90) * age) * Math.exp(-age / 0.015);
      const bank = popBank[k] ?? 0;
      popIn[bank] = (popIn[bank] ?? 0) + burst + thump;
      crack += burst;
    }

    // Each bank: its pulses, steepened by load, the flow noise they drag along, its pipe, silencer and valve.
    const noiseRaw = uniform();
    noiseLo1 += noiseLoK * (noiseRaw - noiseLo1);
    noiseLo2 += noiseHiK * (noiseLo1 - noiseLo2);
    const flowNoise = noiseLo1 - noiseLo2;
    let bankA = 0;
    let bankB = 0;
    for (let bank = 0; bank < 2; bank++) {
      const pipe = pipes[bank];
      if (!pipe) continue;
      let source = 0;
      for (let s = 0; s < SLOTS; s++) {
        const k = bank * SLOTS + s;
        const age = (n - (pulseStart[k] ?? -1e9)) / sampleRate;
        const decay = pulseDecay[k] ?? 1;
        if (age < 0 || age > 6 * decay) continue;
        const rise = pulseRise[k] ?? 1;
        const fast = Math.exp(-age / rise);
        source += (pulseAmp[k] ?? 0) * Math.exp(-age / decay) * (fast - (rise / decay) * (1 - fast));
      }
      const last = previous[bank] ?? 0;
      previous[bank] = source;
      const steep = source * (1 + clamp(30 * gate * (source - last), -0.85, 0.85));
      const envelope = Math.max(Math.abs(source), (env[bank] ?? 0) * pulseEnv);
      env[bank] = envelope;
      const turbulence = (bank ? -flowNoise : flowNoise) * (0.4 + 0.6 * Math.min(1, 4 * envelope)) * (0.004 + 0.35 * gate);
      const back = pipe.data[(pipe.at - pipe.delay) & pipe.mask] ?? 0;
      pipe.store += pipeK * (back - pipe.store);
      const ap = -0.3 * pipe.store + pipe.apX + 0.3 * pipe.apY;
      pipe.apX = pipe.store;
      pipe.apY = ap;
      const out = steep + turbulence + (popIn[bank] ?? 0) + pipe.feedback * ap;
      pipe.data[pipe.at] = out;
      pipe.at = (pipe.at + 1) & pipe.mask;
      const s1 = bank * 2;
      silencer[s1] = (silencer[s1] ?? 0) + silencerK * (out - (silencer[s1] ?? 0));
      silencer[s1 + 1] = (silencer[s1 + 1] ?? 0) + silencerK * ((silencer[s1] ?? 0) - (silencer[s1 + 1] ?? 0));
      const bankOut = valve * out + (1 - valve) * 0.5 * (silencer[s1 + 1] ?? 0);
      if (bank) bankB = bankOut;
      else bankA = bankOut;
    }
    late.data[late.at] = bankB;
    const delayedB = BANK_B.gain * (late.data[(late.at - late.delay) & late.mask] ?? 0);
    late.at = (late.at + 1) & late.mask;
    const mid = bankA + delayedB;
    sideLow += sideK * (bankA - delayedB - sideLow);

    // Fixed resonances on top of the straight-through sound, then valvetrain hash and injector ticks.
    let shaped = 0.7 * mid;
    for (const f of formants) {
      const y = f.b0 * (mid - f.x2) - f.a1 * f.y1 - f.a2 * f.y2;
      f.x2 = f.x1;
      f.x1 = mid;
      f.y2 = f.y1;
      f.y1 = y;
      shaped += f.gain * y;
    }
    const hashRaw = uniform();
    hashLo1 += hashLoK * (hashRaw - hashLo1);
    hashLo2 += hashHiK * (hashLo1 - hashLo2);
    tick *= tickDecay;
    shaped += (hashLo1 - hashLo2) * (0.003 + 0.02 * speed * speed + tick * 3) + 0.25 * crack;

    // The place: a ground bounce per ear, wall slapback, a short tail.
    const [hl, hr] = history;
    const [tailL, tailR] = tails;
    if (!hl || !hr || !tailL || !tailR) continue;
    let l = shaped + 0.25 * sideLow;
    let r = shaped - 0.25 * sideLow;
    groundL += groundK * ((hl.data[(hl.at - (groundAt[0] ?? 48)) & hl.mask] ?? 0) - groundL);
    groundR += groundK * ((hr.data[(hr.at - (groundAt[1] ?? 54)) & hr.mask] ?? 0) - groundR);
    hl.data[hl.at] = l;
    hr.data[hr.at] = r;
    l += GROUND.gain * groundL;
    r += GROUND.gain * groundR;
    for (const wall of walls) {
      l += wall.gain * (hr.data[(hr.at - wall.near) & hr.mask] ?? 0);
      r += wall.gain * (hl.data[(hl.at - wall.far) & hl.mask] ?? 0);
    }
    hl.at = (hl.at + 1) & hl.mask;
    hr.at = (hr.at + 1) & hr.mask;
    const send = shaped * 0.5;
    l += TAIL.wet * diffuse(tailL, send);
    r += TAIL.wet * diffuse(tailR, send);

    // The phone: low cut, an input that overloads on the peaks (positive side first), and its limiter.
    highL += highpassK * (l - highL);
    highR += highpassK * (r - highR);
    l = Math.tanh(MIC.level * (l - highL) + MIC.bias) - micBias;
    r = Math.tanh(MIC.level * (r - highR) + MIC.bias) - micBias;
    const peak = Math.max(Math.abs(l), Math.abs(r));
    level = peak > level ? level + attack * (peak - level) : level * release;
    const gain = level > MIC.threshold ? MIC.threshold / level : 1;
    ambience += ambienceK * (uniform() - ambience);
    const t = n / sampleRate;
    const tail = LENGTH - t;
    const fade = Math.min(1, t / FADE.in) * (tail < FADE.out ? 0.5 - 0.5 * Math.cos((Math.PI * tail) / FADE.out) : 1);
    const outL = l * gain + 0.01 * ambience;
    const outR = r * gain + 0.01 * ambience;
    dcL = outL - lastL + 0.998 * dcL;
    dcR = outR - lastR + 0.998 * dcR;
    lastL = outL;
    lastR = outR;
    left[n] = dcL * fade;
    right[n] = dcR * fade;
  }

  let peak = 0;
  for (let n = 0; n < length; n++) peak = Math.max(peak, Math.abs(left[n] ?? 0), Math.abs(right[n] ?? 0));
  const scale = peak > 0 ? 0.9 / peak : 1;
  return [left.map((sample) => sample * scale), right.map((sample) => sample * scale)];
}

const RATE = 24000;
/** The render peaks at 0.9, so the rev plays back peaking near -8 dBFS. */
const VOLUME = 0.45;

let rendering: Promise<Float32Array<ArrayBuffer>[]> | undefined;
let context: AudioContext | undefined;
let buffer: AudioBuffer | undefined;
let voice: GainNode | undefined;

/** Starts rendering the rev in a worker, once; without workers it renders here. */
export function primeRev(): Promise<Float32Array<ArrayBuffer>[]> {
  rendering ??= new Promise((resolve) => {
    const here = () => resolve(renderRev(RATE));
    try {
      const worker = new Worker(new URL('./engine.worker.ts', import.meta.url), { type: 'module' });
      worker.onmessage = (event: MessageEvent<Float32Array<ArrayBuffer>[]>) => {
        resolve(event.data);
        worker.terminate();
      };
      worker.onerror = () => {
        worker.terminate();
        here();
      };
      worker.postMessage(RATE);
    } catch {
      here();
    }
  });
  return rendering;
}

/** Plays the rev from a press, fading out any rev still playing. Without Web Audio it stays silent. */
export function playRev(): void {
  if (typeof AudioContext === 'undefined') return;
  // Browsers only allow sound from a context made or resumed inside the press.
  const audio = (context ??= new AudioContext());
  audio.resume().catch(() => undefined);
  void primeRev().then((channels) => {
    if (!buffer) {
      const made = audio.createBuffer(channels.length, channels[0]?.length ?? 1, RATE);
      channels.forEach((channel, index) => made.copyToChannel(channel, index));
      buffer = made;
    }
    voice?.gain.setTargetAtTime(0, audio.currentTime, 0.02);
    const gain = audio.createGain();
    gain.gain.value = VOLUME;
    const source = audio.createBufferSource();
    source.buffer = buffer;
    source.connect(gain).connect(audio.destination);
    source.start();
    voice = gain;
  });
}
