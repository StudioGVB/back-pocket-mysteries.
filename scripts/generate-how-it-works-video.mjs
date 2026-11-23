import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const puppeteer = require('/Users/gabriellablyth/.npm/_npx/0f94ee7615faf582/node_modules/puppeteer-core');

if (fs.existsSync('.env.local')) {
  for (const line of fs.readFileSync('.env.local', 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) {
      process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '').trim();
    }
  }
}

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY?.trim();
// Upbeat Young British Female Social Media Voice ("Lucy - Charming, Upbeat and Kind")
const VOICE_ID = 'Gv42yFG3G6CHLsU5y8g6';
const VO_DIR = 'public/videos/vo-uk';

export const SCENES = [
  {
    id: 0,
    stepNum: 'INTRO',
    kicker: 'HUMAN-CRAFTED · AI-TAILORED IN ~20 MINS',
    titleLine1: 'FROM YOUR GROUP CHAT',
    titleLine2: 'TO CRIME SCENE.',
    subtitle: 'How Back Pocket Mysteries works — start to party night in 6 fast steps.',
    voText: 'Turn your group chat into a full-blown crime scene! Here is how it works in six fast steps.',
    captions: [
      ['TURN YOUR GROUP CHAT', 'INTO A FULL-BLOWN CRIME SCENE!'],
      ['HERE IS HOW IT WORKS', 'IN 6 FAST STEPS →'],
    ],
  },
  {
    id: 1,
    stepNum: '01',
    kicker: 'STEP 01 · BEFORE THE PARTY',
    titleLine1: 'CREATE YOUR',
    titleLine2: 'GUESTS.',
    subtitle: 'Add your mates’ names, photos, accents & funniest inside jokes.',
    voText: 'Step one! Add your mates, snap a quick photo, and drop in their funniest inside jokes!',
    captions: [
      ['STEP 1: ADD YOUR MATES', '& SNAP A QUICK PHOTO'],
      ['PLUS THEIR FUNNIEST', 'INSIDE JOKES!'],
    ],
  },
  {
    id: 2,
    stepNum: '02',
    kicker: 'STEP 02 · CHOOSE THE VIBE',
    titleLine1: 'PICK YOUR',
    titleLine2: 'MYSTERY THEME.',
    subtitle: '100% human-written plots with watertight clue logic & 4 spice levels.',
    voText: 'Step two! Pick a killer theme and choose your spice level, from work-friendly Clean to Spicy!',
    captions: [
      ['STEP 2: PICK A KILLER THEME', '& CHOOSE YOUR SPICE LEVEL'],
      ['FROM WORK-FRIENDLY CLEAN', 'ALL THE WAY TO SPICY!'],
    ],
  },
  {
    id: 3,
    stepNum: '03',
    kicker: 'STEP 03 · CAST THE PARTY',
    titleLine1: 'ASSIGN YOUR',
    titleLine2: 'CAST.',
    subtitle: 'Drag & drop or 1-Click AI Match. Every role auto-flexes to any gender.',
    voText: 'Step three! Cast your friends or let AI match them! Every role auto-flexes to any gender.',
    captions: [
      ['STEP 3: CAST YOUR FRIENDS', 'OR LET AI MATCH THEM!'],
      ['EVERY ROLE AUTO-FLEXES', 'TO ANY GUEST GENDER'],
    ],
  },
  {
    id: 4,
    stepNum: '04',
    kicker: 'STEP 04 · CUSTOM CLUE ENGINE',
    titleLine1: 'GENERATE CUSTOM',
    titleLine2: 'CLUES (~20 MINS).',
    subtitle: 'Custom crime-scene photos, leaked text threads & AI voice wiretaps.',
    voText: 'Step four! Hit generate! In twenty minutes you get custom crime-scene photos, leaked texts, and voice wiretaps!',
    captions: [
      ['STEP 4: HIT GENERATE!', 'READY IN ~20 MINUTES'],
      ['CUSTOM CRIME PHOTOS, LEAKED TEXTS', '& AI VOICE WIRETAPS!'],
    ],
  },
  {
    id: 5,
    stepNum: '05',
    kicker: 'STEP 05 · BUILD THE HYPE',
    titleLine1: 'INVITE YOUR',
    titleLine2: 'FRIENDS.',
    subtitle: 'Drop 1 link in the group chat so everyone gets their role & outfit guide.',
    voText: 'Step five! Drop one link in the group chat so everyone gets their character and outfit guide!',
    captions: [
      ['STEP 5: DROP 1 LINK', 'INTO THE GROUP CHAT'],
      ['EVERYONE GETS THEIR ROLE', '& WHAT-TO-WEAR GUIDE!'],
    ],
  },
  {
    id: 6,
    stepNum: '06',
    kicker: 'STEP 06 · PARTY NIGHT',
    titleLine1: 'LAUNCH LIVE',
    titleLine2: 'GAME MODE.',
    subtitle: 'Live clues & voting on phones — plus extra mates join free as Detectives!',
    voText: 'Step six! Launch Live Game Mode! Everyone gets clues and votes on their phones, plus extra mates join free as Detectives!',
    captions: [
      ['STEP 6: LAUNCH LIVE GAME MODE!', 'CLUES & VOTING ON PHONES'],
      ['MORE THAN 6 GUESTS?', 'EXTRA MATES JOIN AS DETECTIVES!'],
    ],
  },
  {
    id: 7,
    stepNum: 'OUTRO',
    kicker: 'READY IN ~20 MINUTES · FROM £15 / $19',
    titleLine1: 'PUT YOUR FRIENDS IN',
    titleLine2: 'THE CRIME SCENE.',
    subtitle: 'backpocketmysteries.com',
    voText: 'Put your friends in the crime scene today at Back Pocket Mysteries dot com!',
    captions: [
      ['PUT YOUR FRIENDS', 'IN THE CRIME SCENE!'],
      ['BACKPOCKETMYSTERIES.COM', 'START YOUR PARTY →'],
    ],
  },
];

