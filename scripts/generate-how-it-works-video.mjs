import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const puppeteer = require('/Users/gabriellablyth/.npm/_npx/0f94ee7615faf582/node_modules/puppeteer-core');

if (fs.existsSync('.env.local')) {
  for (const line of fs.readFileSync('.env.local', 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) {
      process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '');
    }
  }
}

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY?.trim();
const VOICE_ID = 'XuvMi7mpVgif9dcUzS0s';

export const SCENES = [
  {
    id: 0,
    stepNum: 'INTRO',
    kicker: 'HUMAN-CRAFTED · AI-TAILORED IN ~20 MINS',
    titleLine1: 'FROM YOUR GROUP CHAT',
    titleLine2: 'TO CRIME SCENE.',
    subtitle: 'How Back Pocket Mysteries works — start to party night in 6 simple steps.',
    voText:
      'Want to host a murder mystery party actually built around your real friends? Here is how Back Pocket Mysteries works in six simple steps.',
  },
  {
    id: 1,
    stepNum: '01',
    kicker: 'STEP 01 · BEFORE THE PARTY',
    titleLine1: 'CREATE YOUR',
    titleLine2: 'GUESTS.',
    subtitle: 'Add your friends’ names, photos, accents, and real-life inside jokes.',
    voText:
      'Step one: Create your guests. Add your friends’ names, photos, accents, and inside jokes so the story feels unmistakably like your crowd.',
  },
  {
    id: 2,
    stepNum: '02',
    kicker: 'STEP 02 · CHOOSE THE VIBE',
    titleLine1: 'PICK YOUR',
    titleLine2: 'MYSTERY THEME.',
    subtitle: '100% human-written plots with watertight clue logic & 4 spice levels.',
    voText:
      'Step two: Pick your mystery theme. Every storyline is written by a human mystery author with watertight clue logic and four spice levels.',
  },
  {
    id: 3,
    stepNum: '03',
    kicker: 'STEP 03 · MATCH YOUR CREW',
    titleLine1: 'ASSIGN YOUR',
    titleLine2: 'CAST.',
    subtitle: 'Match friends to iconic roles with Gender-Flex & Spoiler-Free Host Mode.',
    voText:
      'Step three: Assign your cast. Match your friends to iconic character roles—with automatic gender-flex casting and spoiler-free host mode so you can play too.',
  },
  {
    id: 4,
    stepNum: '04',
    kicker: 'STEP 04 · READY IN ~20 MINUTES',
    titleLine1: 'GENERATE CUSTOM',
    titleLine2: 'CLUES.',
    subtitle: 'Custom costume portraits, CCTV photos of your friends, leaked DMs & voice wiretaps.',
    voText:
      'Step four: Generate your custom mystery in twenty minutes—complete with crime-scene CCTV photos of your friends, leaked text threads, and voice-acted audio wiretaps.',
  },
  {
    id: 5,
    stepNum: '05',
    kicker: 'STEP 05 · BUILD THE HYPE',
    titleLine1: 'INVITE YOUR',
    titleLine2: 'FRIENDS.',
    subtitle: 'Drop 1 link in the group chat so everyone sees their role blurb & outfit guide.',
    voText:
      'Step five: Invite your friends before the night. Drop one link into the group chat so everyone gets their spoiler-free character blurb and outfit guide.',
  },
  {
    id: 6,
    stepNum: '06',
    kicker: 'STEP 06 · PARTY NIGHT',
    titleLine1: 'LAUNCH LIVE',
    titleLine2: 'GAME MODE.',
    subtitle: 'Host controls rounds on a laptop · Guests get clues & vote on phones (+ Extra Detectives!).',
    voText:
      'Step six: Launch Live Game Mode when everyone arrives. You control the rounds from your laptop while guests get live clues and vote on their phones—and extra friends can join on the spot as Detective!',
  },
  {
    id: 7,
    stepNum: 'OUTRO',
    kicker: 'READY IN ~20 MINUTES · FROM £15 / $19',
    titleLine1: 'PUT YOUR FRIENDS IN',
    titleLine2: 'THE CRIME SCENE.',
    subtitle: 'backpocketmysteries.com',
    voText: 'Build your custom mystery today at Back Pocket Mysteries dot com.',
  },
];

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
    fs.readFileSync(path.resolve(`public/videos/vo/scene-${s.id}.mp3`)).toString('base64')
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

    // 2. Setup AudioContext & decode ElevenLabs VO buffers
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 44100 });
    const audioDest = audioCtx.createMediaStreamDestination();

    const voBuffers = [];
    for (const b64 of window.VO_B64) {
      const bin = atob(b64);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      const decoded = await audioCtx.decodeAudioData(bytes.buffer.slice(0));
      voBuffers.push(decoded);
    }

    // Compute exact scene timeline from VO durations + 0.45s breathing room
    const sceneTimeline = [];
    let cursor = 0;
    for (let i = 0; i < window.SCENES.length; i++) {
      const dur = voBuffers[i].duration + 0.55;
      sceneTimeline.push({
        scene: window.SCENES[i],
        voBuffer: voBuffers[i],
        start: cursor,
        duration: dur,
        end: cursor + dur,
      });
      cursor += dur;
    }
    const totalDuration = cursor;

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
      // Hard offset shadow
      if (shadowCol) {
        ctx.fillStyle = shadowCol;
        roundRect(-w / 2 + shadowOff, -h / 2 + shadowOff, w, h, r);
        ctx.fill();
      }
      // Main body
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
      const localT = elapsed - active.start;
      const p = clamp(localT / 0.65);
      const enter = easeOutCubic(p);
      const pop = easeOutBack(clamp(localT / 0.7));
      const sIdx = active.scene.id;
      const isDarkScene = sIdx === 0 || sIdx === 6 || sIdx === 7;

      // Background
      ctx.fillStyle = isDarkScene ? '#120914' : '#ffffff';
      ctx.fillRect(0, 0, W, H);

      // Subtle dot grid texture
      ctx.fillStyle = isDarkScene ? 'rgba(255,255,255,0.04)' : 'rgba(18,9,20,0.04)';
      const stepGrid = 44;
      for (let gx = 24; gx < W; gx += stepGrid) {
        for (let gy = 24; gy < H; gy += stepGrid) {
          ctx.fillRect(gx, gy, 2.5, 2.5);
        }
      }

      // Top Brand Header Bar
      const padX = isVert ? 68 : 110;
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
      const copyY = isVert ? 210 : 250;
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
      const titleSize = isVert ? 74 : sIdx === 0 || sIdx === 7 ? 76 : 72;
      ctx.font = '900 ' + titleSize + 'px Inter';
      ctx.fillStyle = isDarkScene ? '#ffffff' : '#120914';
      ctx.fillText(active.scene.titleLine1, copyX, copyY + titleSize + 14);

      ctx.font = 'italic 900 ' + titleSize + 'px Inter';
      ctx.fillStyle = '#fe04c6';
      ctx.fillText(active.scene.titleLine2, copyX, copyY + titleSize * 2 + 22);

      // Subtitle
      ctx.font = '600 ' + (isVert ? 28 : 25) + 'px Inter';
      ctx.fillStyle = isDarkScene ? 'rgba(255,255,255,0.82)' : '#52525b';
      wrapText(
        active.scene.subtitle,
        copyX,
        copyY + titleSize * 2 + (isVert ? 76 : 70),
        copyMaxW,
        isVert ? 38 : 36
      );
      ctx.restore();

      // Visual Stage Region (Right side on 16:9, Bottom half on 9:16)
      const vx = isVert ? padX : W * 0.52;
      const vy = isVert ? 670 : 195;
      const vw = isVert ? W - padX * 2 : W - vx - padX;
      const vh = isVert ? 860 : 650;

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
            delay: 0.14,
          },
          {
            name: 'CHLOE',
            trait: '“Still brings up the 2023 Ibiza trip”',
            img: imgs.chloe,
            rot: 0.06,
            delay: 0.28,
          },
        ];
        const cardW = isVert ? (vw - 36) / 3 : (vw - 44) / 3;
        const cardH = cardW * 1.48;
        cards.forEach((c, idx) => {
          const cp = easeOutBack(clamp((localT - c.delay) / 0.6));
          const cx = vx + idx * (cardW + 18);
          const cy = vy + (vh - cardH) / 2 + (idx === 1 ? 22 : 0) + (1 - cp) * 70;
          ctx.save();
          ctx.globalAlpha = clamp((localT - c.delay) / 0.35);
          ctx.translate(cx + cardW / 2, cy + cardH / 2);
          ctx.rotate(c.rot * cp);
          // Shadow
          ctx.fillStyle = isDarkScene ? '#fe04c6' : '#120914';
          roundRect(-cardW / 2 + 10, -cardH / 2 + 10, cardW, cardH, 24);
          ctx.fill();
          // Card
          ctx.fillStyle = '#ffffff';
          roundRect(-cardW / 2, -cardH / 2, cardW, cardH, 24);
          ctx.fill();
          ctx.lineWidth = 3.5;
          ctx.strokeStyle = '#120914';
          ctx.stroke();

          // Photo
          const imgH = cardH * 0.68;
          drawCoverImage(c.img, -cardW / 2 + 14, -cardH / 2 + 14, cardW - 28, imgH, 16);

          // Name & Quirk
          ctx.fillStyle = '#120914';
          ctx.font = '900 20px Inter';
          ctx.fillText(c.name, -cardW / 2 + 16, -cardH / 2 + imgH + 44);
          ctx.fillStyle = '#64748b';
          ctx.font = '600 13px Inter';
          wrapText(c.trait, -cardW / 2 + 16, -cardH / 2 + imgH + 66, cardW - 32, 17);
          ctx.restore();
        });
      }

      // SCENE 2: Theme Poster Card + 4 Spice Level Pills
      if (sIdx === 2) {
        const cardW = vw;
        const cardH = isVert ? 540 : 440;
        const cy = vy + (vh - cardH) / 2 - 20 + (1 - pop) * 50;
        drawNeoCard(vx, cy, cardW, cardH, 32, '#120914', '#120914', '#fe04c6', 14, -0.02 * pop);
        drawCoverImage(imgs.cover, vx + 12, cy + 12, cardW - 24, cardH - 110, 22);

        ctx.fillStyle = '#fe04c6';
        ctx.font = '900 15px Inter';
        ctx.fillText('HUMAN-ARCHITECED PLOT · WATERTIGHT CLUES', vx + 28, cy + cardH - 58);
        ctx.fillStyle = '#ffffff';
        ctx.font = '900 32px Inter';
        ctx.fillText('LOVE ON THE ROCKS', vx + 28, cy + cardH - 22);

        // 4 Spice Badges Row
        const spices = ['CLEAN (SFW)', 'MILD', 'SPICY', 'FILTHY (18+)'];
        const spW = (cardW - 36) / 4;
        spices.forEach((sp, i) => {
          const sx = vx + i * (spW + 12);
          const sy = cy + cardH + 34;
          drawNeoCard(sx, sy, spW, 54, 27, i === 2 ? '#fe04c6' : '#120914', '#120914', null, 0, 0);
          ctx.fillStyle = '#ffffff';
          ctx.font = '900 15px Inter';
          ctx.textAlign = 'center';
          ctx.fillText(sp, sx + spW / 2, sy + 33);
          ctx.textAlign = 'left';
        });
      }

      // SCENE 3: Assign Your Cast Stack
      if (sIdx === 3) {
        const cardW = vw;
        const cardH = isVert ? 540 : 470;
        const cy = vy + (vh - cardH) / 2;
        drawNeoCard(vx, cy, cardW, cardH, 32, '#f8f7fa', '#120914', '#120914', 14, 0.015 * pop);

        const rows = [
          { guest: 'Sarah', role: 'THE SISTER-IN-LAW', tag: 'SUSPECT', img: imgs.sarah },
          { guest: 'Gabby', role: 'THE WIFE', tag: 'HOST PLAYING', img: imgs.gabby },
          { guest: 'Jason', role: 'THE CO-WORKER', tag: 'SUSPECT', img: imgs.jason },
        ];
        rows.forEach((r, idx) => {
          const rp = easeOutBack(clamp((localT - idx * 0.14) / 0.55));
          const rx = vx + 28 + (1 - rp) * 60;
          const ry = cy + 32 + idx * 138;
          const rw = cardW - 56;
          const rh = 116;
          drawNeoCard(rx, ry, rw, rh, 22, '#ffffff', '#e4e4e7', null, 0, 0);
          drawCoverImage(r.img, rx + 16, ry + 14, 88, 88, 16);

          ctx.fillStyle = '#120914';
          ctx.font = '900 24px Inter';
          ctx.fillText(r.guest, rx + 124, ry + 66);
          const gw = ctx.measureText(r.guest).width;

          ctx.fillStyle = '#fe04c6';
          ctx.fillText('  →  ' + r.role, rx + 124 + gw, ry + 66);

          // Right tag pill
          ctx.fillStyle = r.tag === 'HOST PLAYING' ? '#fe04c6' : '#120914';
          roundRect(rx + rw - 170, ry + 38, 148, 40, 20);
          ctx.fill();
          ctx.fillStyle = '#ffffff';
          ctx.font = '900 13px Inter';
          ctx.textAlign = 'center';
          ctx.fillText(r.tag, rx + rw - 96, ry + 63);
          ctx.textAlign = 'left';
        });
      }

      // SCENE 4: Generate Custom Clues (CCTV + Overlapping Leaked Text Bubble)
      if (sIdx === 4) {
        const cardW = vw;
        const cctvH = isVert ? 420 : 360;
        const cy = vy + 40;
        drawNeoCard(vx, cy, cardW, cctvH, 30, '#120914', '#120914', '#120914', 12, -0.02 * pop);
        drawCoverImage(imgs.cctv, vx + 10, cy + 10, cardW - 20, cctvH - 20, 22);

        // REC Timestamp overlay
        ctx.fillStyle = 'rgba(18,9,20,0.88)';
        roundRect(vx + 28, cy + 28, 290, 44, 12);
        ctx.fill();
        ctx.fillStyle = '#fe04c6';
        ctx.font = '900 16px monospace';
        ctx.fillText('● REC · CAM 02 · 19:55:14', vx + 44, cy + 56);

        // Overlapping iMessage Card
        const msgP = easeOutBack(clamp((localT - 0.22) / 0.55));
        const mx = vx + 36;
        const my = cy + cctvH - 55 + (1 - msgP) * 50;
        const mw = cardW - 44;
        const mh = 185;
        drawNeoCard(mx, my, mw, mh, 26, '#ffffff', '#120914', '#fe04c6', 12, 0.015 * msgP);

        ctx.fillStyle = '#fe04c6';
        ctx.font = '900 15px Inter';
        ctx.fillText('LEAKED TEXT THREAD · 7:32 PM  ·  + AI VOICE WIRETAPS', mx + 28, my + 44);
        ctx.fillStyle = '#120914';
        ctx.font = '800 22px Inter';
        wrapText(
          '“Meet me by the coat closet before dinner. Someone left a printed bank transfer in Luke’s coat pocket...”',
          mx + 28,
          my + 86,
          mw - 56,
          32
        );
      }

      // SCENE 5: Pre-Party Character Invite Card
      if (sIdx === 5) {
        const cardW = vw;
        const cardH = isVert ? 480 : 410;
        const cy = vy + (vh - cardH) / 2;
        drawNeoCard(vx, cy, cardW, cardH, 32, '#120914', '#120914', '#fe04c6', 14, -0.015 * pop);

        drawCoverImage(imgs.sarah, vx + 34, cy + 36, 130, 165, 20);

        ctx.fillStyle = '#fe04c6';
        ctx.font = '900 15px Inter';
        ctx.fillText('PRE-PARTY CHARACTER INVITE · FOR SARAH', vx + 190, cy + 64);

        ctx.fillStyle = '#ffffff';
        ctx.font = '900 34px Inter';
        ctx.fillText('ROLE: THE SISTER-IN-LAW', vx + 190, cy + 110);

        ctx.fillStyle = 'rgba(255,255,255,0.82)';
        ctx.font = '600 21px Inter';
        wrapText(
          'What to Wear: Sleek winter chic — an emerald silk dress or tailored velvet blazer, silver snowflake hairpin, and dark berry lipstick.',
          vx + 190,
          cy + 152,
          cardW - 224,
          30
        );

        // Bottom 1-Click Share Pill
        ctx.fillStyle = '#fe04c6';
        roundRect(vx + 34, cy + cardH - 86, cardW - 68, 56, 28);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.font = '900 18px Inter';
        ctx.textAlign = 'center';
        ctx.fillText('SHARED VIA 1-CLICK GROUP CHAT LINK  →', vx + cardW / 2, cy + cardH - 51);
        ctx.textAlign = 'left';
      }

      // SCENE 6: Launch Live Game Mode + Extra Guest Detective Sarah
      if (sIdx === 6) {
        const cardW = vw;
        const cardH = isVert ? 500 : 430;
        const cy = vy + (vh - cardH) / 2;
        drawNeoCard(vx, cy, cardW, cardH, 32, '#fe04c6', '#ffffff', '#ffffff', 12, 0.015 * pop);

        ctx.fillStyle = '#120914';
        roundRect(vx + 32, cy + 32, 260, 46, 23);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.font = '900 16px Inter';
        ctx.fillText('LIVE GAME PIN · 146 492', vx + 54, cy + 61);

        ctx.fillStyle = '#ffffff';
        ctx.font = '900 17px Inter';
        ctx.textAlign = 'right';
        ctx.fillText('6/6 CAST + 2 EXTRA DETECTIVES', vx + cardW - 36, cy + 61);
        ctx.textAlign = 'left';

        // Inner Dark Detective Card
        const inX = vx + 32;
        const inY = cy + 104;
        const inW = cardW - 64;
        const inH = cardH - 138;
        drawNeoCard(inX, inY, inW, inH, 24, '#120914', null, null, 0, 0);

        ctx.fillStyle = '#fe04c6';
        ctx.font = '900 16px Inter';
        ctx.fillText('HAVE MORE THAN 6 GUESTS? · $0 EXTRA', inX + 32, inY + 48);

        ctx.fillStyle = '#ffffff';
        ctx.font = '900 36px Inter';
        ctx.fillText('JOIN AS “DETECTIVE SARAH” →', inX + 32, inY + 98);

        ctx.fillStyle = 'rgba(255,255,255,0.82)';
        ctx.font = '600 21px Inter';
        wrapText(
          'Extra friends scan the QR code on their phone to get an official Detective Briefing, interrogate suspects, inspect every live clue drop, and vote in every round!',
          inX + 32,
          inY + 144,
          inW - 64,
          31
        );
      }

      // SCENE 7: Outro Finale Card
      if (sIdx === 7) {
        const cardW = vw;
        const cardH = isVert ? 460 : 390;
        const cy = vy + (vh - cardH) / 2;
        drawNeoCard(vx, cy, cardW, cardH, 32, '#ffffff', '#120914', '#fe04c6', 14, -0.01 * pop);
        drawCoverImage(imgs.cocktail, vx + 16, cy + 16, cardW - 32, cardH - 120, 22);

        ctx.fillStyle = '#fe04c6';
        roundRect(vx + 28, cy + cardH - 84, cardW - 56, 62, 31);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.font = '900 22px Inter';
        ctx.textAlign = 'center';
        ctx.fillText('BUILD YOUR MYSTERY AT BACKPOCKETMYSTERIES.COM →', vx + cardW / 2, cy + cardH - 45);
        ctx.textAlign = 'left';
      }

      ctx.restore();

      // Bottom Caption / Subtitle Pill + Timeline Progress Bar
      const capY = H - (isVert ? 145 : 88);
      ctx.save();
      ctx.font = '700 ' + (isVert ? 24 : 21) + 'px Inter';
      const voCaption = active.scene.voText;
      ctx.fillStyle = isDarkScene ? 'rgba(255,255,255,0.12)' : 'rgba(18,9,20,0.92)';
      const capW = W - padX * 2;
      roundRect(padX, capY - 36, capW, isVert ? 74 : 54, 27);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.fillText(
        voCaption.length > 108 ? voCaption.slice(0, 108) + '…' : voCaption,
        W / 2,
        capY - (isVert ? -6 : 2)
      );
      ctx.textAlign = 'left';

      // Progress Bar at very bottom edge
      const prog = clamp(elapsed / totalDuration);
      ctx.fillStyle = '#fe04c6';
      ctx.fillRect(0, H - 10, W * prog, 10);
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
    carrierGain.connect(audioDest);
    carrierOsc.start();

    // Schedule VO clips + subtle upbeat lounge bass pulse
    const t0 = audioCtx.currentTime + 0.05;
    for (const item of sceneTimeline) {
      const src = audioCtx.createBufferSource();
      src.buffer = item.voBuffer;
      const voGain = audioCtx.createGain();
      voGain.gain.setValueAtTime(1.0, t0 + item.start);
      src.connect(voGain);
      voGain.connect(audioDest);
      src.start(t0 + item.start + 0.18);

      // Subtle transition whoosh/chime at scene boundary
      const osc = audioCtx.createOscillator();
      const g = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25, t0 + item.start);
      osc.frequency.exponentialRampToValueAtTime(659.25, t0 + item.start + 0.18);
      g.gain.setValueAtTime(0.04, t0 + item.start);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + item.start + 0.25);
      osc.connect(g);
      g.connect(audioDest);
      osc.start(t0 + item.start);
      osc.stop(t0 + item.start + 0.26);
    }

    // Subtle soft background pulse (116 BPM) at low volume under VO
    const beatInterval = 60 / 116;
    const notes = [110, 110, 130.81, 146.83];
    for (let b = 0; b * beatInterval < totalDuration; b++) {
      const bt = t0 + b * beatInterval;
      const osc = audioCtx.createOscillator();
      const g = audioCtx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(notes[b % notes.length], bt);
      g.gain.setValueAtTime(0.028, bt);
      g.gain.exponentialRampToValueAtTime(0.001, bt + beatInterval * 0.85);
      osc.connect(g);
      g.connect(audioDest);
      osc.start(bt);
      osc.stop(bt + beatInterval * 0.9);
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
      audioBitsPerSecond: 128000,
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
