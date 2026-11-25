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

// Dual-Voice British Banter Duo:
// 1. ARCHIE (Deep, Energetic & Dynamic British Male Commercial Voice)
const VOICE_MALE_UK = 'uGA0BTw0auurBhSTFN7g';
// 2. CATE (Resonant, Deep & Confident British Female Voice)
const VOICE_FEMALE_UK = 'J64VNrjLE6uKFBKlxfSJ';

const VO_DIR = 'public/videos/vo-play-online-uk';

export const SCENES = [
  {
    id: 0,
    key: 'global_hook',
    partLabel: '01 · PLAY ANYWHERE',
    speaker: 'ARCHIE 🇬🇧',
    voiceId: VOICE_MALE_UK,
    dark: true,
    kicker: '100% DIGITAL · ZOOM, FACETIME & DISCORD',
    titleLine1: 'MILES APART?',
    titleLine2: 'SAME CRIME SCENE.',
    subtitle:
      'Got friends in different cities, states, or time zones? Turn your next Zoom, FaceTime, or Discord call into a live murder mystery party.',
    voText:
      'Got friends scattered across different cities, states, or time zones? Turn your next Zoom, FaceTime, or Discord call into a live murder mystery party!',
    captions: [
      ['FRIENDS IN DIFFERENT CITIES OR COUNTRIES?', 'TURN ZOOM OR FACETIME INTO A CRIME SCENE!'],
      ['LONDON · NEW YORK · SYDNEY · TORONTO', 'PLAY TOGETHER LIVE FROM ANYWHERE!'],
    ],
  },
  {
    id: 1,
    key: 'cast_real_friends',
    partLabel: '01 · PLAY ANYWHERE',
    speaker: 'CATE 🇬🇧',
    voiceId: VOICE_FEMALE_UK,
    dark: false,
    kicker: 'CUSTOM-BUILT IN ~20 MINUTES · REAL FRIENDS & JOKES',
    titleLine1: 'CAST YOUR MATES',
    titleLine2: 'FROM ANY COUNTRY.',
    subtitle:
      'Add everyone’s look or photo, accent, and group-chat inside jokes. Our engine builds custom character portraits and scripts in ~20 minutes.',
    voText:
      'Because Back Pocket Mysteries is one hundred percent digital, you cast your real mates—with their actual photos and inside jokes—in just twenty minutes!',
    captions: [
      ['100% DIGITAL · BUILT AROUND YOUR MATES', 'THEIR PHOTOS, ACCENTS & INSIDE JOKES!'],
      ['READY TO PLAY IN ~20 MINUTES', 'FROM CLEAN SFW TO 18+ FILTHY SPICE!'],
    ],
  },
  {
    id: 2,
    key: 'group_chat_link',
    partLabel: '02 · ZERO DOWNLOADS',
    speaker: 'ARCHIE 🇬🇧',
    voiceId: VOICE_MALE_UK,
    dark: true,
    kicker: '1 MAGIC GROUP-CHAT LINK · ZERO APP DOWNLOADS',
    titleLine1: 'DROP 1 LINK IN',
    titleLine2: 'THE GROUP CHAT.',
    subtitle:
      'Paste one private invite link into WhatsApp, iMessage, or Discord. Everyone taps their name to unlock their secret bio and waist-up outfit looks.',
    voText:
      'Drop one magic link in the group chat before the call. Everyone taps their name from anywhere in the world to unlock their secret bio and outfit looks—zero app downloads!',
    captions: [
      ['DROP 1 LINK IN THE GROUP CHAT', 'WHATSAPP · IMESSAGE · DISCORD · SLACK'],
      ['EVERY FRIEND UNLOCKS THEIR SECRET BIO', 'ZERO APP DOWNLOADS · ZERO PRINTING!'],
    ],
  },
  {
    id: 3,
    key: 'two_screen_setup',
    partLabel: '02 · ZERO DOWNLOADS',
    speaker: 'CATE 🇬🇧',
    voiceId: VOICE_FEMALE_UK,
    dark: false,
    kicker: 'THE 2-SCREEN SETUP · NO AWKWARD SCREEN-SHARING',
    titleLine1: 'LAPTOP FOR VIDEO.',
    titleLine2: 'PHONE FOR SECRETS.',
    subtitle:
      'Keep Zoom or FaceTime open on your laptop to see everyone’s reactions, and hold your phone as your private detective dossier.',
    voText:
      'On party night, keep Zoom or FaceTime open on your laptop to see everyone’s reactions, and use your phone as your private detective dossier—no awkward screen-sharing or emailing PDFs!',
    captions: [
      ['LAPTOP FOR VIDEO · PHONE FOR SECRETS', 'NO AWKWARD SCREEN-SHARING OR PDFS!'],
      ['PLUS 100% SPOILER-FREE HOST MODE', 'SO THE HOST PLAYS & GUESSES TOO!'],
    ],
  },
  {
    id: 4,
    key: 'global_clue_sync',
    partLabel: '03 · LIVE GLOBAL SYNC',
    speaker: 'ARCHIE 🇬🇧',
    voiceId: VOICE_MALE_UK,
    dark: true,
    kicker: 'REAL-TIME CLOUD PLAYROOM · PHOTOS, TEXTS & AUDIO',
    titleLine1: '1 TAP SYNCS CLUES',
    titleLine2: 'ACROSS THE GLOBE.',
    subtitle:
      'When the host taps Next Round, lookalike crime photos, leaked lock-screen texts, and AI voice wiretaps unlock on every phone simultaneously.',
    voText:
      'When the host taps Next Round, lookalike crime photos, leaked texts, and AI voice wiretaps unlock on every player’s phone across the globe at the exact same second!',
    captions: [
      ['1 TAP SYNCS CLUES ACROSS THE GLOBE', 'CRIME PHOTOS, TEXTS & VOICE WIRETAPS!'],
      ['UNLOCKS ON EVERY PHONE SIMULTANEOUSLY', 'ACROSS EVERY CITY & TIME ZONE!'],
    ],
  },
  {
    id: 5,
    key: 'hybrid_and_cta',
    partLabel: '03 · LIVE GLOBAL SYNC',
    speaker: 'CATE 🇬🇧',
    voiceId: VOICE_FEMALE_UK,
    dark: true,
    kicker: '100% VIRTUAL OR HYBRID IPAD MODE · FROM $19 / £15',
    titleLine1: 'PLAY ONLINE TONIGHT',
    titleLine2: 'WITH YOUR CREW.',
    subtitle: 'backpocketmysteries.com/en/play-online',
    voText:
      'Play one hundred percent virtual, or prop an iPad at the dinner table to call remote friends in! Cast your crew tonight at Back Pocket Mysteries dot com!',
    captions: [
      ['PLAY 100% VIRTUAL OR HYBRID ON IPAD', 'LIVE VOTING & DETECTIVE WRAPPED CARDS!'],
      ['CAST YOUR CREW ONLINE TONIGHT AT', 'BACKPOCKETMYSTERIES.COM →'],
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
  console.log(`\n🎬 Rendering ${aspect} Play Online Promo Video (${width}x${height}) -> ${outFilename}...`);

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
      const dur = voDur + 0.18;
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

      // Top Brand Header Bar + 3-Part Storyboard Progress Pills
      const padX = isVert ? 64 : 104;
      const topY = isVert ? 78 : 64;
      ctx.save();
      ctx.font = '900 26px Inter';
      ctx.fillStyle = '#fe04c6';
      ctx.fillText('BACK POCKET', padX, topY);
      const bpW = ctx.measureText('BACK POCKET ').width;
      ctx.fillStyle = isDarkScene ? '#ffffff' : '#120914';
      ctx.fillText('MYSTERIES', padX + bpW, topY);

      const parts = ['01 · PLAY ANYWHERE', '02 · ZERO DOWNLOADS', '03 · LIVE GLOBAL SYNC'];
      const pillW = isVert ? 176 : 204;
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
      const titleSize = isVert ? 66 : 60;
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
      // SCENE 0: GLOBAL VIDEO CALL GRID ACROSS 4 TIME ZONES
      // =====================================================================
      if (sKey === 'global_hook') {
        const frameH = isVert ? 680 : 560;
        drawNeoCard(vx, vy + 10, vw, frameH, 30, '#1b1020', '#ffffff', '#fe04c6', 14, -0.01 * pop);

        // Laptop Window Top Bar
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.arc(vx + 28, vy + 40, 7, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#f59e0b';
        ctx.beginPath();
        ctx.arc(vx + 50, vy + 40, 7, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#10b981';
        ctx.beginPath();
        ctx.arc(vx + 72, vy + 40, 7, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.font = '900 14px Inter';
        ctx.fillText('💻 LIVE VIDEO CALL · ZOOM / FACETIME / DISCORD', vx + 96, vy + 45);

        ctx.fillStyle = '#10b981';
        roundRect(vx + vw - 220, vy + 24, 196, 30, 15);
        ctx.fill();
        ctx.fillStyle = '#120914';
        ctx.font = '900 12px Inter';
        ctx.textAlign = 'center';
        ctx.fillText('● 4 TIME ZONES LIVE', vx + vw - 122, vy + 43);
        ctx.textAlign = 'left';

        const tiles = [
          {
            name: 'SARAH (THE WIFE)',
            city: '🇬🇧 LONDON · 8:00 PM',
            quote: '“Check the 11:08 PM hallway camera!”',
            img: imgs.sarah,
          },
          {
            name: 'MARCUS (THE BESTIE)',
            city: '🇺🇸 NEW YORK · 3:00 PM',
            quote: '“Why was your earring in the study?!”',
            img: imgs.jason,
          },
          {
            name: 'CHLOE (THE SISTER)',
            city: '🇦🇺 SYDNEY · 7:00 AM',
            quote: '“Play the voice wiretap on your phone!”',
            img: imgs.chloe,
          },
          {
            name: 'GABBY (THE MISTRESS)',
            city: '🇨🇦 TORONTO · 3:00 PM',
            quote: '“I’m locking in my Round 2 vote now!”',
            img: imgs.gabby,
          },
        ];

        const cols = 2;
        const tileW = (vw - 64) / cols;
        const tileH = (frameH - 155) / 2;

        tiles.forEach((t, idx) => {
          const col = idx % 2;
          const row = Math.floor(idx / 2);
          const tp = easeOutBack(clamp((localT - idx * 0.07) / 0.32));
          const tx = vx + 22 + col * (tileW + 20);
          const ty = vy + 70 + row * (tileH + 18) + (1 - tp) * 35;

          drawNeoCard(tx, ty, tileW, tileH, 20, '#ffffff', '#120914', '#fe04c6', 6, 0);
          drawCoverImage(t.img, tx + 10, ty + 10, tileW - 20, tileH - 76, 14);

          // City Badge Overlay
          ctx.fillStyle = 'rgba(18,9,20,0.86)';
          roundRect(tx + 18, ty + 18, 175, 26, 13);
          ctx.fill();
          ctx.fillStyle = '#10b981';
          ctx.font = '900 11px Inter';
          ctx.fillText(t.city, tx + 28, ty + 35);

          ctx.fillStyle = '#120914';
          ctx.font = '900 15px Inter';
          ctx.fillText(t.name, tx + 14, ty + tileH - 42);
          ctx.fillStyle = '#fe04c6';
          ctx.font = '700 12px Inter';
          ctx.fillText(t.quote, tx + 14, ty + tileH - 18);
        });

        // Bottom Platform Bar
        drawNeoCard(vx + 22, vy + frameH - 54, vw - 44, 40, 20, '#fe04c6', null, null, 0, 0);
        ctx.fillStyle = '#ffffff';
        ctx.font = '900 13px Inter';
        ctx.textAlign = 'center';
        ctx.fillText(
          'WORKS WITH ZOOM · APPLE FACETIME · DISCORD · GOOGLE MEET · MICROSOFT TEAMS',
          vx + vw / 2,
          vy + frameH - 29
        );
        ctx.textAlign = 'left';
      }

      // =====================================================================
      // SCENE 1: CAST YOUR REAL MATES FROM ANY COUNTRY
      // =====================================================================
      if (sKey === 'cast_real_friends') {
        const boxH = isVert ? 540 : 450;
        drawNeoCard(vx, vy + 20, vw, boxH, 30, '#120914', '#120914', '#fe04c6', 14, 0.01 * pop);

        ctx.fillStyle = '#fe04c6';
        ctx.font = '900 15px Inter';
        ctx.fillText('GLOBAL CAST BUILDER · AI COSTUME PORTRAITS & INSIDE JOKES', vx + 28, vy + 62);

        const friends = [
          {
            name: 'SARAH (LONDON 🇬🇧) → CAST AS THE WIFE',
            look: 'Look: Dark waves, emerald velvet gown, gold hoop earrings',
            joke: 'Inside Joke: “Still blames the airport lounge prosecco for missing her flight”',
            img: imgs.sarah,
          },
          {
            name: 'CHLOE (SYDNEY 🇦🇺) → CAST AS THE SISTER-IN-LAW',
            look: 'Look: Curly red hair, gold sequin dress, berry lipstick',
            joke: 'Inside Joke: “Joins every FaceTime call in a silk robe holding iced matcha”',
            img: imgs.chloe,
          },
        ];

        friends.forEach((g, idx) => {
          const gy = vy + 86 + idx * (isVert ? 195 : 162);
          const gh = isVert ? 175 : 144;
          drawNeoCard(vx + 24, gy, vw - 48, gh, 22, '#ffffff', null, null, 0, 0);
          drawCoverImage(g.img, vx + 38, gy + 14, gh - 28, gh - 28, 16);
          const tx = vx + 54 + (gh - 28);
          ctx.fillStyle = '#120914';
          ctx.font = '900 18px Inter';
          ctx.fillText(g.name, tx, gy + 38);
          ctx.fillStyle = '#fe04c6';
          ctx.font = '700 14px Inter';
          ctx.fillText(g.look, tx, gy + 68);
          ctx.fillStyle = '#52525b';
          ctx.font = '600 13px Inter';
          wrapText(g.joke, tx, gy + 96, vw - (tx - vx) - 42, 18);
        });

        drawNeoCard(vx + 24, vy + boxH - 60, vw - 48, 46, 23, '#10b981', null, null, 0, 0);
        ctx.fillStyle = '#120914';
        ctx.font = '900 14px Inter';
        ctx.textAlign = 'center';
        ctx.fillText(
          '✓ READY IN ~20 MINUTES · GENDER-FLEX AUTO-ADAPTS TO ANY GROUP MIX!',
          vx + vw / 2,
          vy + boxH - 32
        );
        ctx.textAlign = 'left';
      }

      // =====================================================================
      // SCENE 2: 1 MAGIC LINK IN THE GROUP CHAT · ZERO APP DOWNLOADS
      // =====================================================================
      if (sKey === 'group_chat_link') {
        // Top WhatsApp / iMessage Group Chat Bubble
        const chatH = isVert ? 190 : 155;
        drawNeoCard(vx, vy + 10, vw, chatH, 26, '#ffffff', '#120914', '#fe04c6', 10, -0.01 * pop);

        ctx.fillStyle = '#10b981';
        roundRect(vx + 22, vy + 28, 260, 28, 14);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.font = '900 12px Inter';
        ctx.fillText('💬 WHATSAPP / IMESSAGE GROUP CHAT', vx + 36, vy + 46);

        ctx.fillStyle = '#120914';
        ctx.font = '900 20px Inter';
        ctx.fillText('“Tonight’s Murder Mystery Invite is live! Tap your name:”', vx + 24, vy + 84);

        ctx.fillStyle = '#fe04c6';
        roundRect(vx + 24, vy + 102, vw - 48, 42, 21);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.font = '900 15px Inter';
        ctx.textAlign = 'center';
        ctx.fillText('🔗 backpocketmysteries.com/play/christmas-nightmare?prep=1', vx + vw / 2, vy + 128);
        ctx.textAlign = 'left';

        // 3 Phones Opening Across the World
        const phones = [
          { city: '🇬🇧 LONDON', name: 'SARAH’S IPHONE', sub: 'Secret Bio & 3 Outfit Looks', img: imgs.sarah },
          { city: '🇺🇸 NEW YORK', name: 'MARCUS’S PHONE', sub: 'Secret Alibi & Roast Mission', img: imgs.jason },
          { city: '🇦🇺 SYDNEY', name: 'CHLOE’S IPHONE', sub: 'Pre-Game Gossip & Dress Code', img: imgs.chloe },
        ];
        const pW = (vw - 36) / 3;
        const pH = isVert ? 420 : 345;
        const pyBase = vy + chatH + 34;

        phones.forEach((ph, idx) => {
          const cp = easeOutBack(clamp((localT - 0.09 * idx) / 0.34));
          const px = vx + idx * (pW + 18);
          const py = pyBase + (1 - cp) * 45 + beatPulse * (idx % 2 === 0 ? 0.8 : -0.8);

          drawNeoCard(px, py, pW, pH, 26, '#1b1020', '#ffffff', '#fe04c6', 8, (idx - 1) * 0.02);
          ctx.fillStyle = '#fe04c6';
          roundRect(px + 14, py + 16, pW - 28, 28, 14);
          ctx.fill();
          ctx.fillStyle = '#ffffff';
          ctx.font = '900 12px Inter';
          ctx.textAlign = 'center';
          ctx.fillText(ph.city, px + pW / 2, py + 34);
          ctx.textAlign = 'left';

          drawCoverImage(ph.img, px + 14, py + 54, pW - 28, pH - 135, 16);

          ctx.fillStyle = '#ffffff';
          ctx.font = '900 15px Inter';
          ctx.fillText(ph.name, px + 14, py + pH - 48);
          ctx.fillStyle = '#10b981';
          ctx.font = '700 12px Inter';
          ctx.fillText('✓ ' + ph.sub, px + 14, py + pH - 24);
        });
      }

      // =====================================================================
      // SCENE 3: THE 2-SCREEN SETUP (LAPTOP FOR VIDEO + PHONE FOR SECRETS)
      // =====================================================================
      if (sKey === 'two_screen_setup') {
        const leftW = vw * 0.56;
        const cardH = isVert ? 540 : 450;
        const cy = vy + 24;

        // Left: Laptop Video Call Card
        drawNeoCard(vx, cy, leftW, cardH, 28, '#120914', '#120914', '#fe04c6', 12, -0.015 * pop);
        ctx.fillStyle = '#fe04c6';
        ctx.font = '900 14px Inter';
        ctx.fillText('SCREEN 1 · LAPTOP OR TV (ZOOM / FACETIME)', vx + 22, cy + 40);

        drawCoverImage(imgs.cocktail, vx + 20, cy + 58, leftW - 40, cardH - 170, 18);

        ctx.fillStyle = '#ffffff';
        ctx.font = '900 20px Inter';
        ctx.fillText('SEE EVERYONE’S REACTIONS LIVE', vx + 22, cy + cardH - 72);
        ctx.fillStyle = 'rgba(255,255,255,0.75)';
        ctx.font = '600 13px Inter';
        wrapText(
          'Argue face-to-face in waist-up costumes without ever sharing your screen or emailing PDFs!',
          vx + 22,
          cy + cardH - 44,
          leftW - 44,
          18
        );

        // Right: Smartphone Private Dossier Card
        const rightX = vx + leftW + 24;
        const rightW = vw - leftW - 24;
        drawNeoCard(rightX, cy, rightW, cardH, 28, '#ffffff', '#120914', '#fe04c6', 12, 0.02 * pop);

        ctx.fillStyle = '#120914';
        roundRect(rightX + 20, cy + 20, rightW - 40, 32, 16);
        ctx.fill();
        ctx.fillStyle = '#10b981';
        ctx.font = '900 12px Inter';
        ctx.textAlign = 'center';
        ctx.fillText('📱 SCREEN 2 · YOUR PHONE', rightX + rightW / 2, cy + 40);
        ctx.textAlign = 'left';

        ctx.fillStyle = '#fe04c6';
        ctx.font = '900 14px Inter';
        ctx.fillText('ROOM PIN: 482910', rightX + 22, cy + 82);

        ctx.fillStyle = '#120914';
        ctx.font = '900 22px Inter';
        ctx.fillText('PRIVATE DOSSIER', rightX + 22, cy + 110);

        const items = [
          '🔒 Your Secret Round 1–3 Prompts',
          '📸 Zoomable Crime-Scene Photos',
          '🔊 Playable AI Voice Wiretaps',
          '🗳️ Live Round Theory Voting Ballot',
          '🛡️ 100% Spoiler-Free Host Mode',
        ];
        items.forEach((it, i) => {
          const iy = cy + 134 + i * 54;
          drawNeoCard(rightX + 18, iy, rightW - 36, 44, 14, '#f4f4f6', '#120914', null, 0, 0);
          ctx.fillStyle = '#120914';
          ctx.font = '800 13px Inter';
          ctx.fillText(it, rightX + 30, iy + 27);
        });
      }

      // =====================================================================
      // SCENE 4: 1 TAP SYNCS CLUES, TEXTS & VOICE WIRETAPS ACROSS THE GLOBE
      // =====================================================================
      if (sKey === 'global_clue_sync') {
        // Top Host Controller Banner
        drawNeoCard(vx, vy + 6, vw, 74, 24, '#fe04c6', '#ffffff', '#120914', 8, 0);
        ctx.fillStyle = '#ffffff';
        ctx.font = '900 20px Inter';
        ctx.textAlign = 'center';
        ctx.fillText('⚡ HOST TAPS “ADVANCE TO ROUND 2” → INSTANT GLOBAL CLUE DROP!', vx + vw / 2, vy + 51);
        ctx.textAlign = 'left';

        const clueCards = [
          {
            badge: '📸 LOOKALIKE CCTV PHOTO',
            title: 'FIREPLACE BURN · 7:55 PM',
            sub: 'Rendered to match Sarah’s exact emerald dress & hair!',
            img: imgs.clueSarahFireplace,
          },
          {
            badge: '💬 LEAKED LOCK-SCREEN TEXT',
            title: 'DELETED IMESSAGE THREAD',
            sub: '“If Luke checks the Cayman transfer tonight, we’re done.”',
            img: imgs.clueChloeDrink,
          },
          {
            badge: '🔊 AI VOICE WIRETAP AUDIO',
            title: 'INTERCEPTED VOICEMAIL (0:24)',
            sub: 'Synthesized in each friend’s accent · Tap play on any phone!',
            img: imgs.clueHairpin,
          },
        ];

        const cW = (vw - 36) / 3;
        const cH = isVert ? 440 : 370;
        const cyBase = vy + 104;

        clueCards.forEach((c, idx) => {
          const cp = easeOutBack(clamp((localT - idx * 0.08) / 0.34));
          const cx = vx + idx * (cW + 18);
          const cy = cyBase + (1 - cp) * 45 + beatPulse * (idx === 1 ? -1 : 1);

          drawNeoCard(cx, cy, cW, cH, 24, '#ffffff', '#120914', '#fe04c6', 8, (idx - 1) * 0.015);
          ctx.fillStyle = '#120914';
          roundRect(cx + 14, cy + 14, cW - 28, 28, 14);
          ctx.fill();
          ctx.fillStyle = '#fe04c6';
          ctx.font = '900 11px Inter';
          ctx.textAlign = 'center';
          ctx.fillText(c.badge, cx + cW / 2, cy + 32);
          ctx.textAlign = 'left';

          drawCoverImage(c.img, cx + 14, cy + 52, cW - 28, cH - 150, 14);

          ctx.fillStyle = '#120914';
          ctx.font = '900 15px Inter';
          ctx.fillText(c.title, cx + 14, cy + cH - 66);
          ctx.fillStyle = '#52525b';
          ctx.font = '600 12px Inter';
          wrapText(c.sub, cx + 14, cy + cH - 42, cW - 28, 16);
        });
      }

      // =====================================================================
      // SCENE 5: 100% VIRTUAL OR HYBRID IPAD MODE + FINAL CTA
      // =====================================================================
      if (sKey === 'hybrid_and_cta') {
        const cardH = isVert ? 520 : 440;
        const cy = vy + 24;

        drawNeoCard(vx, cy, vw, cardH, 32, '#ffffff', '#120914', '#fe04c6', 14, -0.01 * pop);

        // Top 2 Mode Cards Inside
        const modeW = (vw - 64) / 2;
        const modeH = isVert ? 190 : 155;

        drawNeoCard(vx + 22, cy + 22, modeW, modeH, 22, '#120914', null, null, 0, 0);
        ctx.fillStyle = '#fe04c6';
        ctx.font = '900 13px Inter';
        ctx.fillText('🌍 MODE 1 · 100% VIRTUAL CALL', vx + 40, cy + 54);
        ctx.fillStyle = '#ffffff';
        ctx.font = '900 19px Inter';
        ctx.fillText('EVERYONE ON ZOOM / FACETIME', vx + 40, cy + 84);
        ctx.fillStyle = 'rgba(255,255,255,0.78)';
        ctx.font = '600 13px Inter';
        wrapText(
          'Connect from 6 different cities or countries with synced mobile dossiers.',
          vx + 40,
          cy + 112,
          modeW - 36,
          18
        );

        const m2X = vx + 42 + modeW;
        drawNeoCard(m2X, cy + 22, modeW, modeH, 22, '#120914', null, null, 0, 0);
        ctx.fillStyle = '#10b981';
        ctx.font = '900 13px Inter';
        ctx.fillText('🛋️ MODE 2 · HYBRID DINNER TABLE', m2X + 18, cy + 54);
        ctx.fillStyle = '#ffffff';
        ctx.font = '900 19px Inter';
        ctx.fillText('CALL REMOTE FRIENDS IN ON IPAD', m2X + 18, cy + 84);
        ctx.fillStyle = 'rgba(255,255,255,0.78)';
        ctx.font = '600 13px Inter';
        wrapText(
          'Friends overseas join the exact same live Room PIN as guests in your living room!',
          m2X + 18,
          cy + 112,
          modeW - 36,
          18
        );

        drawCoverImage(imgs.cover, vx + 22, cy + modeH + 40, vw - 44, cardH - modeH - 135, 20);

        ctx.fillStyle = '#fe04c6';
        roundRect(vx + 24, cy + cardH - 78, vw - 48, 58, 29);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.font = '900 21px Inter';
        ctx.textAlign = 'center';
        ctx.fillText('CAST YOUR FRIENDS ONLINE AT BACKPOCKETMYSTERIES.COM →', vx + vw / 2, cy + cardH - 42);
        ctx.textAlign = 'left';
      }

      ctx.restore();

      // =======================================================================
      // DYNAMIC 2-LINE SYNCED NEO-BRUTALIST CAPTIONS
      // =======================================================================
      const captions = active.scene.captions || [['BACK POCKET MYSTERIES', 'PLAY ONLINE']];
      const chunkIdx = localT < active.duration * 0.52 ? 0 : Math.min(1, captions.length - 1);
      const chunkLocalT = chunkIdx === 0 ? localT : localT - active.duration * 0.52;
      const chunkPop = easeOutBack(clamp(chunkLocalT / 0.22));
      const [capLine1, capLine2] = captions[chunkIdx];

      ctx.save();
      const capFontSize = isVert ? 30 : 26;
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

    drawFrame(0);
    await audioCtx.resume();

    const carrierOsc = audioCtx.createOscillator();
    const carrierGain = audioCtx.createGain();
    carrierGain.gain.value = 0.0001;
    carrierOsc.connect(carrierGain);
    carrierGain.connect(masterComp);
    carrierOsc.start();

    const t0 = audioCtx.currentTime + 0.06;

    for (const item of sceneTimeline) {
      const src = audioCtx.createBufferSource();
      src.buffer = item.voBuffer;
      src.playbackRate.value = VO_RATE;

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
      outFilename: 'back-pocket-mysteries-play-online-16x9.mp4',
    }),
    renderPromoVideo({
      width: 1080,
      height: 1920,
      aspect: '9:16',
      outFilename: 'back-pocket-mysteries-play-online-9x16.mp4',
    }),
  ]);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
