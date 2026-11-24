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

// Dual-Voice Deeper British Banter Duo:
// 1. ARCHIE (Deep, Energetic & Dynamic British Male Commercial Voice)
const VOICE_MALE_UK = 'uGA0BTw0auurBhSTFN7g';
// 2. CATE (Resonant, Deep & Confident British Female Voice)
const VOICE_FEMALE_UK = 'J64VNrjLE6uKFBKlxfSJ';

const VO_DIR = 'public/videos/vo-uk-banter';

export const SCENES = [
  {
    id: 0,
    key: 'what_it_is',
    partLabel: '01 · WHAT IT IS',
    speaker: 'ARCHIE 🇬🇧',
    voiceId: VOICE_MALE_UK,
    dark: true,
    kicker: 'WHAT IS BACK POCKET MYSTERIES?',
    titleLine1: 'A LIVE 3-ROUND',
    titleLine2: 'MURDER MYSTERY PARTY.',
    subtitle: 'Where a human-written crime story, the suspects, and every clue are custom-built around your real friends.',
    voText:
      'What is Back Pocket Mysteries? It is a live, three-round murder mystery party game where the suspects, the drama, and the crime-scene clues are built around your actual friends!',
    captions: [
      ['WHAT IS BACK POCKET MYSTERIES?', 'A LIVE 3-ROUND MURDER MYSTERY PARTY'],
      ['WHERE THE SUSPECTS & CRIME CLUES', 'ARE BUILT AROUND YOUR REAL FRIENDS!'],
    ],
  },
  {
    id: 1,
    key: 'what_we_do_input',
    partLabel: '02 · WHAT WE DO',
    speaker: 'CATE 🇬🇧',
    voiceId: VOICE_FEMALE_UK,
    dark: false,
    kicker: 'WHAT WE DO · STEP 1: YOUR MATES & VIBE',
    titleLine1: 'ADD YOUR FRIENDS',
    titleLine2: '& PICK YOUR SPICE.',
    subtitle: 'Add their look or photo, accent, and inside jokes — then pick a storyline from Clean SFW to 18+ Filthy.',
    voText:
      'Here is what we do! You add your mates—their look or a quick photo, their accent, and their funniest inside jokes—then pick a human-written story and your spice level, from Clean to Filthy!',
    captions: [
      ['ADD YOUR MATES’ LOOK, PHOTO', 'ACCENT & FUNNIEST INSIDE JOKES'],
      ['PICK A HUMAN-WRITTEN STORY', '& SPICE LEVEL (CLEAN TO 18+ FILTHY!)'],
    ],
  },
  {
    id: 2,
    key: 'what_we_do_photos',
    partLabel: '02 · WHAT WE DO',
    speaker: 'ARCHIE 🇬🇧',
    voiceId: VOICE_MALE_UK,
    dark: true,
    kicker: 'CUSTOM CLUE ENGINE · LOOKALIKE CRIME PHOTOS',
    titleLine1: 'CLUES RENDERED TO',
    titleLine2: 'LOOK LIKE YOUR GUESTS.',
    subtitle: 'In ~20 minutes our engine renders crime-scene & CCTV photos matching each guest’s exact hair, outfit & glasses!',
    voText:
      'Then our engine builds your custom evidence pack in twenty minutes! First: it renders crime-scene and CCTV photos that actually look like your real guest list, down to their exact hair, glasses, and outfits!',
    captions: [
      ['WE RENDER CRIME-SCENE & CCTV PHOTOS', 'THAT ACTUALLY LOOK LIKE YOUR GUESTS!'],
      ['MATCHING THEIR EXACT HAIR,', 'OUTFITS, GLASSES & ACCESSORIES'],
    ],
  },
  {
    id: 3,
    key: 'what_we_do_texts_audio',
    partLabel: '02 · WHAT WE DO',
    speaker: 'CATE 🇬🇧',
    voiceId: VOICE_FEMALE_UK,
    dark: false,
    kicker: 'CUSTOM CLUE ENGINE · TEXTS, FORENSICS & WIRETAPS',
    titleLine1: 'LEAKED TEXTS &',
    titleLine2: 'AI VOICE WIRETAPS.',
    subtitle: 'iMessage threads, physical forensics & intercepted voicemails synthesized in each friend’s accent.',
    voText:
      'Plus leaked text threads and forensic evidence weaving in their real names and inside jokes—and even intercepted voice wiretaps generated in each friend’s accent!',
    captions: [
      ['LEAKED TEXTS & FORENSIC EVIDENCE', 'WITH THEIR REAL NAMES & INSIDE JOKES'],
      ['PLUS AI VOICE WIRETAPS & VOICEMAILS', 'GENERATED IN EACH FRIEND’S ACCENT!'],
    ],
  },
  {
    id: 4,
    key: 'how_it_looks_invite',
    partLabel: '03 · HOW IT LOOKS',
    speaker: 'ARCHIE 🇬🇧',
    voiceId: VOICE_MALE_UK,
    dark: true,
    kicker: 'BEFORE THE NIGHT · MOBILE GUEST INVITATION',
    titleLine1: 'INTERACTIVE INVITES',
    titleLine2: '& 3 OUTFIT LOOKS.',
    subtitle: 'Drop 1 link in the group chat. Guests open their tabbed invite for party details, character bio & 3 outfit looks.',
    voText:
      'Before the night, drop one link in the group chat! Each guest opens their interactive invite to see the party details, their spoiler-free character blurb, and three outfit looks to wear!',
    captions: [
      ['BEFORE THE NIGHT: 1 GROUP-CHAT LINK', 'OPENS EACH GUEST’S MOBILE INVITE'],
      ['PARTY DETAILS, CHARACTER BIO', '& 3 VISUAL OUTFIT LOOKS TO WEAR!'],
    ],
  },
  {
    id: 5,
    key: 'how_it_looks_live',
    partLabel: '03 · HOW IT LOOKS',
    speaker: 'CATE 🇬🇧',
    voiceId: VOICE_FEMALE_UK,
    dark: false,
    kicker: 'ON PARTY NIGHT · LIVE GAME MODE PLAYROOM',
    titleLine1: 'HOST PLAYS ALONG',
    titleLine2: '+ PHONES IN SYNC.',
    subtitle: 'Host plays 100% spoiler-free while guests scan the QR code for secret round prompts, live clue drops & voting!',
    voText:
      'On party night, launch Live Game Mode! The host plays along completely spoiler-free while everyone scans the QR code on their phone for secret round prompts, live clue drops, and voting—and extra mates join free as Detectives!',
    captions: [
      ['PARTY NIGHT: HOST PLAYS SPOILER-FREE', 'WHILE GUESTS SCAN THE LIVE QR CODE'],
      ['SECRET PROMPTS, CLUE DROPS & VOTING', '+ EXTRA MATES JOIN FREE AS DETECTIVES!'],
    ],
  },
  {
    id: 6,
    key: 'how_it_looks_finale',
    partLabel: '03 · HOW IT LOOKS',
    speaker: 'ARCHIE 🇬🇧',
    voiceId: VOICE_MALE_UK,
    dark: true,
    kicker: 'ROUND 3 FINALE · KILLER REVEAL & DETECTIVE WRAPPED',
    titleLine1: 'UNMASK THE KILLER',
    titleLine2: '& SHARE YOUR WRAPPED.',
    subtitle: 'Live vote leaderboard, killer confession & a custom 9:16 “Detective Wrapped” Instagram Story card for every guest!',
    voText:
      'After three rounds of accusations, unmask the killer on screen—and every guest gets a custom Detective Wrapped story card to share straight to Instagram!',
    captions: [
      ['ROUND 3 FINALE: UNMASK THE KILLER', '& SEE THE LIVE VOTE LEADERBOARD'],
      ['EVERY GUEST GETS A 9:16', '“DETECTIVE WRAPPED” STORY CARD!'],
    ],
  },
  {
    id: 7,
    key: 'outro',
    partLabel: 'READY IN ~20 MINS',
    speaker: 'CATE & ARCHIE 🇬🇧',
    voiceId: VOICE_FEMALE_UK,
    dark: true,
    kicker: 'FROM £15 (~£2.50 PER GUEST) · ZERO PRINTING',
    titleLine1: 'PUT YOUR FRIENDS IN',
    titleLine2: 'THE CRIME SCENE.',
    subtitle: 'backpocketmysteries.com',
    voText:
      'From just fifteen pounds—about two pounds fifty a guest. Put your friends in the crime scene today at Back Pocket Mysteries dot com!',
    captions: [
      ['FROM £15 (~£2.50 PER GUEST)', 'READY IN ~20 MINUTES'],
      ['PUT YOUR FRIENDS IN THE CRIME SCENE', 'BACKPOCKETMYSTERIES.COM →'],
    ],
  },
];