async function ensureBritishVoiceovers() {
  fs.mkdirSync(path.resolve(VO_DIR), { recursive: true });
  for (const scene of SCENES) {
    const outMp3 = path.resolve(VO_DIR, `scene-${scene.id}.mp3`);
    if (fs.existsSync(outMp3) && fs.statSync(outMp3).size > 2000) {
      continue;
    }
    console.log(`🎙️ Synthesizing energetic British VO for Scene ${scene.id}...`);
    const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`, {
      method: 'POST',
      headers: {
        'xi-api-key': ELEVENLABS_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: scene.voText,
        model_id: 'eleven_multilingual_v2',
        voice_settings: {
          stability: 0.24,
          similarity_boost: 0.85,
          style: 0.82,
          use_speaker_boost: true,
          speed: 1.18,
        },
      }),
    });
    if (!res.ok) {
      throw new Error(`ElevenLabs failed for scene ${scene.id}: ${res.status} ${await res.text()}`);
    }
    const buf = Buffer.from(await res.arrayBuffer());
    fs.writeFileSync(outMp3, buf);
    console.log(`   ✅ Saved ${outMp3} (${(buf.length / 1024).toFixed(1)} KB)`);
  }
}

function fileToDataUri(relPath, mime) {
  const abs = path.resolve(relPath);
  const b64 = fs.readFileSync(abs).toString('base64');
  return `data:${mime};base64,${b64}`;
}

async function renderPromoVideo({ width, height, aspect, outFilename }) {
  console.log(`\n🎬 Rendering ${aspect} Promo Video (${width}x${height}) -> ${outFilename}...`);

  const assets = {
    sarah: fileToDataUri(
      'public/generated-avatars/44d70cd0-9f04-408b-8ac9-e064eb5c31d0-6224c730c6c6.jpg',
      'image/jpeg'
    ),
    jason: fileToDataUri(
      'public/generated-avatars/da18ef00-ecdc-41e7-8c71-97d78046e43b-486590f0918d.jpg',
      'image/jpeg'
    ),
    chloe: fileToDataUri(
      'public/generated-avatars/5f9b36e0-44ae-4c3d-9762-432c5bb17783-5518cb6b6215.jpg',
      'image/jpeg'
    ),
    gabby: fileToDataUri(
      'public/generated-avatars/4903bd39-e54f-42e4-b679-2af5d128bb8f-b130e47b4cee2149a7aad02dfc972e91.jpg',
      'image/jpeg'
    ),
    cover: fileToDataUri('public/moodboard/lotr/main-promo-murder.jpg', 'image/jpeg'),
    cctv: fileToDataUri('public/moodboard/lotr/caught-on-camera.jpg', 'image/jpeg'),
    cocktail: fileToDataUri('public/moodboard/lotr/cocktail-hour.jpg', 'image/jpeg'),
  };

  const voBase64List = SCENES.map((s) =>
    fs.readFileSync(path.resolve(VO_DIR, `scene-${s.id}.mp3`)).toString('base64')
  );

  const browser = await puppeteer.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: 'new',
    protocolTimeout: 240000,
    args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width, height });

  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<link href="https://fonts.googleapis.com/css2?family=Inter:ital,wght@0,600;0,700;0,800;0,900;1,800;1,900&display=swap" rel="stylesheet">
<style>
  body { margin: 0; background: #120914; overflow: hidden; font-family: 'Inter', -apple-system, sans-serif; }
  canvas { display: block; width: ${width}px; height: ${height}px; }
</style>
</head>
<body>
<canvas id="stage" width="${width}" height="${height}"></canvas>
<script>
window.SCENES = ${JSON.stringify(SCENES)};
window.ASSETS = ${JSON.stringify(assets)};
window.VO_B64 = ${JSON.stringify(voBase64List)};
window.CONFIG = { width: ${width}, height: ${height}, isVertical: ${aspect === '9:16'} };
</script>
</body>
</html>`;

  await page.setContent(html, { waitUntil: 'networkidle0' });

  const b64Video = await page.evaluate(async () => {
    await document.fonts.ready;

    // 1. Load images
    const imgs = {};
    for (const [k, src] of Object.entries(window.ASSETS)) {
      const img = new Image();
      img.src = src;
      await new Promise((r) => {
        img.onload = r;
        img.onerror = r;
      });
      imgs[k] = img;
    }

    // 2. Setup AudioContext & decode + trim silence from ElevenLabs British VO buffers
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 44100 });
    const audioDest = audioCtx.createMediaStreamDestination();

    // Master compressor so both VO and upbeat funk backing track sound loud, punchy & broadcast-ready
    const masterComp = audioCtx.createDynamicsCompressor();
    masterComp.threshold.value = -16;
    masterComp.knee.value = 12;
    masterComp.ratio.value = 4;
    masterComp.attack.value = 0.003;
    masterComp.release.value = 0.15;
    masterComp.connect(audioDest);

    function trimAudioBuffer(buffer) {
      const ch = buffer.getChannelData(0);
      const len = ch.length;
      const threshold = 0.012;
      let startSample = 0;
      let endSample = len - 1;
      while (startSample < len && Math.abs(ch[startSample]) < threshold) startSample++;
      while (endSample > startSample && Math.abs(ch[endSample]) < threshold) endSample--;
      startSample = Math.max(0, startSample - Math.floor(buffer.sampleRate * 0.02));
      endSample = Math.min(len - 1, endSample + Math.floor(buffer.sampleRate * 0.03));
      const trimmedLen = Math.max(1, endSample - startSample + 1);
      const out = audioCtx.createBuffer(buffer.numberOfChannels, trimmedLen, buffer.sampleRate);
      for (let c = 0; c < buffer.numberOfChannels; c++) {
        const srcData = buffer.getChannelData(c);
        const dstData = out.getChannelData(c);
        for (let i = 0; i < trimmedLen; i++) {
          dstData[i] = srcData[startSample + i];
        }
      }
      return out;
    }

    const voBuffers = [];
    for (const b64 of window.VO_B64) {
      const bin = atob(b64);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      const decoded = await audioCtx.decodeAudioData(bytes.buffer.slice(0));
      voBuffers.push(trimAudioBuffer(decoded));
    }

    // Playback rate 1.05x for extra snappy British commercial energy + tight 0.14s gap
    const VO_RATE = 1.05;
    const sceneTimeline = [];
    let cursor = 0;
    for (let i = 0; i < window.SCENES.length; i++) {
      const voDur = voBuffers[i].duration / VO_RATE;
      const dur = voDur + 0.16;
      sceneTimeline.push({
        scene: window.SCENES[i],
        voBuffer: voBuffers[i],
        voDur,
        start: cursor,
        duration: dur,
        end: cursor + dur,
      });
      cursor += dur;
    }
    const totalDuration = cursor + 0.25;

    // Pre-build a white noise buffer for snare, hi-hats & transition whooshes
    const noiseBuf = audioCtx.createBuffer(1, audioCtx.sampleRate * 2, audioCtx.sampleRate);
    const noiseData = noiseBuf.getChannelData(0);
    for (let i = 0; i < noiseData.length; i++) {
      noiseData[i] = Math.random() * 2 - 1;
    }

    // 3. Setup Canvas & Helper Drawing Primitives
    const canvas = document.getElementById('stage');
    const ctx = canvas.getContext('2d');
    const W = window.CONFIG.width;
    const H = window.CONFIG.height;
    const isVert = window.CONFIG.isVertical;

    function easeOutBack(x) {
      const c1 = 1.70158;
      const c3 = c1 + 1;
      return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
    }
    function easeOutCubic(x) {
      return 1 - Math.pow(1 - x, 3);
    }
    function clamp(v, min = 0, max = 1) {
      return Math.max(min, Math.min(max, v));
    }

    function roundRect(x, y, w, h, r) {
      ctx.beginPath();
      ctx.roundRect(x, y, w, h, r);
    }

    function drawNeoCard(x, y, w, h, r, bg, borderCol, shadowCol, shadowOff = 10, rot = 0) {
      ctx.save();
      ctx.translate(x + w / 2, y + h / 2);
      if (rot) ctx.rotate(rot);
      if (shadowCol) {
        ctx.fillStyle = shadowCol;
        roundRect(-w / 2 + shadowOff, -h / 2 + shadowOff, w, h, r);
        ctx.fill();
      }
      ctx.fillStyle = bg;
      roundRect(-w / 2, -h / 2, w, h, r);
      ctx.fill();
      if (borderCol) {
        ctx.lineWidth = 3.5;
        ctx.strokeStyle = borderCol;
        ctx.stroke();
      }
      ctx.restore();
    }

    function drawCoverImage(img, x, y, w, h, r) {
      ctx.save();
      roundRect(x, y, w, h, r);
      ctx.clip();
      const imgRatio = img.width / img.height;
      const boxRatio = w / h;
      let dw = w,
        dh = h,
        dx = x,
        dy = y;
      if (imgRatio > boxRatio) {
        dw = h * imgRatio;
        dx = x - (dw - w) / 2;
      } else {
        dh = w / imgRatio;
      }
      ctx.drawImage(img, dx, dy, dw, dh);
      ctx.restore();
    }

    function wrapText(text, x, y, maxWidth, lineHeight) {
      const words = text.split(' ');
      let line = '';
      let cy = y;
      for (let n = 0; n < words.length; n++) {
        const testLine = line + words[n] + ' ';
        if (ctx.measureText(testLine).width > maxWidth && n > 0) {
          ctx.fillText(line.trim(), x, cy);
          line = words[n] + ' ';
          cy += lineHeight;
        } else {
          line = testLine;
        }
      }
      ctx.fillText(line.trim(), x, cy);
      return cy;
    }

    function drawFrame(elapsed) {
      const active =
        sceneTimeline.find((s) => elapsed >= s.start && elapsed < s.end) ||
        sceneTimeline[sceneTimeline.length - 1];
      const localT = Math.max(0, elapsed - active.start);
      // Fast kinetic entrance (0.28s) + 128 BPM beat pulse!
      const p = clamp(localT / 0.28);
      const enter = easeOutCubic(p);
      const pop = easeOutBack(clamp(localT / 0.34));
      const beatPulse = Math.sin(elapsed * Math.PI * 2 * (128 / 60)) * 4;
      const sIdx = active.scene.id;
      const isDarkScene = sIdx === 0 || sIdx === 6 || sIdx === 7;

      // Background
      ctx.fillStyle = isDarkScene ? '#120914' : '#ffffff';
      ctx.fillRect(0, 0, W, H);

      // Subtle dot grid texture
      ctx.fillStyle = isDarkScene ? 'rgba(255,255,255,0.045)' : 'rgba(18,9,20,0.045)';
      const stepGrid = 44;
      for (let gx = 24; gx < W; gx += stepGrid) {
        for (let gy = 24; gy < H; gy += stepGrid) {
          ctx.fillRect(gx, gy, 2.5, 2.5);
        }
      }

      // Top Brand Header Bar
      const padX = isVert ? 64 : 110;
      const topY = isVert ? 78 : 64;
      ctx.save();
      ctx.font = '900 26px Inter';
      ctx.fillStyle = '#fe04c6';
      ctx.fillText('BACK POCKET', padX, topY);
      const bpW = ctx.measureText('BACK POCKET ').width;
      ctx.fillStyle = isDarkScene ? '#ffffff' : '#120914';
      ctx.fillText('MYSTERIES', padX + bpW, topY);

      // Step Tracker Pills (01 - 06) on Top Right
      const pillStartX = isVert ? W - padX - 6 * 54 : W - padX - 6 * 64;
      for (let step = 1; step <= 6; step++) {
        const isCurrentStep = sIdx === step;
        const isPastStep = sIdx > step;
        const px = pillStartX + (step - 1) * (isVert ? 54 : 64);
        const py = topY - 24;
        ctx.fillStyle = isCurrentStep
          ? '#fe04c6'
          : isPastStep
          ? isDarkScene
            ? 'rgba(254,4,198,0.28)'
            : '#120914'
          : isDarkScene
          ? 'rgba(255,255,255,0.1)'
          : '#f1f1f4';
        roundRect(px, py, isVert ? 46 : 54, 32, 16);
        ctx.fill();
        ctx.font = '900 14px Inter';
        ctx.fillStyle =
          isCurrentStep || isPastStep
            ? '#ffffff'
            : isDarkScene
            ? 'rgba(255,255,255,0.5)'
            : '#888894';
        ctx.textAlign = 'center';
        ctx.fillText('0' + step, px + (isVert ? 23 : 27), py + 21);
      }
      ctx.textAlign = 'left';
      ctx.restore();

      // Layout coordinates for Copy + Visual Collage
      const copyX = padX;
      const copyY = isVert ? 195 : 230;
      const copyMaxW = isVert ? W - padX * 2 : W * 0.43;

      // Draw Kicker Pill
      ctx.save();
      ctx.globalAlpha = enter;
      ctx.translate(0, (1 - enter) * 28);

      ctx.font = '900 16px Inter';
      const kickerText = active.scene.kicker;
      const kw = ctx.measureText(kickerText).width + 36;
      ctx.fillStyle = isDarkScene ? '#fe04c6' : '#120914';
      roundRect(copyX, copyY - 34, kw, 38, 19);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.fillText(kickerText, copyX + 18, copyY - 10);

      // Headline Line 1 & Line 2 (Italic Pink)
      const titleSize = isVert ? 74 : sIdx === 0 || sIdx === 7 ? 74 : 70;
      ctx.font = '900 ' + titleSize + 'px Inter';
      ctx.fillStyle = isDarkScene ? '#ffffff' : '#120914';
      ctx.fillText(active.scene.titleLine1, copyX, copyY + titleSize + 14);

      ctx.font = 'italic 900 ' + titleSize + 'px Inter';
      ctx.fillStyle = '#fe04c6';
      ctx.fillText(active.scene.titleLine2, copyX, copyY + titleSize * 2 + 22);

      // Subtitle
      ctx.font = '600 ' + (isVert ? 27 : 24) + 'px Inter';
      ctx.fillStyle = isDarkScene ? 'rgba(255,255,255,0.84)' : '#52525b';
      wrapText(
        active.scene.subtitle,
        copyX,
        copyY + titleSize * 2 + (isVert ? 72 : 66),
        copyMaxW,
        isVert ? 36 : 34
      );
      ctx.restore();

      // Visual Stage Region (Right side on 16:9, Middle-Bottom on 9:16)
      const vx = isVert ? padX : W * 0.52;
      const vy = isVert ? 625 : 175;
      const vw = isVert ? W - padX * 2 : W - vx - padX;
      const vh = isVert ? 880 : 620;

      ctx.save();

      // SCENE 0 & SCENE 1: 3 Tilted Guest Polaroid Cards
      if (sIdx === 0 || sIdx === 1) {
        const cards = [
          {
            name: 'SARAH',
            trait: '“Always 15m late holding an espresso martini”',
            img: imgs.sarah,
            rot: -0.06,
            delay: 0.0,
          },
          {
            name: 'JASON',
            trait: '“Knows everyone’s office gossip”',
            img: imgs.jason,
            rot: 0.03,
            delay: 0.07,
          },
          {
            name: 'CHLOE',
            trait: '“Still brings up the 2023 Ibiza trip”',
            img: imgs.chloe,
            rot: 0.06,
            delay: 0.14,
          },
        ];
        const cardW = isVert ? (vw - 36) / 3 : (vw - 44) / 3;
        const cardH = cardW * 1.46;
        cards.forEach((c, idx) => {
          const cp = easeOutBack(clamp((localT - c.delay) / 0.32));
          const cx = vx + idx * (cardW + 18);
          const cy =
            vy +
            (vh - cardH) / 2 +
            (idx === 1 ? 20 : 0) +
            (1 - cp) * 60 +
            beatPulse * (idx % 2 === 0 ? 1 : -1);
          ctx.save();
          ctx.globalAlpha = clamp((localT - c.delay) / 0.2);
          ctx.translate(cx + cardW / 2, cy + cardH / 2);
          ctx.rotate(c.rot * cp);
          ctx.fillStyle = isDarkScene ? '#fe04c6' : '#120914';
          roundRect(-cardW / 2 + 10, -cardH / 2 + 10, cardW, cardH, 24);
          ctx.fill();
          ctx.fillStyle = '#ffffff';
          roundRect(-cardW / 2, -cardH / 2, cardW, cardH, 24);
          ctx.fill();
          ctx.lineWidth = 3.5;
          ctx.strokeStyle = '#120914';
          ctx.stroke();

          const imgH = cardH * 0.68;
          drawCoverImage(c.img, -cardW / 2 + 14, -cardH / 2 + 14, cardW - 28, imgH, 16);

          ctx.fillStyle = '#120914';
          ctx.font = '900 20px Inter';
          ctx.fillText(c.name, -cardW / 2 + 16, -cardH / 2 + imgH + 42);
          ctx.fillStyle = '#64748b';
          ctx.font = '600 13px Inter';
          wrapText(c.trait, -cardW / 2 + 16, -cardH / 2 + imgH + 64, cardW - 32, 17);
          ctx.restore();
        });
      }

      // SCENE 2: Theme Poster Card + 4 Spice Level Pills
      if (sIdx === 2) {
        const cardW = vw;
        const cardH = isVert ? 510 : 420;
        const cy = vy + (vh - cardH) / 2 - 20 + (1 - pop) * 45 + beatPulse;
        drawNeoCard(vx, cy, cardW, cardH, 32, '#120914', '#120914', '#fe04c6', 14, -0.02 * pop);
        drawCoverImage(imgs.cover, vx + 12, cy + 12, cardW - 24, cardH - 108, 22);

        ctx.fillStyle = '#fe04c6';
        ctx.font = '900 15px Inter';
        ctx.fillText('HUMAN-ARCHITECTED PLOT · WATERTIGHT CLUES', vx + 28, cy + cardH - 56);
        ctx.fillStyle = '#ffffff';
        ctx.font = '900 32px Inter';
        ctx.fillText('LOVE ON THE ROCKS', vx + 28, cy + cardH - 20);

        const spices = ['CLEAN (SFW)', 'MILD', 'SPICY', 'FILTHY (18+)'];
        const spW = (cardW - 36) / 4;
        spices.forEach((sp, i) => {
          const sx = vx + i * (spW + 12);
          const sy = cy + cardH + 30;
          drawNeoCard(sx, sy, spW, 52, 26, i === 2 ? '#fe04c6' : '#120914', '#120914', null, 0, 0);
          ctx.fillStyle = '#ffffff';
          ctx.font = '900 15px Inter';
          ctx.textAlign = 'center';
          ctx.fillText(sp, sx + spW / 2, sy + 32);
          ctx.textAlign = 'left';
        });
      }

      // SCENE 3: Assign Your Cast Stack
      if (sIdx === 3) {
        const cardW = vw;
        const cardH = isVert ? 520 : 460;
        const cy = vy + (vh - cardH) / 2 + beatPulse * 0.6;
        drawNeoCard(vx, cy, cardW, cardH, 32, '#f8f7fa', '#120914', '#120914', 14, 0.015 * pop);

        const rows = [
          { guest: 'Sarah', role: 'THE SISTER-IN-LAW', tag: 'SUSPECT', img: imgs.sarah },
          { guest: 'Gabby', role: 'THE WIFE', tag: 'HOST PLAYING', img: imgs.gabby },
          { guest: 'Jason', role: 'THE CO-WORKER', tag: 'SUSPECT', img: imgs.jason },
        ];
        rows.forEach((r, idx) => {
          const rp = easeOutBack(clamp((localT - idx * 0.08) / 0.3));
          const rx = vx + 28 + (1 - rp) * 50;
          const ry = cy + 28 + idx * 136;
          const rw = cardW - 56;
          const rh = 114;
          drawNeoCard(rx, ry, rw, rh, 22, '#ffffff', '#e4e4e7', null, 0, 0);
          drawCoverImage(r.img, rx + 16, ry + 13, 88, 88, 16);

          ctx.fillStyle = '#120914';
          ctx.font = '900 24px Inter';
          ctx.fillText(r.guest, rx + 122, ry + 66);
          const gw = ctx.measureText(r.guest).width;

          ctx.fillStyle = '#fe04c6';
          ctx.fillText('  →  ' + r.role, rx + 122 + gw, ry + 66);

          ctx.fillStyle = r.tag === 'HOST PLAYING' ? '#fe04c6' : '#120914';
          roundRect(rx + rw - 170, ry + 37, 148, 40, 20);
          ctx.fill();
          ctx.fillStyle = '#ffffff';
          ctx.font = '900 13px Inter';
          ctx.textAlign = 'center';
          ctx.fillText(r.tag, rx + rw - 96, ry + 62);
          ctx.textAlign = 'left';
        });
      }

      // SCENE 4: Generate Custom Clues (CCTV + Overlapping Leaked Text Bubble)
      if (sIdx === 4) {
        const cardW = vw;
        const cctvH = isVert ? 400 : 345;
        const cy = vy + 28 + beatPulse * 0.6;
        drawNeoCard(vx, cy, cardW, cctvH, 30, '#120914', '#120914', '#120914', 12, -0.02 * pop);
        drawCoverImage(imgs.cctv, vx + 10, cy + 10, cardW - 20, cctvH - 20, 22);

        ctx.fillStyle = 'rgba(18,9,20,0.88)';
        roundRect(vx + 28, cy + 28, 290, 44, 12);
        ctx.fill();
        ctx.fillStyle = '#fe04c6';
        ctx.font = '900 16px monospace';
        ctx.fillText('● REC · CAM 02 · 19:55:14', vx + 44, cy + 56);

        const msgP = easeOutBack(clamp((localT - 0.1) / 0.3));
        const mx = vx + 36;
        const my = cy + cctvH - 52 + (1 - msgP) * 45;
        const mw = cardW - 44;
        const mh = 180;
        drawNeoCard(mx, my, mw, mh, 26, '#ffffff', '#120914', '#fe04c6', 12, 0.015 * msgP);

        ctx.fillStyle = '#fe04c6';
        ctx.font = '900 15px Inter';
        ctx.fillText('LEAKED TEXT THREAD · 7:32 PM  ·  + AI VOICE WIRETAPS', mx + 28, my + 42);
        ctx.fillStyle = '#120914';
        ctx.font = '800 22px Inter';
        wrapText(
          '“Meet me by the coat closet before dinner. Someone left a printed bank transfer in Luke’s coat pocket...”',
          mx + 28,
          my + 84,
          mw - 56,
          31
        );
      }

      // SCENE 5: Pre-Party Character Invite Card
      if (sIdx === 5) {
        const cardW = vw;
        const cardH = isVert ? 460 : 400;
        const cy = vy + (vh - cardH) / 2 + beatPulse * 0.7;
        drawNeoCard(vx, cy, cardW, cardH, 32, '#120914', '#120914', '#fe04c6', 14, -0.015 * pop);

        drawCoverImage(imgs.sarah, vx + 34, cy + 34, 130, 165, 20);

        ctx.fillStyle = '#fe04c6';
        ctx.font = '900 15px Inter';
        ctx.fillText('PRE-PARTY CHARACTER INVITE · FOR SARAH', vx + 190, cy + 62);

        ctx.fillStyle = '#ffffff';
        ctx.font = '900 34px Inter';
        ctx.fillText('ROLE: THE SISTER-IN-LAW', vx + 190, cy + 108);

        ctx.fillStyle = 'rgba(255,255,255,0.84)';
        ctx.font = '600 21px Inter';
        wrapText(
          'What to Wear: Sleek winter chic — an emerald silk dress or tailored velvet blazer, silver snowflake hairpin, and dark berry lipstick.',
          vx + 190,
          cy + 148,
          cardW - 224,
          29
        );

        ctx.fillStyle = '#fe04c6';
        roundRect(vx + 34, cy + cardH - 84, cardW - 68, 54, 27);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.font = '900 18px Inter';
        ctx.textAlign = 'center';
        ctx.fillText('SHARED VIA 1-CLICK GROUP CHAT LINK  →', vx + cardW / 2, cy + cardH - 50);
        ctx.textAlign = 'left';
      }

      // SCENE 6: Launch Live Game Mode + Extra Guest Detective Sarah
      if (sIdx === 6) {
        const cardW = vw;
        const cardH = isVert ? 480 : 420;
        const cy = vy + (vh - cardH) / 2 + beatPulse * 0.7;
        drawNeoCard(vx, cy, cardW, cardH, 32, '#fe04c6', '#ffffff', '#ffffff', 12, 0.015 * pop);

        ctx.fillStyle = '#120914';
        roundRect(vx + 32, cy + 30, 260, 46, 23);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.font = '900 16px Inter';
        ctx.fillText('LIVE GAME PIN · 146 492', vx + 54, cy + 59);

        ctx.fillStyle = '#ffffff';
        ctx.font = '900 17px Inter';
        ctx.textAlign = 'right';
        ctx.fillText('6/6 CAST + 2 EXTRA DETECTIVES', vx + cardW - 36, cy + 59);
        ctx.textAlign = 'left';

        const inX = vx + 32;
        const inY = cy + 100;
        const inW = cardW - 64;
        const inH = cardH - 132;
        drawNeoCard(inX, inY, inW, inH, 24, '#120914', null, null, 0, 0);

        ctx.fillStyle = '#fe04c6';
        ctx.font = '900 16px Inter';
        ctx.fillText('HAVE MORE THAN 6 GUESTS? · $0 EXTRA', inX + 32, inY + 46);

        ctx.fillStyle = '#ffffff';
        ctx.font = '900 35px Inter';
        ctx.fillText('JOIN AS “DETECTIVE SARAH” →', inX + 32, inY + 94);

        ctx.fillStyle = 'rgba(255,255,255,0.84)';
        ctx.font = '600 20px Inter';
        wrapText(
          'Extra mates scan the QR code on their phone for an official Detective Briefing, live clue drops, and voting in every round!',
          inX + 32,
          inY + 138,
          inW - 64,
          29
        );
      }

      // SCENE 7: Outro Finale Card
      if (sIdx === 7) {
        const cardW = vw;
        const cardH = isVert ? 440 : 380;
        const cy = vy + (vh - cardH) / 2 + beatPulse * 0.7;
        drawNeoCard(vx, cy, cardW, cardH, 32, '#ffffff', '#120914', '#fe04c6', 14, -0.01 * pop);
        drawCoverImage(imgs.cocktail, vx + 16, cy + 16, cardW - 32, cardH - 116, 22);

        ctx.fillStyle = '#fe04c6';
        roundRect(vx + 28, cy + cardH - 82, cardW - 56, 60, 30);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.font = '900 22px Inter';
        ctx.textAlign = 'center';
        ctx.fillText('BUILD YOUR MYSTERY AT BACKPOCKETMYSTERIES.COM →', vx + cardW / 2, cy + cardH - 44);
        ctx.textAlign = 'left';
      }

      ctx.restore();

      // =======================================================================
      // DYNAMIC 2-LINE SYNCED NEO-BRUTALIST CAPTIONS (NEVER TRUNCATES OR OVERFLOWS)
      // =======================================================================
      const captions = active.scene.captions || [['BACK POCKET MYSTERIES', 'HOW IT WORKS']];
      const chunkIdx = localT < active.duration * 0.52 ? 0 : Math.min(1, captions.length - 1);
      const chunkLocalT = chunkIdx === 0 ? localT : localT - active.duration * 0.52;
      const chunkPop = easeOutBack(clamp(chunkLocalT / 0.22));
      const [capLine1, capLine2] = captions[chunkIdx];

      ctx.save();
      const capFontSize = isVert ? 32 : 28;
      ctx.font = '900 ' + capFontSize + 'px Inter';
      const w1 = ctx.measureText(capLine1).width;
      const w2 = ctx.measureText(capLine2).width;
      const boxW = Math.min(W - padX * 2, Math.max(w1, w2) + (isVert ? 88 : 96));
      const boxH = isVert ? 114 : 98;
      const boxX = (W - boxW) / 2;
      const boxY = H - (isVert ? 205 : 138) + (1 - chunkPop) * 14;

      // Hard offset shadow
      ctx.fillStyle = '#fe04c6';
      roundRect(boxX + 7, boxY + 7, boxW, boxH, 24);
      ctx.fill();

      // Dark Ink Caption Body
      ctx.fillStyle = '#120914';
      roundRect(boxX, boxY, boxW, boxH, 24);
      ctx.fill();
      ctx.lineWidth = 3.5;
      ctx.strokeStyle = '#ffffff';
      ctx.stroke();

      ctx.textAlign = 'center';
      ctx.fillStyle = '#ffffff';
      ctx.fillText(capLine1, W / 2, boxY + (isVert ? 46 : 40));

      ctx.fillStyle = '#fe04c6';
      ctx.font = 'italic 900 ' + capFontSize + 'px Inter';
      ctx.fillText(capLine2, W / 2, boxY + (isVert ? 88 : 78));
      ctx.textAlign = 'left';

      // Progress Bar at very bottom edge
      const prog = clamp(elapsed / totalDuration);
      ctx.fillStyle = '#fe04c6';
      ctx.fillRect(0, H - 12, W * prog, 12);
      ctx.restore();
    }

    // 4. Record Canvas + WebAudio Stream with MediaRecorder
    drawFrame(0);
    await audioCtx.resume();

    // Continuous ultra-quiet carrier node so audioDest stream never stalls
    const carrierOsc = audioCtx.createOscillator();
    const carrierGain = audioCtx.createGain();
    carrierGain.gain.value = 0.0001;
    carrierOsc.connect(carrierGain);
    carrierGain.connect(masterComp);
    carrierOsc.start();

    const t0 = audioCtx.currentTime + 0.06;

    // Schedule Fast-Paced British VO Clips + Scene Transition Whoosh/Pop SFX
    for (const item of sceneTimeline) {
      const src = audioCtx.createBufferSource();
      src.buffer = item.voBuffer;
      src.playbackRate.value = VO_RATE;
      const voGain = audioCtx.createGain();
      voGain.gain.setValueAtTime(1.15, t0 + item.start);
      src.connect(voGain);
      voGain.connect(masterComp);
      src.start(t0 + item.start + 0.04);

      // Punchy Pop + Rising Chord Chime on every scene transition
      const popOsc = audioCtx.createOscillator();
      const popGain = audioCtx.createGain();
      popOsc.type = 'sine';
      popOsc.frequency.setValueAtTime(320, t0 + item.start);
      popOsc.frequency.exponentialRampToValueAtTime(880, t0 + item.start + 0.11);
      popGain.gain.setValueAtTime(0.18, t0 + item.start);
      popGain.gain.exponentialRampToValueAtTime(0.001, t0 + item.start + 0.14);
      popOsc.connect(popGain);
      popGain.connect(masterComp);
      popOsc.start(t0 + item.start);
      popOsc.stop(t0 + item.start + 0.15);
    }

    // =========================================================================
    // UPBEAT 128 BPM POP-FUNK GROOVE ENGINE (AUDIBLE, ENERGETIC BACKING TRACK)
    // =========================================================================
    const bpm = 128;
    const beatDur = 60 / bpm; // 0.46875s per beat
    const step16Dur = beatDur / 4; // 16th-note grid
    const total16Steps = Math.ceil(totalDuration / step16Dur);

    // Funky minor-pentatonic bass riff in A minor (A2, A2, C3, D3, E3, G3)
    const bassPattern = [
      110.0, 0, 110.0, 220.0,
      130.81, 0, 146.83, 164.81,
      110.0, 0, 110.0, 196.0,
      164.81, 146.83, 130.81, 146.83,
    ];

    // Upbeat synth chord progression (Am7 -> Cmaj7 -> Dm7 -> E7)
    const chords = [
      [440.0, 523.25, 659.25],
      [523.25, 659.25, 783.99],
      [587.33, 698.46, 880.0],
      [659.25, 830.61, 987.77],
    ];

    for (let step = 0; step < total16Steps; step++) {
      const st = t0 + step * step16Dur;
      const stepInBar = step % 16;
      const barIdx = Math.floor(step / 16);

      // 1. Punchy 4-on-the-floor Kick Drum (steps 0, 4, 8, 12)
      if (stepInBar % 4 === 0) {
        const kickOsc = audioCtx.createOscillator();
        const kickGain = audioCtx.createGain();
        kickOsc.type = 'sine';
        kickOsc.frequency.setValueAtTime(145, st);
        kickOsc.frequency.exponentialRampToValueAtTime(46, st + 0.09);
        kickGain.gain.setValueAtTime(0.34, st);
        kickGain.gain.exponentialRampToValueAtTime(0.001, st + 0.18);
        kickOsc.connect(kickGain);
        kickGain.connect(masterComp);
        kickOsc.start(st);
        kickOsc.stop(st + 0.19);
      }

      // 2. Crisp Backbeat Snare / Clap (steps 4 and 12)
      if (stepInBar === 4 || stepInBar === 12) {
        const snareNoise = audioCtx.createBufferSource();
        snareNoise.buffer = noiseBuf;
        const filter = audioCtx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(1800, st);
        filter.Q.setValueAtTime(1.2, st);
        const snareGain = audioCtx.createGain();
        snareGain.gain.setValueAtTime(0.22, st);
        snareGain.gain.exponentialRampToValueAtTime(0.001, st + 0.13);
        snareNoise.connect(filter);
        filter.connect(snareGain);
        snareGain.connect(masterComp);
        snareNoise.start(st);
        snareNoise.stop(st + 0.14);
      }

      // 3. Driving 16th-Note Hi-Hats (accent on off-beats 2, 6, 10, 14)
      if (stepInBar % 2 === 0 || stepInBar % 4 === 3) {
        const isOffbeat = stepInBar % 4 === 2;
        const hatNoise = audioCtx.createBufferSource();
        hatNoise.buffer = noiseBuf;
        const hp = audioCtx.createBiquadFilter();
        hp.type = 'highpass';
        hp.frequency.setValueAtTime(7500, st);
        const hatGain = audioCtx.createGain();
        hatGain.gain.setValueAtTime(isOffbeat ? 0.11 : 0.055, st);
        hatGain.gain.exponentialRampToValueAtTime(0.001, st + (isOffbeat ? 0.08 : 0.04));
        hatNoise.connect(hp);
        hp.connect(hatGain);
        hatGain.connect(masterComp);
        hatNoise.start(st);
        hatNoise.stop(st + 0.09);
      }

      // 4. Funky Synth Bassline
      const bassFreq = bassPattern[stepInBar];
      if (bassFreq > 0) {
        const bassOsc = audioCtx.createOscillator();
        bassOsc.type = 'sawtooth';
        bassOsc.frequency.setValueAtTime(bassFreq, st);
        const lp = audioCtx.createBiquadFilter();
        lp.type = 'lowpass';
        lp.frequency.setValueAtTime(950, st);
        lp.frequency.exponentialRampToValueAtTime(260, st + step16Dur * 0.85);
        const bassGain = audioCtx.createGain();
        bassGain.gain.setValueAtTime(0.18, st);
        bassGain.gain.exponentialRampToValueAtTime(0.002, st + step16Dur * 0.9);
        bassOsc.connect(lp);
        lp.connect(bassGain);
        bassGain.connect(masterComp);
        bassOsc.start(st);
        bassOsc.stop(st + step16Dur * 0.92);
      }

      // 5. Off-Beat Pop-Disco Synth Chord Stabs (steps 2, 6, 10, 14)
      if (stepInBar % 4 === 2) {
        const chord = chords[barIdx % chords.length];
        for (const freq of chord) {
          const chOsc = audioCtx.createOscillator();
          chOsc.type = 'triangle';
          chOsc.frequency.setValueAtTime(freq, st);
          const chGain = audioCtx.createGain();
          chGain.gain.setValueAtTime(0.075, st);
          chGain.gain.exponentialRampToValueAtTime(0.001, st + 0.14);
          chOsc.connect(chGain);
          chGain.connect(masterComp);
          chOsc.start(st);
          chOsc.stop(st + 0.15);
        }
      }
    }

    const canvasStream = canvas.captureStream(30);
    const combinedStream = new MediaStream([
      ...canvasStream.getVideoTracks(),
      ...audioDest.stream.getAudioTracks(),
    ]);

    const mimeType = MediaRecorder.isTypeSupported('video/mp4;codecs=avc1,mp4a.40.2')
      ? 'video/mp4;codecs=avc1,mp4a.40.2'
      : 'video/mp4';

    const recorder = new MediaRecorder(combinedStream, {
      mimeType,
      videoBitsPerSecond: 6000000,
      audioBitsPerSecond: 160000,
    });

    const chunks = [];
    recorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) chunks.push(e.data);
    };

    const donePromise = new Promise((resolve) => {
      recorder.onstop = async () => {
        const blob = new Blob(chunks, { type: 'video/mp4' });
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64 = reader.result.split(';base64,')[1];
          resolve(base64);
        };
        reader.readAsDataURL(blob);
      };
    });

    recorder.start(200);

    const startWall = performance.now();
    while (true) {
      const elapsed = (performance.now() - startWall) / 1000;
      drawFrame(elapsed);
      if (elapsed >= totalDuration) break;
      await new Promise((r) => setTimeout(r, 33));
    }

    recorder.stop();
    const finalB64 = await donePromise;
    carrierOsc.stop();
    await audioCtx.close();
    return finalB64;
  });

  const outPath = path.resolve('public/videos', outFilename);
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  const buf = Buffer.from(b64Video, 'base64');
  fs.writeFileSync(outPath, buf);
  console.log(`✅ Saved ${outPath} (${(buf.length / 1024 / 1024).toFixed(2)} MB)`);
  await browser.close();
}

async function main() {
  await ensureBritishVoiceovers();
  await Promise.all([
    renderPromoVideo({
      width: 1920,
      height: 1080,
      aspect: '16:9',
      outFilename: 'back-pocket-mysteries-how-it-works-16x9.mp4',
    }),
    renderPromoVideo({
      width: 1080,
      height: 1920,
      aspect: '9:16',
      outFilename: 'back-pocket-mysteries-how-it-works-9x16.mp4',
    }),
  ]);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
