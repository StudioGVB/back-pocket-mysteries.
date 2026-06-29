const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envFile = fs.readFileSync('.env.local', 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    let val = match[2].trim();
    if (val.startsWith('"') && val.endsWith('"')) {
      val = val.substring(1, val.length - 1);
    }
    env[match[1]] = val;
  }
});

const supabase = createClient(
  env['NEXT_PUBLIC_SUPABASE_URL'],
  env['NEXT_PUBLIC_SUPABASE_ANON_KEY']
);

function isCctvOrVideoClue(clue) {
  const title = (clue.title || '').toLowerCase();
  const desc = (clue.description || '').toLowerCase();
  const prompt = (clue.generation_prompt || '').toLowerCase();
  return (
    title.includes('cctv') ||
    title.includes('video') ||
    title.includes('camera') ||
    title.includes('photo') ||
    title.includes('polaroid') ||
    desc.includes('cctv') ||
    desc.includes('security cam') ||
    desc.includes('camera footage') ||
    desc.includes('video footage') ||
    desc.includes('metadata: sec cam') ||
    prompt.includes('cctv') ||
    prompt.includes('security camera') ||
    prompt.includes('surveillance')
  );
}

function isAudioClue(clue) {
  const title = (clue.title || '').toLowerCase();
  const desc = (clue.description || '').toLowerCase();
  const prompt = (clue.generation_prompt || '').toLowerCase();
  return (
    title.includes('audio') ||
    title.includes('voice note') ||
    title.includes('recorded') ||
    title.includes('recording') ||
    title.includes('clip') ||
    title.includes('sound') ||
    desc.includes('🎙️') ||
    desc.includes('audio recording') ||
    desc.includes('voice note') ||
    prompt.includes('microphone') ||
    prompt.includes('soundboard') ||
    prompt.includes('audio recorder')
  );
}

function isScreenClue(clue) {
  const title = (clue.title || '').toLowerCase();
  const desc = (clue.description || '').toLowerCase();
  const prompt = (clue.generation_prompt || '').toLowerCase();
  return (
    title.includes('smartphone') ||
    title.includes('phone') ||
    title.includes('text') ||
    title.includes('chat') ||
    title.includes('dm') ||
    title.includes('sms') ||
    title.includes('screen') ||
    title.includes('email') ||
    title.includes('message') ||
    title.includes('whatsapp') ||
    title.includes('imessage') ||
    desc.includes('chat thread') ||
    desc.includes('text message') ||
    desc.includes('dm thread') ||
    desc.includes('private dm') ||
    prompt.includes('phone') ||
    prompt.includes('screen') ||
    prompt.includes('chat') ||
    prompt.includes('message')
  );
}

async function run() {
  const { data: clues, error } = await supabase
    .from('clues')
    .select('*')
    .eq('mystery_id', '69b65a91-1cc2-4267-94a4-59297428af28');

  if (error) {
    console.error('Error:', error);
    return;
  }

  clues.forEach(c => {
    const isAudio = isAudioClue(c);
    const isCctv = isCctvOrVideoClue(c) && !isAudio;
    const isScreen = isScreenClue(c) && !isAudio && !isCctv;

    console.log(`Clue: "${c.title}"`);
    console.log(`- Type: ${isAudio ? 'AUDIO' : isCctv ? 'CCTV' : isScreen ? 'SCREEN' : 'OTHER'}`);
    console.log(`- Original Prompt: "${c.generation_prompt}"`);
    console.log('------------------------------------------------');
  });
}

run();