async function ensureDualBritishVoiceovers() {
  fs.mkdirSync(path.resolve(VO_DIR), { recursive: true });
  for (const scene of SCENES) {
    const outMp3 = path.resolve(VO_DIR, `scene-${scene.id}.mp3`);
    if (fs.existsSync(outMp3) && fs.statSync(outMp3).size > 2000) {
      continue;
    }
    console.log(`🎙️ Synthesizing ${scene.speaker} VO for Scene ${scene.id} (${scene.key})...`);
    const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${scene.voiceId}`, {
      method: 'POST',
      headers: {
        'xi-api-key': ELEVENLABS_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: scene.voText,
        model_id: 'eleven_multilingual_v2',
        voice_settings: {
          stability: 0.26,
          similarity_boost: 0.86,
          style: 0.80,
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
    clueSarahFireplace: fileToDataUri(
      'public/generated-clues/a1111111-1111-4111-8111-111111111107-5a3adbbd85bd.jpg',
      'image/jpeg'
    ),
    clueChloeDrink: fileToDataUri(
      'public/generated-clues/a1111111-1111-4111-8111-111111111106-45fd5371bedd.jpg',
      'image/jpeg'
    ),
    clueHairpin: fileToDataUri(
      'public/generated-clues/a1111111-1111-4111-8111-111111111109-6c6f2b97ac73.jpg',
      'image/jpeg'
    ),
    cover: fileToDataUri('public/moodboard/lotr/main-promo-murder.jpg', 'image/jpeg'),
    dressCode: fileToDataUri('public/moodboard/lotr/dress-code.jpg', 'image/jpeg'),
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

    const audioCtx = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 44100 });
    const audioDest = audioCtx.createMediaStreamDestination();

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

    const VO_RATE = 1.04;
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

    const noiseBuf = audioCtx.createBuffer(1, audioCtx.sampleRate * 2, audioCtx.sampleRate);
    const noiseData = noiseBuf.getChannelData(0);
    for (let i = 0; i < noiseData.length; i++) {
      noiseData[i] = Math.random() * 2 - 1;
    }

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
      const p = clamp(localT / 0.28);
      const enter = easeOutCubic(p);
      const pop = easeOutBack(clamp(localT / 0.34));
      const beatPulse = Math.sin(elapsed * Math.PI * 2 * (128 / 60)) * 4;
      const sKey = active.scene.key;
      const isDarkScene = active.scene.dark;

      ctx.fillStyle = isDarkScene ? '#120914' : '#ffffff';
      ctx.fillRect(0, 0, W, H);

      ctx.fillStyle = isDarkScene ? 'rgba(255,255,255,0.045)' : 'rgba(18,9,20,0.045)';
      const stepGrid = 44;
      for (let gx = 24; gx < W; gx += stepGrid) {
        for (let gy = 24; gy < H; gy += stepGrid) {
          ctx.fillRect(gx, gy, 2.5, 2.5);
        }
      }

      // Top Brand Header Bar + 3-Part Storyboard Progress Pills (WHAT IT IS | WHAT WE DO | HOW IT LOOKS)
      const padX = isVert ? 64 : 104;
      const topY = isVert ? 78 : 64;
      ctx.save();
      ctx.font = '900 26px Inter';
      ctx.fillStyle = '#fe04c6';
      ctx.fillText('BACK POCKET', padX, topY);
      const bpW = ctx.measureText('BACK POCKET ').width;
      ctx.fillStyle = isDarkScene ? '#ffffff' : '#120914';
      ctx.fillText('MYSTERIES', padX + bpW, topY);

      const parts = ['01 · WHAT IT IS', '02 · WHAT WE DO', '03 · HOW IT LOOKS'];
      const pillW = isVert ? 168 : 190;
      const pillStartX = W - padX - parts.length * (pillW + 12) + 12;
      parts.forEach((pt, idx) => {
        const isCurrent = active.scene.partLabel === pt;
        const px = pillStartX + idx * (pillW + 12);
        const py = topY - 24;
        ctx.fillStyle = isCurrent
          ? '#fe04c6'
          : isDarkScene
          ? 'rgba(255,255,255,0.1)'
          : '#f1f1f4';
        roundRect(px, py, pillW, 34, 17);
        ctx.fill();
        ctx.font = '900 13px Inter';
        ctx.fillStyle = isCurrent ? '#ffffff' : isDarkScene ? 'rgba(255,255,255,0.55)' : '#71717a';
        ctx.textAlign = 'center';
        ctx.fillText(pt, px + pillW / 2, py + 22);
      });
      ctx.textAlign = 'left';
      ctx.restore();

      const copyX = padX;
      const copyY = isVert ? 190 : 225;
      const copyMaxW = isVert ? W - padX * 2 : W * 0.42;

      // Kicker Pill
      ctx.save();
      ctx.globalAlpha = enter;
      ctx.translate(0, (1 - enter) * 28);

      ctx.font = '900 15px Inter';
      const kickerText = active.scene.kicker;
      const kw = ctx.measureText(kickerText).width + 36;
      ctx.fillStyle = isDarkScene ? '#fe04c6' : '#120914';
      roundRect(copyX, copyY - 34, kw, 38, 19);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.fillText(kickerText, copyX + 18, copyY - 10);

      // Headline Line 1 & Line 2
      const titleSize = isVert ? 66 : 62;
      ctx.font = '900 ' + titleSize + 'px Inter';
      ctx.fillStyle = isDarkScene ? '#ffffff' : '#120914';
      ctx.fillText(active.scene.titleLine1, copyX, copyY + titleSize + 14);

      ctx.font = 'italic 900 ' + titleSize + 'px Inter';
      ctx.fillStyle = '#fe04c6';
      ctx.fillText(active.scene.titleLine2, copyX, copyY + titleSize * 2 + 22);

      // Subtitle
      ctx.font = '600 ' + (isVert ? 25 : 23) + 'px Inter';
      ctx.fillStyle = isDarkScene ? 'rgba(255,255,255,0.84)' : '#52525b';
      wrapText(
        active.scene.subtitle,
        copyX,
        copyY + titleSize * 2 + (isVert ? 66 : 60),
        copyMaxW,
        isVert ? 34 : 32
      );
      ctx.restore();

      // Visual Stage Region
      const vx = isVert ? padX : W * 0.49;
      const vy = isVert ? 595 : 155;
      const vw = isVert ? W - padX * 2 : W - vx - padX;
      const vh = isVert ? 910 : 645;

      ctx.save();

      // =====================================================================
      // SCENE 0 (WHAT IT IS): Theme Poster + 3 Overlapping Friend Polaroids
      // =====================================================================
      if (sKey === 'what_it_is') {
        const posterH = isVert ? 410 : 336;
        drawNeoCard(vx, vy + 6, vw, posterH, 30, '#1b1020', '#ffffff', '#fe04c6', 12, -0.015 * pop);
        drawCoverImage(imgs.cover, vx + 12, vy + 18, vw - 24, posterH - 96, 20);
        ctx.fillStyle = '#fe04c6';
        ctx.font = '900 14px Inter';
        ctx.fillText('100% HUMAN-WRITTEN STORY · AI-TAILORED TO YOUR GROUP', vx + 26, vy + posterH - 46);
        ctx.fillStyle = '#ffffff';
        ctx.font = '900 26px Inter';
        ctx.fillText('NOW PLAYING: LOVE ON THE ROCKS', vx + 26, vy + posterH - 16);

        const cards = [
          { name: 'SARAH', role: 'THE SISTER-IN-LAW', img: imgs.sarah, rot: -0.04 },
          { name: 'JASON', role: 'THE CO-WORKER', img: imgs.jason, rot: 0.015 },
          { name: 'CHLOE', role: 'THE EX-BESTIE', img: imgs.chloe, rot: 0.04 },
        ];
        const cardW = (vw - 36) / 3;
        const cardH = isVert ? 330 : 250;
        const cyBase = vy + posterH + 22;
        cards.forEach((c, idx) => {
          const cp = easeOutBack(clamp((localT - 0.08 * idx) / 0.32));
          const cx = vx + idx * (cardW + 18);
          const cy = cyBase + (1 - cp) * 45 + beatPulse * (idx % 2 === 0 ? 1 : -1);
          drawNeoCard(cx, cy, cardW, cardH, 22, '#ffffff', '#120914', '#fe04c6', 8, c.rot * cp);
          drawCoverImage(c.img, cx + 12, cy + 12, cardW - 24, cardH - 76, 14);
          ctx.fillStyle = '#120914';
          ctx.font = '900 18px Inter';
          ctx.fillText(c.name, cx + 14, cy + cardH - 36);
          ctx.fillStyle = '#fe04c6';
          ctx.font = '900 12px Inter';
          ctx.fillText(c.role, cx + 14, cy + cardH - 16);
        });
      }

      // =====================================================================
      // SCENE 1 (WHAT WE DO · INPUT): Guest Profiles + 4 Spice Levels + Gender-Flex
      // =====================================================================
      if (sKey === 'what_we_do_input') {
        const boxH = isVert ? 470 : 390;
        drawNeoCard(vx, vy + 15, vw, boxH, 30, '#120914', '#120914', '#fe04c6', 14, 0.01 * pop);

        ctx.fillStyle = '#fe04c6';
        ctx.font = '900 15px Inter';
        ctx.fillText('YOUR SAVED GUEST ROSTER · REUSABLE FOR EVERY PARTY', vx + 28, vy + 55);

        const guests = [
          {
            name: 'SARAH · BRITISH ACCENT (EN-GB)',
            look: 'Look: Dark hair, emerald velvet dress, gold statement earrings',
            joke: 'Inside Joke: “Always 15m late holding an espresso martini”',
            img: imgs.sarah,
          },
          {
            name: 'CHLOE · AUSTRALIAN ACCENT (EN-AU)',
            look: 'Look: Curly red hair, gold sequin dress, dark berry lipstick',
            joke: 'Inside Joke: “Still brings up the 2023 Ibiza trip at every dinner”',
            img: imgs.chloe,
          },
        ];

        guests.forEach((g, idx) => {
          const gy = vy + 78 + idx * (isVert ? 180 : 148);
          const gh = isVert ? 162 : 132;
          drawNeoCard(vx + 24, gy, vw - 48, gh, 22, '#ffffff', null, null, 0, 0);
          drawCoverImage(g.img, vx + 38, gy + 14, gh - 28, gh - 28, 16);
          const tx = vx + 54 + (gh - 28);
          ctx.fillStyle = '#120914';
          ctx.font = '900 20px Inter';
          ctx.fillText(g.name, tx, gy + 38);
          ctx.fillStyle = '#fe04c6';
          ctx.font = '700 15px Inter';
          ctx.fillText(g.look, tx, gy + 68);
          ctx.fillStyle = '#52525b';
          ctx.font = '600 15px Inter';
          ctx.fillText(g.joke, tx, gy + 98);
        });

        // 4 Spice Badges Row + Gender-Flex Pill
        const spices = ['✨ CLEAN (SFW)', '🌶️ MILD', '🌶️🌶️ SPICY', '🔥🔥🔥 FILTHY (18+)'];
        const spW = (vw - 36) / 4;
        const spY = vy + boxH + 38;
        spices.forEach((sp, i) => {
          const sx = vx + i * (spW + 12);
          drawNeoCard(sx, spY, spW, 54, 27, i === 2 ? '#fe04c6' : '#120914', '#120914', null, 0, 0);
          ctx.fillStyle = '#ffffff';
          ctx.font = '900 14px Inter';
          ctx.textAlign = 'center';
          ctx.fillText(sp, sx + spW / 2, spY + 33);
          ctx.textAlign = 'left';
        });

        drawNeoCard(vx, spY + 72, vw, 54, 27, '#f8f7fa', '#120914', null, 0, 0);
        ctx.fillStyle = '#120914';
        ctx.font = '900 15px Inter';
        ctx.textAlign = 'center';
        ctx.fillText(
          '✓ BIDIRECTIONAL GENDER-FLEX: ANY ROLE AUTO-ADAPTS TO ANY GUEST GENDER (EVEN 6F HEN PARTIES!)',
          vx + vw / 2,
          spY + 105
        );
        ctx.textAlign = 'left';
      }

      // =====================================================================
      // SCENE 2 (WHAT WE DO · LOOKALIKE CRIME PHOTOS): Guest -> Crime Clue
      // =====================================================================
      if (sKey === 'what_we_do_photos') {
        const pairs = [
          {
            guestName: 'GUEST: SARAH',
            traits: 'Dark hair · Emerald velvet dress · Gold earrings',
            guestImg: imgs.sarah,
            clueTitle: 'GENERATED CLUE PHOTO #1 · FIREPLACE',
            clueSub: 'Sarah caught burning secret documents with Jason!',
            clueImg: imgs.clueSarahFireplace,
            delay: 0.0,
          },
          {
            guestName: 'GUEST: CHLOE',
            traits: 'Curly red hair · Gold sequin dress · Berry lips',
            guestImg: imgs.chloe,
            clueTitle: 'GENERATED CLUE PHOTO #2 · BAR CCTV',
            clueSub: 'Chloe caught spiking the eggnog glass at 8:14 PM!',
            clueImg: imgs.clueChloeDrink,
            delay: 0.14,
          },
        ];

        const rowH = isVert ? 360 : 275;
        const gapY = isVert ? 34 : 26;
        const startY = vy + (vh - (rowH * 2 + gapY)) / 2;

        pairs.forEach((pair, idx) => {
          const rp = easeOutBack(clamp((localT - pair.delay) / 0.34));
          const ry = startY + idx * (rowH + gapY) + (1 - rp) * 45 + beatPulse * (idx === 0 ? 0.6 : -0.6);

          const leftW = vw * 0.36;
          drawNeoCard(vx, ry, leftW, rowH, 24, '#ffffff', '#120914', '#fe04c6', 8, -0.015);
          drawCoverImage(pair.guestImg, vx + 14, ry + 14, leftW - 28, rowH - 86, 16);
          ctx.fillStyle = '#120914';
          ctx.font = '900 17px Inter';
          ctx.fillText(pair.guestName, vx + 16, ry + rowH - 44);
          ctx.fillStyle = '#fe04c6';
          ctx.font = '700 12px Inter';
          wrapText(pair.traits, vx + 16, ry + rowH - 24, leftW - 28, 15);

          const rightX = vx + vw * 0.42;
          const rightW = vw * 0.58;
          drawNeoCard(rightX, ry, rightW, rowH, 24, '#1b1020', '#ffffff', '#fe04c6', 10, 0.01);
          drawCoverImage(pair.clueImg, rightX + 12, ry + 12, rightW - 24, rowH - 82, 16);

          ctx.fillStyle = '#fe04c6';
          roundRect(rightX + 24, ry + 24, 215, 32, 16);
          ctx.fill();
          ctx.fillStyle = '#ffffff';
          ctx.font = '900 12px Inter';
          ctx.fillText('✓ 100% GUEST LOOKALIKE', rightX + 38, ry + 45);

          ctx.fillStyle = '#fe04c6';
          ctx.font = '900 14px Inter';
          ctx.fillText(pair.clueTitle, rightX + 18, ry + rowH - 42);
          ctx.fillStyle = '#ffffff';
          ctx.font = '700 15px Inter';
          ctx.fillText(pair.clueSub, rightX + 18, ry + rowH - 18);

          const arrowX = vx + vw * 0.39;
          const arrowY = ry + rowH / 2;
          ctx.fillStyle = '#fe04c6';
          ctx.beginPath();
          ctx.arc(arrowX, arrowY, 24, 0, Math.PI * 2);
          ctx.fill();
          ctx.lineWidth = 3;
          ctx.strokeStyle = '#ffffff';
          ctx.stroke();
          ctx.fillStyle = '#ffffff';
          ctx.font = '900 22px Inter';
          ctx.textAlign = 'center';
          ctx.fillText('→', arrowX, arrowY + 8);
          ctx.textAlign = 'left';
        });
      }

      // =====================================================================
      // SCENE 3 (WHAT WE DO · LEAKED TEXTS, FORENSICS & VOICE WIRETAPS)
      // =====================================================================
      if (sKey === 'what_we_do_texts_audio') {
        const chatH = isVert ? 360 : 285;
        const chatY = vy + 10 + beatPulse * 0.5;
        drawNeoCard(vx, chatY, vw, chatH, 28, '#120914', '#120914', '#fe04c6', 12, -0.01 * pop);

        ctx.fillStyle = '#fe04c6';
        ctx.font = '900 14px Inter';
        ctx.fillText('LEAKED GROUP CHAT THREAD · 7:32 PM  +  FORENSIC HAIRPIN MATCH', vx + 26, chatY + 36);

        drawCoverImage(imgs.sarah, vx + 26, chatY + 54, 58, 58, 29);
        drawNeoCard(vx + 98, chatY + 50, vw - 290, isVert ? 110 : 88, 18, '#ffffff', null, null, 0, 0);
        ctx.fillStyle = '#fe04c6';
        ctx.font = '900 13px Inter';
        ctx.fillText('SARAH (THE SISTER-IN-LAW)', vx + 116, chatY + 76);
        ctx.fillStyle = '#120914';
        ctx.font = '700 16px Inter';
        wrapText(
          '“Meet me by the fireplace! I grabbed the offshore transfer from Luke’s safe.”',
          vx + 116,
          chatY + 100,
          vw - 320,
          21
        );

        const m2Y = chatY + (isVert ? 176 : 150);
        drawCoverImage(imgs.jason, vx + 26, m2Y + 4, 58, 58, 29);
        drawNeoCard(vx + 98, m2Y, vw - 290, isVert ? 118 : 96, 18, '#fe04c6', null, null, 0, 0);
        ctx.fillStyle = '#120914';
        ctx.font = '900 13px Inter';
        ctx.fillText('JASON (THE CO-WORKER)', vx + 116, m2Y + 26);
        ctx.fillStyle = '#ffffff';
        ctx.font = '700 16px Inter';
        wrapText(
          '“Burn it fast—and don’t drop your silver snowflake hairpin like you did in Ibiza 👀”',
          vx + 116,
          m2Y + 50,
          vw - 320,
          21
        );

        // Right inset inside top card: Forensic Snowflake Hairpin photo
        drawCoverImage(imgs.clueHairpin, vx + vw - 176, chatY + 50, 152, chatH - 72, 18);

        // Bottom Card: AI Voice Wiretap Player
        const audY = chatY + chatH + 26;
        const audH = isVert ? 320 : 250;
        drawNeoCard(vx, audY, vw, audH, 28, '#ffffff', '#120914', '#120914', 12, 0.01 * pop);

        ctx.fillStyle = '#fe04c6';
        ctx.font = '900 14px Inter';
        ctx.fillText('INTERCEPTED VOICEMAIL WIRETAP · SYNTHESIZED IN SARAH’S BRITISH ACCENT', vx + 28, audY + 38);

        const waveX = vx + 28;
        const waveY = audY + 56;
        const waveW = vw - 56;
        const waveH = 74;
        ctx.fillStyle = '#120914';
        roundRect(waveX, waveY, waveW, waveH, 18);
        ctx.fill();

        const numBars = 34;
        const barGap = (waveW - 130) / numBars;
        for (let b = 0; b < numBars; b++) {
          const anim =
            0.3 +
            0.7 * Math.abs(Math.sin(elapsed * 14 + b * 0.45) * Math.cos(elapsed * 9 - b * 0.3));
          const bh = Math.max(10, anim * (waveH - 22));
          const bx = waveX + 26 + b * barGap;
          const by = waveY + (waveH - bh) / 2;
          ctx.fillStyle = b / numBars < localT / active.duration ? '#fe04c6' : 'rgba(255,255,255,0.28)';
          roundRect(bx, by, 7, bh, 3.5);
          ctx.fill();
        }
        ctx.fillStyle = '#ffffff';
        ctx.font = '900 16px monospace';
        ctx.fillText('0:14', waveX + waveW - 76, waveY + 43);

        ctx.fillStyle = '#120914';
        ctx.font = 'italic 800 19px Inter';
        wrapText(
          '“If anyone asks where I was when the lights went out, tell them I was making espresso martinis in the kitchen—do NOT mention the safe!”',
          vx + 28,
          audY + 168,
          vw - 56,
          26
        );
      }

      // =====================================================================
      // SCENE 4 (HOW IT LOOKS · PRE-PARTY MOBILE INVITE): Tabbed Invite + 3 Outfits
      // =====================================================================
      if (sKey === 'how_it_looks_invite') {
        const cardH = isVert ? 620 : 535;
        const cy = vy + (vh - cardH) / 2 + beatPulse * 0.6;
        drawNeoCard(vx, cy, vw, cardH, 32, '#ffffff', '#120914', '#fe04c6', 14, -0.01 * pop);

        // Top Dark Invite Banner (Guest Name main header + Character Role pill!)
        ctx.fillStyle = '#120914';
        roundRect(vx + 20, cy + 20, vw - 40, 148, 24);
        ctx.fill();

        drawCoverImage(imgs.sarah, vx + 38, cy + 34, 116, 120, 18);

        ctx.fillStyle = 'rgba(255,255,255,0.65)';
        ctx.font = '900 13px Inter';
        ctx.fillText('OFFICIAL PRE-PARTY INVITATION · LOVE ON THE ROCKS', vx + 176, cy + 56);

        ctx.fillStyle = '#ffffff';
        ctx.font = '900 42px Inter';
        ctx.fillText('SARAH', vx + 176, cy + 102);

        // Role Pill right next to / below Guest Name
        ctx.fillStyle = '#fe04c6';
        roundRect(vx + 176, cy + 116, 235, 34, 17);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.font = '900 14px Inter';
        ctx.fillText('ROLE: THE SISTER-IN-LAW', vx + 194, cy + 138);

        // 3 Invite Tabs
        const tabs = ['1. OVERVIEW & PARTY DETAILS', '2. YOUR CHARACTER', '3. 3 OUTFIT LOOKS'];
        const tabW = (vw - 64) / 3;
        tabs.forEach((t, i) => {
          const tx = vx + 20 + i * (tabW + 12);
          const ty = cy + 184;
          ctx.fillStyle = i === 2 ? '#fe04c6' : '#f1f1f4';
          roundRect(tx, ty, tabW, 42, 21);
          ctx.fill();
          ctx.fillStyle = i === 2 ? '#ffffff' : '#120914';
          ctx.font = '900 13px Inter';
          ctx.textAlign = 'center';
          ctx.fillText(t, tx + tabW / 2, ty + 26);
          ctx.textAlign = 'left';
        });

        // Party Details + 3 Visual Outfit Looks Row
        const outfits = [
          {
            label: 'LOOK 01 · SIGNATURE',
            title: 'Emerald Velvet Gown',
            desc: 'Floor-length emerald velvet + gold statement earrings',
          },
          {
            label: 'LOOK 02 · COCKTAIL CHIC',
            title: 'Silk Blazer & Snowflake Pin',
            desc: 'Tailored velvet blazer + silver snowflake hairpin',
          },
          {
            label: 'LOOK 03 · AFTER-DARK',
            title: 'Satin Slip & Faux Fur',
            desc: 'Deep green satin slip + dark berry lipstick',
          },
        ];

        const lookW = (vw - 64) / 3;
        const lookY = cy + 244;
        const lookH = cardH - 330;
        outfits.forEach((lk, i) => {
          const lx = vx + 20 + i * (lookW + 12);
          drawNeoCard(lx, lookY, lookW, lookH, 20, '#f8f7fa', '#e4e4e7', null, 0, 0);
          ctx.fillStyle = '#fe04c6';
          ctx.font = '900 12px Inter';
          ctx.fillText(lk.label, lx + 16, lookY + 32);
          ctx.fillStyle = '#120914';
          ctx.font = '900 17px Inter';
          ctx.fillText(lk.title, lx + 16, lookY + 62);
          ctx.fillStyle = '#52525b';
          ctx.font = '600 14px Inter';
          wrapText(lk.desc, lx + 16, lookY + 92, lookW - 32, 20);
        });

        // Bottom Party Details + 1-Tap Calendar Strip
        ctx.fillStyle = '#120914';
        roundRect(vx + 20, cy + cardH - 68, vw - 40, 48, 24);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.font = '900 14px Inter';
        ctx.textAlign = 'center';
        ctx.fillText(
          '📅 SAT 8:00 PM · 42 PORTMAN SQ  ·  ✓ WHAT TO BRING CHECKLIST  ·  + 1-TAP ADD TO CALENDAR',
          vx + vw / 2,
          cy + cardH - 39
        );
        ctx.textAlign = 'left';
      }

      // =====================================================================
      // SCENE 5 (HOW IT LOOKS · PARTY NIGHT LIVE PLAYROOM): Host Laptop + 2 Phones
      // =====================================================================
      if (sKey === 'how_it_looks_live') {
        // Top Card: Host Laptop Live Control Deck
        const hostH = isVert ? 250 : 210;
        drawNeoCard(vx, vy + 10, vw, hostH, 28, '#120914', '#120914', '#fe04c6', 12, -0.01 * pop);

        ctx.fillStyle = '#fe04c6';
        roundRect(vx + 24, vy + 32, 240, 38, 19);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.font = '900 14px Inter';
        ctx.fillText('LIVE GAME PIN · 146 492', vx + 44, vy + 56);

        ctx.fillStyle = '#10b981';
        roundRect(vx + 278, vy + 32, 290, 38, 19);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.fillText('✓ HOST PLAYING SPOILER-FREE', vx + 298, vy + 56);

        ctx.fillStyle = '#ffffff';
        ctx.font = '900 28px Inter';
        ctx.fillText('HOST SCREEN: ROUND 2 INVESTIGATION LIVE', vx + 24, vy + 114);
        ctx.fillStyle = 'rgba(255,255,255,0.8)';
        ctx.font = '600 17px Inter';
        wrapText(
          'Host controls round timers, triggers synchronized audio wiretaps & clue drops, and plays as “The Wife” without ever seeing the solution!',
          vx + 24,
          vy + 148,
          vw - 48,
          24
        );

        // Bottom 2 Phone Cards Side-by-Side: Cast Suspect Phone vs Extra Guest Detective Phone
        const phoneW = (vw - 24) / 2;
        const phoneY = vy + hostH + 34;
        const phoneH = isVert ? 420 : 345;

        // Phone 1: Cast Suspect Phone (Sarah)
        drawNeoCard(vx, phoneY, phoneW, phoneH, 28, '#ffffff', '#120914', '#120914', 10, -0.015 * pop);
        ctx.fillStyle = '#120914';
        roundRect(vx + 20, phoneY + 20, phoneW - 40, 36, 18);
        ctx.fill();
        ctx.fillStyle = '#fe04c6';
        ctx.font = '900 13px Inter';
        ctx.textAlign = 'center';
        ctx.fillText('📱 SUSPECT PHONE · SARAH', vx + phoneW / 2, phoneY + 43);
        ctx.textAlign = 'left';

        ctx.fillStyle = '#120914';
        ctx.font = '900 20px Inter';
        ctx.fillText('ROUND 2 SECRET OBJECTIVES', vx + 22, phoneY + 88);
        ctx.fillStyle = '#52525b';
        ctx.font = '600 15px Inter';
        wrapText(
          '• Defend your 7:55 PM kitchen alibi.\n• Press Jason about the wall safe code.\n• Inspect 3 live crime-scene photos & vote!',
          vx + 22,
          phoneY + 120,
          phoneW - 44,
          24
        );

        ctx.fillStyle = '#fe04c6';
        roundRect(vx + 20, phoneY + phoneH - 64, phoneW - 40, 44, 22);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.font = '900 14px Inter';
        ctx.textAlign = 'center';
        ctx.fillText('CAST ROUND 2 SUSPECT VOTE →', vx + phoneW / 2, phoneY + phoneH - 37);
        ctx.textAlign = 'left';

        // Phone 2: Extra Guest Detective Phone (Detective Liam)
        const p2X = vx + phoneW + 24;
        drawNeoCard(p2X, phoneY, phoneW, phoneH, 28, '#fe04c6', '#120914', '#120914', 10, 0.015 * pop);
        ctx.fillStyle = '#120914';
        roundRect(p2X + 20, phoneY + 20, phoneW - 40, 36, 18);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.font = '900 13px Inter';
        ctx.textAlign = 'center';
        ctx.fillText('🕵️ EXTRA GUEST · DETECTIVE LIAM ($0)', p2X + phoneW / 2, phoneY + 43);
        ctx.textAlign = 'left';

        ctx.fillStyle = '#ffffff';
        ctx.font = '900 20px Inter';
        ctx.fillText('MORE THAN 6 GUESTS?', p2X + 22, phoneY + 88);
        ctx.fillStyle = 'rgba(255,255,255,0.92)';
        ctx.font = '600 15px Inter';
        wrapText(
          'Extra friends scan the same QR code to get an official Detective Briefing, interrogate every suspect, inspect every clue, and vote in every round!',
          p2X + 22,
          phoneY + 120,
          phoneW - 44,
          24
        );

        ctx.fillStyle = '#120914';
        roundRect(p2X + 20, phoneY + phoneH - 64, phoneW - 40, 44, 22);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.font = '900 14px Inter';
        ctx.textAlign = 'center';
        ctx.fillText('UNLIMITED EXTRA DETECTIVES →', p2X + phoneW / 2, phoneY + phoneH - 37);
        ctx.textAlign = 'left';
      }

      // =====================================================================
      // SCENE 6 (HOW IT LOOKS · FINALE & 9:16 DETECTIVE WRAPPED STORY CARD)
      // =====================================================================
      if (sKey === 'how_it_looks_finale') {
        const leftW = vw * 0.54;
        const cardH = isVert ? 540 : 465;
        const cy = vy + (vh - cardH) / 2 + beatPulse * 0.6;

        // Left Card: Killer Unmasked & Vote Leaderboard
        drawNeoCard(vx, cy, leftW, cardH, 28, '#ffffff', '#120914', '#fe04c6', 12, -0.015 * pop);
        ctx.fillStyle = '#fe04c6';
        ctx.font = '900 14px Inter';
        ctx.fillText('ROUND 3 FINALE · THE KILLER IS UNMASKED', vx + 24, cy + 42);
        ctx.fillStyle = '#120914';
        ctx.font = '900 28px Inter';
        ctx.fillText('SARAH WAS THE KILLER!', vx + 24, cy + 80);

        drawCoverImage(imgs.clueSarahFireplace, vx + 24, cy + 100, leftW - 48, isVert ? 230 : 185, 18);

        ctx.fillStyle = '#120914';
        ctx.font = '800 16px Inter';
        wrapText(
          'Caught by the dropped silver snowflake hairpin & the 7:55 PM fireplace document burn!',
          vx + 24,
          cy + (isVert ? 364 : 318),
          leftW - 48,
          23
        );

        ctx.fillStyle = '#10b981';
        roundRect(vx + 24, cy + cardH - 68, leftW - 48, 46, 23);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.font = '900 14px Inter';
        ctx.textAlign = 'center';
        ctx.fillText('🏆 83% OF TABLE VOTED CORRECTLY', vx + leftW / 2, cy + cardH - 40);
        ctx.textAlign = 'left';

        // Right Card: 9:16 Shareable "Detective Wrapped" Instagram Story Card
        const rightX = vx + leftW + 24;
        const rightW = vw - leftW - 24;
        drawNeoCard(rightX, cy, rightW, cardH, 28, '#120914', '#ffffff', '#fe04c6', 12, 0.02 * pop);

        ctx.fillStyle = '#fe04c6';
        roundRect(rightX + 22, cy + 24, rightW - 44, 34, 17);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.font = '900 12px Inter';
        ctx.textAlign = 'center';
        ctx.fillText('📲 9:16 DETECTIVE WRAPPED', rightX + rightW / 2, cy + 46);

        drawCoverImage(imgs.sarah, rightX + (rightW - 120) / 2, cy + 76, 120, 120, 60);

        ctx.fillStyle = '#fe04c6';
        ctx.font = '900 13px Inter';
        ctx.fillText('OFFICIAL PARTY RECAP CARD', rightX + rightW / 2, cy + 226);

        ctx.fillStyle = '#ffffff';
        ctx.font = '900 26px Inter';
        ctx.fillText('TOP SLEUTH', rightX + rightW / 2, cy + 260);
        ctx.fillStyle = '#10b981';
        ctx.font = '900 16px Inter';
        ctx.fillText('✓ NAILED THE KILLER', rightX + rightW / 2, cy + 290);

        ctx.fillStyle = 'rgba(255,255,255,0.75)';
        ctx.font = '600 14px Inter';
        wrapText(
          '1-tap download for every guest to post straight to Instagram Stories & TikTok!',
          rightX + rightW / 2,
          cy + 332,
          rightW - 48,
          20
        );
        ctx.textAlign = 'left';
      }

      // =====================================================================
      // SCENE 7 (OUTRO CTA): £15 / ~£2.50 Per Guest + URL
      // =====================================================================
      if (sKey === 'outro') {
        const cardW = vw;
        const cardH = isVert ? 460 : 395;
        const cy = vy + (vh - cardH) / 2 + beatPulse * 0.7;
        drawNeoCard(vx, cy, cardW, cardH, 32, '#ffffff', '#120914', '#fe04c6', 14, -0.01 * pop);
        drawCoverImage(imgs.cocktail, vx + 16, cy + 16, cardW - 32, cardH - 120, 22);

        ctx.fillStyle = '#fe04c6';
        roundRect(vx + 28, cy + cardH - 84, cardW - 56, 62, 31);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.font = '900 22px Inter';
        ctx.textAlign = 'center';
        ctx.fillText('BUILD YOUR MYSTERY AT BACKPOCKETMYSTERIES.COM →', vx + cardW / 2, cy + cardH - 46);
        ctx.textAlign = 'left';
      }

      ctx.restore();

      // =======================================================================
      // DYNAMIC 2-LINE SYNCED NEO-BRUTALIST CAPTIONS + SPEAKER BADGE
      // =======================================================================
      const captions = active.scene.captions || [['BACK POCKET MYSTERIES', 'HOW IT WORKS']];
      const chunkIdx = localT < active.duration * 0.52 ? 0 : Math.min(1, captions.length - 1);
      const chunkLocalT = chunkIdx === 0 ? localT : localT - active.duration * 0.52;
      const chunkPop = easeOutBack(clamp(chunkLocalT / 0.22));
      const [capLine1, capLine2] = captions[chunkIdx];

      ctx.save();
      const capFontSize = isVert ? 31 : 27;
      ctx.font = '900 ' + capFontSize + 'px Inter';
      const w1 = ctx.measureText(capLine1).width;
      const w2 = ctx.measureText(capLine2).width;
      const boxW = Math.min(W - padX * 2, Math.max(w1, w2) + (isVert ? 88 : 96));
      const boxH = isVert ? 112 : 96;
      const boxX = (W - boxW) / 2;
      const boxY = H - (isVert ? 200 : 134) + (1 - chunkPop) * 14;

      ctx.fillStyle = '#fe04c6';
      roundRect(boxX + 7, boxY + 7, boxW, boxH, 24);
      ctx.fill();

      ctx.fillStyle = '#120914';
      roundRect(boxX, boxY, boxW, boxH, 24);
      ctx.fill();
      ctx.lineWidth = 3.5;
      ctx.strokeStyle = '#ffffff';
      ctx.stroke();

      ctx.textAlign = 'center';
      ctx.fillStyle = '#ffffff';
      ctx.fillText(capLine1, W / 2, boxY + (isVert ? 45 : 39));

      ctx.fillStyle = '#fe04c6';
      ctx.font = 'italic 900 ' + capFontSize + 'px Inter';
      ctx.fillText(capLine2, W / 2, boxY + (isVert ? 86 : 76));
      ctx.textAlign = 'left';

      const prog = clamp(elapsed / totalDuration);
      ctx.fillStyle = '#fe04c6';
      ctx.fillRect(0, H - 12, W * prog, 12);
      ctx.restore();
    }

    // 4. Record Canvas + WebAudio Stream with MediaRecorder
    drawFrame(0);
    await audioCtx.resume();

    const carrierOsc = audioCtx.createOscillator();
    const carrierGain = audioCtx.createGain();
    carrierGain.gain.value = 0.0001;
    carrierOsc.connect(carrierGain);
    carrierGain.connect(masterComp);
    carrierOsc.start();

    const t0 = audioCtx.currentTime + 0.06;

    // Schedule Dual-Voice British Banter Clips + Warm Low-Mid Shelf EQ for Rich Depth
    for (const item of sceneTimeline) {
      const src = audioCtx.createBufferSource();
      src.buffer = item.voBuffer;
      src.playbackRate.value = VO_RATE;

      // Subtle warm low-shelf boost at 190Hz (+3.5dB) so voices sound deep, rich & broadcast-warm
      const warmEq = audioCtx.createBiquadFilter();
      warmEq.type = 'lowshelf';
      warmEq.frequency.setValueAtTime(190, t0 + item.start);
      warmEq.gain.setValueAtTime(3.5, t0 + item.start);

      const voGain = audioCtx.createGain();
      voGain.gain.setValueAtTime(1.18, t0 + item.start);

      src.connect(warmEq);
      warmEq.connect(voGain);
      voGain.connect(masterComp);
      src.start(t0 + item.start + 0.04);

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

    // UPBEAT 128 BPM POP-FUNK GROOVE ENGINE
    const bpm = 128;
    const beatDur = 60 / bpm;
    const step16Dur = beatDur / 4;
    const total16Steps = Math.ceil(totalDuration / step16Dur);

    const bassPattern = [
      110.0, 0, 110.0, 220.0,
      130.81, 0, 146.83, 164.81,
      110.0, 0, 110.0, 196.0,
      164.81, 146.83, 130.81, 146.83,
    ];

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
      videoBitsPerSecond: 4500000,
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
  await ensureDualBritishVoiceovers();
  await Promise.all([
    renderPromoVideo({
      width: 1920,
      height: 1080,
      aspect: '16:9',
      outFilename: 'back-pocket-mysteries-what-it-is-16x9.mp4',
    }),
    renderPromoVideo({
      width: 1080,
      height: 1920,
      aspect: '9:16',
      outFilename: 'back-pocket-mysteries-what-it-is-9x16.mp4',
    }),
  ]);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
