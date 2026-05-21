import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const supabase = await createClient();
    
    // 1. Get authenticated user session
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return new NextResponse(
        JSON.stringify({ 
          success: false, 
          error: 'Unauthorized', 
          message: 'Please make sure you are logged into the Back Pocket Mysteries application first, then refresh this page!' 
        }), 
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    console.log('API Seeder: Seeding circus mystery for authenticated user:', user.id);

    // 2. Delete any existing circus mysteries with the same title to ensure a clean slate
    const { data: existingMysteries } = await supabase
      .from('mysteries')
      .select('id')
      .eq('title', "The Ringmaster's Last Bow")
      .eq('created_by', user.id);

    if (existingMysteries && existingMysteries.length > 0) {
      console.log(`API Seeder: Found ${existingMysteries.length} existing duplicate mysteries. Deleting...`);
      for (const m of existingMysteries) {
        // Cascade delete manually to respect RLS and foreign key constraints
        await supabase.from('relationships').delete().eq('mystery_id', m.id);
        await supabase.from('motives').delete().eq('mystery_id', m.id);
        await supabase.from('clues').delete().eq('mystery_id', m.id);
        
        // Cascade subplot beats manually first
        const { data: subs } = await supabase.from('subplots').select('id').eq('mystery_id', m.id);
        if (subs && subs.length > 0) {
          const subIds = subs.map(s => s.id);
          await supabase.from('subplot_beats').delete().in('subplot_id', subIds);
        }
        await supabase.from('subplots').delete().eq('mystery_id', m.id);
        await supabase.from('plot_beats').delete().eq('mystery_id', m.id);
        await supabase.from('characters').delete().eq('mystery_id', m.id);
        await supabase.from('mysteries').delete().eq('id', m.id);
      }
    }

    // 3. Create the Mystery with exactly 12 players
    const { data: mystery, error: mysteryError } = await supabase
      .from('mysteries')
      .insert({
        title: "The Ringmaster's Last Bow",
        theme: "Retro Circus Noir",
        status: 'draft',
        min_players: 12,
        max_players: 12,
        complexity: 'medium',
        spice_level: 'mild',
        description: "Under the striped canvas of the Grand Pavilion Circus, the lights are bright, but the shadows are deadly. Tonight, the domineering ringmaster Barnaby Frost was found dead inside the lion's cage, but the lion wasn't the killer. One of the tight-knit circus performers has blood on their hands—and the show must not go on until the truth is revealed.",
        created_by: user.id,
        inside_jokes: "Remember: never trust a mime, and always watch your pockets!"
      })
      .select()
      .single();

    if (mysteryError || !mystery) {
      console.error('API Seeder: Error creating mystery:', mysteryError);
      return NextResponse.json({ success: false, error: mysteryError?.message || 'Failed to create mystery' }, { status: 500 });
    }

    // 4. Create the 12 Characters
    // We insert individually to hold their newly created database IDs for relationships, motives, subplots, etc.
    
    // Barnaby Frost (Victim)
    const { data: barnaby, error: char1Err } = await supabase
      .from('characters')
      .insert({
        mystery_id: mystery.id,
        name: "Barnaby Frost|The Ringmaster|Victim",
        gender: "male",
        is_victim: true,
        plot_role: "victim",
        archetype: "victim",
        is_mandatory: true,
        profile_data: {
          bio: "The towering, loud, and domineering Ringmaster of the Grand Pavilion Circus. He ruled with a gold-tipped cane and an unyielding greed, running the circus into massive debt while shortchanging the performers. He was found dead in the lion's cage just before the midnight gala.",
          outfit_advice: "A magnificent red tailcoat with gold brocade, tall velvet top hat, high leather riding boots, and a gleaming gold-tipped cane.",
          act_summary: "Be domineering, speak in a deep booming voice, and constantly demand perfection from everyone in the cast.",
          act_bullets: [
            "Wield your gold-tipped cane with dramatic sweeps.",
            "Demand that 'the show must go on' no matter what.",
            "Look down your nose at anyone who questions your authority."
          ],
          traits: ["Domineering", "Greedy", "Charismatic", "Ruthless"]
        }
      })
      .select()
      .single();

    if (char1Err || !barnaby) {
      console.error('API Seeder: Error creating Barnaby:', char1Err);
      return NextResponse.json({ success: false, error: char1Err?.message || 'Failed to create Barnaby' }, { status: 500 });
    }

    // Madame Zara (Fortune Teller - Killer)
    const { data: zara, error: char2Err } = await supabase
      .from('characters')
      .insert({
        mystery_id: mystery.id,
        name: "Madame Zara|The Fortune Teller|Suspect",
        gender: "female",
        is_victim: false,
        plot_role: "killer",
        archetype: "villain",
        is_mandatory: true,
        profile_data: {
          bio: "The enigmatic, velvet-draped Fortune Teller. Beneath her heavy gold rings and silk scarves lies a deep-seated grievance: she was once Barnaby's romantic partner, but he stole her life savings to buy out the circus and abandoned her to the sidelines. Tonight, she took her ultimate revenge.",
          outfit_advice: "Flowing velvet robes in deep purple and emerald, silk turbans, layered gold bead necklaces, and heavy rings on every finger.",
          act_summary: "Speak in low, cryptic whispers. Frequently look at hands and speak of doom.",
          act_bullets: [
            "Dramatically shuffle a deck of tarot cards.",
            "Stare into people's eyes as if peering into their souls.",
            "Speak of 'the threads of fate' and impending catastrophe."
          ],
          traits: ["Cryptic", "Enigmatic", "Resentful", "Mysterious"]
        }
      })
      .select()
      .single();

    if (char2Err || !zara) {
      console.error('API Seeder: Error creating Zara:', char2Err);
      return NextResponse.json({ success: false, error: char2Err?.message || 'Failed to create Zara' }, { status: 500 });
    }

    // Silas (Clown - Accomplice)
    const { data: silas, error: char3Err } = await supabase
      .from('characters')
      .insert({
        mystery_id: mystery.id,
        name: "Silas|The Sad Clown|Suspect",
        gender: "male",
        is_victim: false,
        plot_role: "assistant",
        archetype: "sidekick",
        is_mandatory: true,
        profile_data: {
          bio: "The sorrowful, silent white-faced clown. Secretly, he is Barnaby's younger half-brother, forced to perform humiliating slapstick while Barnaby kept all the profit and fame. Out of bitter jealousy, Silas helped Madame Zara cover up the crime by locking the lion's cage and hiding the key.",
          outfit_advice: "A baggy, oversized black-and-white polka dot jumpsuit, a ruffled white neck collar, white face paint with a single painted tear.",
          act_summary: "Exude a quiet, melancholic sadness. Speak slowly and sigh often.",
          act_bullets: [
            "Carry a single wilted daisy and look at it sorrowfully.",
            "Perform small, silent shrugs or sad gestures instead of shouting.",
            "Sigh heavily before answering questions."
          ],
          traits: ["Melancholic", "Observant", "Loyal", "Bitter"]
        }
      })
      .select()
      .single();

    if (char3Err || !silas) {
      console.error('API Seeder: Error creating Silas:', char3Err);
      return NextResponse.json({ success: false, error: char3Err?.message || 'Failed to create Silas' }, { status: 500 });
    }

    // Zephyr (Trapeze - Adaptable Suspect)
    const { data: zephyr, error: char4Err } = await supabase
      .from('characters')
      .insert({
        mystery_id: mystery.id,
        name: "Zephyr|The Trapeze Star|Suspect",
        gender: "adaptable",
        is_victim: false,
        plot_role: "innocent",
        archetype: "hero",
        is_mandatory: true,
        profile_data: {
          bio: "The breathtaking, gravity-defying Trapeze Star who performs without a net. Behind the glamorous jumpsuits is a dark secret: Barnaby has been blackmailing them about a tragic rigging accident in their past. They lived in constant fear of their career ending.",
          presentation_female: {
            bio: "The breathtaking, gravity-defying Trapeze Empress. Barnaby blackmailed her over a rigging accident, holding her career in his hands.",
            outfit_advice: "A shimmering silver sequined leotard, glittery hair accessories, and athletic wraps on wrists.",
            act_summary: "Exude elegant grace but show visible anxiety when Barnaby is mentioned.",
            act_bullets: [
              "Adopt straight, athletic postures.",
              "Nervously check the wraps on your wrists.",
              "Fidget with hair accessories when under pressure."
            ]
          },
          presentation_male: {
            bio: "The breathtaking, gravity-defying Trapeze Emperor. Barnaby blackmailed him over a rigging accident, holding his career in his hands.",
            outfit_advice: "A shimmering silver sequined aerialist unitard, white wrist wraps, and sleek athletic slippers.",
            act_summary: "Exude elegant athletic grace but show visible anxiety when Barnaby is mentioned.",
            act_bullets: [
              "Adopt proud, straight postures.",
              "Nervously tighten the wraps on your wrists.",
              "Pace back and forth with athletic elegance when under pressure."
            ]
          },
          traits: ["Graceful", "Anxious", "Determined", "Athletic"]
        }
      })
      .select()
      .single();

    if (char4Err || !zephyr) {
      console.error('API Seeder: Error creating Zephyr:', char4Err);
      return NextResponse.json({ success: false, error: char4Err?.message || 'Failed to create Zephyr' }, { status: 500 });
    }

    // Jax (Fire Juggler - Suspect)
    const { data: jax, error: char5Err } = await supabase
      .from('characters')
      .insert({
        mystery_id: mystery.id,
        name: "Jax|The Fire Juggler|Suspect",
        gender: "male",
        is_victim: false,
        plot_role: "innocent",
        archetype: "investigator",
        is_mandatory: true,
        profile_data: {
          bio: "The hot-headed, daredevil Fire Juggler who thrives on danger. Barnaby cut his pay in half and gave his prime time-slot away. Jax was heard screaming at Barnaby earlier that night, threatening to 'burn the circus to the ground.'",
          outfit_advice: "A sleeveless black leather vest with flame motifs, charcoal-stained trousers, leather fingerless gloves, and protective goggles.",
          act_summary: "Be energetic, fiery, and impatient. Speak quickly and tap your fingers.",
          act_bullets: [
            "Constantly twirl or toss a small juggling prop.",
            "Glower at authority figures and speak passionately.",
            "Mention how things would be better if they 'just burned it all down.'"
          ],
          traits: ["Hot-headed", "Rebellious", "Daredevil", "Impatient"]
        }
      })
      .select()
      .single();

    if (char5Err || !jax) {
      console.error('API Seeder: Error creating Jax:', char5Err);
      return NextResponse.json({ success: false, error: char5Err?.message || 'Failed to create Jax' }, { status: 500 });
    }

    // Gigi (Strongwoman - Suspect)
    const { data: gigi, error: char6Err } = await supabase
      .from('characters')
      .insert({
        mystery_id: mystery.id,
        name: "Beatrix 'Gigi' Laurent|The Strongwoman|Suspect",
        gender: "female",
        is_victim: false,
        plot_role: "innocent",
        archetype: "witness",
        is_mandatory: true,
        profile_data: {
          bio: "The circus Strongwoman, famous for bending iron bars. She suffered a severe shoulder injury when a poorly maintained rigging rope snapped. Barnaby refused to pay for her medical treatment, leaving her desperate and filled with greed to secure a buyout.",
          outfit_advice: "A leopard-print sash over a strong canvas jumpsuit, heavy leather wrist cuffs, and simulated iron weights.",
          act_summary: "Exude immense physical confidence and speak in a direct, blunt tone.",
          act_bullets: [
            "Occasionally flex your shoulders or adjust your wrist cuffs.",
            "Refuse to take nonsense from anyone.",
            "Constantly mention how physical strength solves problems."
          ],
          traits: ["Strong", "Blunt", "Proud", "Desperate"]
        }
      })
      .select()
      .single();

    if (char6Err || !gigi) {
      console.error('API Seeder: Error creating Gigi:', char6Err);
      return NextResponse.json({ success: false, error: char6Err?.message || 'Failed to create Gigi' }, { status: 500 });
    }

    // Lucius Vane (Magician - Suspect)
    const { data: lucius, error: char7Err } = await supabase
      .from('characters')
      .insert({
        mystery_id: mystery.id,
        name: "Lucius Vane|The Magician|Suspect",
        gender: "male",
        is_victim: false,
        plot_role: "innocent",
        archetype: "witness",
        is_mandatory: true,
        profile_data: {
          bio: "The slick, charismatic Illusionist and escape artist. Known for his lock-picking stunts, he was caught by Barnaby earlier tonight right outside the ringmaster's private safe. Barnaby threatened to expose him as a common thief and fraud.",
          outfit_advice: "A sharp black tuxedo with velvet lapels, a black bow tie, a white pocket square, and a hidden deck of cards in your sleeves.",
          act_summary: "Be charming, smooth, and slightly theatrical. Speak with a refined cadence.",
          act_bullets: [
            "Dramatically perform small coin tricks or card flourishes.",
            "Smile mysteriously and dodge direct questions.",
            "Adjust your cuffs and lapels with theatrical poise."
          ],
          traits: ["Slick", "Charismatic", "Theatrical", "Clever"]
        }
      })
      .select()
      .single();

    if (char7Err || !lucius) {
      console.error('API Seeder: Error creating Lucius:', char7Err);
      return NextResponse.json({ success: false, error: char7Err?.message || 'Failed to create Lucius' }, { status: 500 });
    }

    // Seraphina Gray (Lion Tamer - Suspect)
    const { data: seraphina, error: char8Err } = await supabase
      .from('characters')
      .insert({
        mystery_id: mystery.id,
        name: "Seraphina Gray|The Lion Tamer|Suspect",
        gender: "female",
        is_victim: false,
        plot_role: "innocent",
        archetype: "hero",
        is_mandatory: true,
        profile_data: {
          bio: "The fierce and compassionate Lion Tamer. Highly animal-loving, she was absolutely disgusted by Barnaby's cruel training methods and neglect of the big cats. She was determined to seek justice and free the animals from his tyranny.",
          outfit_advice: "A green military-style jacket with brass buttons, high riding boots, and a decorative leather whip slung over your shoulder.",
          act_summary: "Be bold, fierce, and protective. Speak with absolute authority.",
          act_bullets: [
            "Hold a decorative whip and tap it against your boot.",
            "Glare coldly at anyone who behaves cruelly.",
            "Speak passionately about animal welfare and justice."
          ],
          traits: ["Fierce", "Bold", "Compassionate", "Protective"]
        }
      })
      .select()
      .single();

    if (char8Err || !seraphina) {
      console.error('API Seeder: Error creating Seraphina:', char8Err);
      return NextResponse.json({ success: false, error: char8Err?.message || 'Failed to create Seraphina' }, { status: 500 });
    }

    // Professor Thaddeus (Doctor - Suspect)
    const { data: thaddeus, error: char9Err } = await supabase
      .from('characters')
      .insert({
        mystery_id: mystery.id,
        name: "Professor Thaddeus|The Circus Doctor|Suspect",
        gender: "male",
        is_victim: false,
        plot_role: "innocent",
        archetype: "investigator",
        is_mandatory: true,
        profile_data: {
          bio: "The eccentric, nervous Circus Doctor and apothecary. Barnaby discovered Thaddeus was writing illegal prescriptions for sleeping drafts to support his chemistry experiments. Barnaby blackmailed Thaddeus into supplying him with rare poison extracts.",
          outfit_advice: "A dusty tweed suit, round wire-rimmed glasses, a stethoscope peeking out of a pocket, and a leather doctor's satchel filled with bottles.",
          act_summary: "Be nervous, intellectual, and constantly mutter scientific names.",
          act_bullets: [
            "Nervously push your glasses up your nose.",
            "Clutch your satchel as if protecting its contents.",
            "Mutter about dosages, symptoms, and chemicals when asked questions."
          ],
          traits: ["Eccentric", "Nervous", "Intellectual", "Paranoid"]
        }
      })
      .select()
      .single();

    if (char9Err || !thaddeus) {
      console.error('API Seeder: Error creating Thaddeus:', char9Err);
      return NextResponse.json({ success: false, error: char9Err?.message || 'Failed to create Thaddeus' }, { status: 500 });
    }

    // Penny Lane (Acrobat - Suspect)
    const { data: penny, error: char10Err } = await supabase
      .from('characters')
      .insert({
        mystery_id: mystery.id,
        name: "Penelope 'Penny' Lane|The Acrobat|Suspect",
        gender: "female",
        is_victim: false,
        plot_role: "innocent",
        archetype: "sidekick",
        is_mandatory: true,
        profile_data: {
          bio: "A young, naive acrobatic dancer. Barnaby manipulated her with promises of putting her name in lights, leading her to believe he was in love with her. Tonight, she found out he was engaged to be married to his wealthy ex-wife, breaking her heart.",
          outfit_advice: "A bright pink ruffled tutu, ballet satin slippers with laces wrapped up the ankles, and glittery face makeup.",
          act_summary: "Be bubbly and naive, but occasionally burst into tragic sniffling.",
          act_bullets: [
            "Nervously spin or stand on your tiptoes.",
            "Look around wide-eyed and speak in a soft, high-pitched voice.",
            "Dab your eyes with a lace handkerchief when distressed."
          ],
          traits: ["Naive", "Bubbly", "Heartbroken", "Expressive"]
        }
      })
      .select()
      .single();

    if (char10Err || !penny) {
      console.error('API Seeder: Error creating Penny:', char10Err);
      return NextResponse.json({ success: false, error: char10Err?.message || 'Failed to create Penny' }, { status: 500 });
    }

    // Rory Vance (Barker - Adaptable Suspect)
    const { data: rory, error: char11Err } = await supabase
      .from('characters')
      .insert({
        mystery_id: mystery.id,
        name: "Rory Vance|The Ring Barker|Suspect",
        gender: "adaptable",
        is_victim: false,
        plot_role: "innocent",
        archetype: "witness",
        is_mandatory: true,
        profile_data: {
          bio: "The booming, loud Ring Barker who calls guests into the show. They discovered Barnaby was systematically skimming the circus's pension fund, leaving the retired performers penniless.",
          presentation_female: {
            bio: "The booming Ring Barker who discovered Barnaby's embezzlement of the pension fund, leaving her furious.",
            outfit_advice: "A striped waistcoat, a brass megaphone, black bowler hat, and a pocket watch.",
            act_summary: "Speak with a loud, theatrical voice, treating every conversation like a show.",
            act_bullets: [
              "Speak using grandiose showman adjectives.",
              "Nervously check your pocket watch.",
              "Point dramatically when making an accusation."
            ]
          },
          presentation_male: {
            bio: "The booming Ring Barker who discovered Barnaby's embezzlement of the pension fund, leaving him furious.",
            outfit_advice: "A striped waistcoat, a brass megaphone, black bowler hat, and a pocket watch.",
            act_summary: "Speak with a loud, theatrical voice, treating every conversation like a show.",
            act_bullets: [
              "Speak using grandiose showman adjectives.",
              "Nervously check your pocket watch.",
              "Point dramatically when making an accusation."
            ]
          },
          traits: ["Loud", "Theatrical", "Observant", "Righteous"]
        }
      })
      .select()
      .single();

    if (char11Err || !rory) {
      console.error('API Seeder: Error creating Rory:', char11Err);
      return NextResponse.json({ success: false, error: char11Err?.message || 'Failed to create Rory' }, { status: 500 });
    }

    // Mimi Le Grand (High-Wire - Suspect)
    const { data: mimi, error: char12Err } = await supabase
      .from('characters')
      .insert({
        mystery_id: mystery.id,
        name: "Mimi Le Grand|The High-Wire Star|Suspect",
        gender: "female",
        is_victim: false,
        plot_role: "innocent",
        archetype: "villain",
        is_mandatory: true,
        profile_data: {
          bio: "The glamorous, calculating High-Wire walker. Barnaby's ex-wife and co-owner. Tonight, she confronted him with divorce papers demanding sole ownership of the circus, threatening to expose his financial crimes if he didn't sign.",
          outfit_advice: "A gorgeous silk robe with feather trim, a diamond tiara, high-heeled velvet slippers, and a feathered hand fan.",
          act_summary: "Be incredibly glamorous, haughty, and demanding. Treat others as your servants.",
          act_bullets: [
            "Fan yourself slowly with a feathered hand fan.",
            "Speak with a slow, bored drawl.",
            "Look down at other people's clothes with disapproval."
          ],
          traits: ["Glamorous", "Calculating", "Haughty", "Demanding"]
        }
      })
      .select()
      .single();

    if (char12Err || !mimi) {
      console.error('API Seeder: Error creating Mimi:', char12Err);
      return NextResponse.json({ success: false, error: char12Err?.message || 'Failed to create Mimi' }, { status: 500 });
    }

    console.log('API Seeder: Successfully created 12 characters.');

    // 5. Create Motives (strictly using valid database enums: revenge, greed, love, fear, justice, power)
    const { error: motivesErr } = await supabase
      .from('motives')
      .insert([
        {
          mystery_id: mystery.id,
          character_id: zara.id,
          motive_type: 'revenge',
          strength: 'critical',
          linked_character_id: barnaby.id,
          notes: "Barnaby stole her savings to buy out the circus and abandoned her romantic partnership years ago. Tonight was her final vengeance."
        },
        {
          mystery_id: mystery.id,
          character_id: silas.id,
          motive_type: 'revenge',
          strength: 'moderate',
          linked_character_id: barnaby.id,
          notes: "Tired of being forced to perform humiliating slapstick for no pay while Barnaby took all the credit and fame."
        },
        {
          mystery_id: mystery.id,
          character_id: zephyr.id,
          motive_type: 'fear',
          strength: 'critical',
          linked_character_id: barnaby.id,
          notes: "Barnaby discovered she was responsible for the past rigging accident and blackmailed her, threatening to destroy her aerial career."
        },
        {
          mystery_id: mystery.id,
          character_id: jax.id,
          motive_type: 'revenge',
          strength: 'moderate',
          linked_character_id: barnaby.id,
          notes: "Barnaby cut his salary in half and gave his prime time-slot away. Jax sought revenge to restore his financial security."
        },
        {
          mystery_id: mystery.id,
          character_id: gigi.id,
          motive_type: 'greed',
          strength: 'high',
          linked_character_id: barnaby.id,
          notes: "Needs cash to pay for her severe shoulder injury medical bills, which Barnaby refused to pay despite snapping his ropes."
        },
        {
          mystery_id: mystery.id,
          character_id: lucius.id,
          motive_type: 'fear',
          strength: 'moderate',
          linked_character_id: barnaby.id,
          notes: "Barnaby caught Lucius near his private safe, threatening to expose him as a lock-picking thief and fraud to the entire cast."
        },
        {
          mystery_id: mystery.id,
          character_id: seraphina.id,
          motive_type: 'justice',
          strength: 'high',
          linked_character_id: barnaby.id,
          notes: "Determined to stop Barnaby's cruel training whips and poor care of the circus's big cats, seeking justice for the animals."
        },
        {
          mystery_id: mystery.id,
          character_id: thaddeus.id,
          motive_type: 'fear',
          strength: 'moderate',
          linked_character_id: barnaby.id,
          notes: "Barnaby blackmailed Thaddeus over illegal apothecary prescriptions, forcing him to supply chemical formulas and poisons."
        },
        {
          mystery_id: mystery.id,
          character_id: penny.id,
          motive_type: 'love',
          strength: 'high',
          linked_character_id: barnaby.id,
          notes: "Felt manipulated and heartbroken when she discovered that Barnaby was secretly proposing to reunite with his wealthy ex-wife."
        },
        {
          mystery_id: mystery.id,
          character_id: rory.id,
          motive_type: 'justice',
          strength: 'moderate',
          linked_character_id: barnaby.id,
          notes: "Discovered Barnaby was systematically stealing the pension fund of the retired performers, leaving them penniless."
        },
        {
          mystery_id: mystery.id,
          character_id: mimi.id,
          motive_type: 'power',
          strength: 'critical',
          linked_character_id: barnaby.id,
          notes: "Wanted sole ownership and full control of the Grand Pavilion Circus, demanding Barnaby sign over all his shares."
        }
      ]);

    if (motivesErr) {
      console.error('API Seeder: Error creating motives:', motivesErr);
      return NextResponse.json({ success: false, error: motivesErr.message }, { status: 500 });
    }

    // 6. Create Relationships (Explicitly setting know_each_other: true and sorting character UUIDs alphabetically)
    const relationshipsToCreate = [
      // Victim Barnaby Frost Connections (Ensuring the victim is connected to EVERY suspect!)
      { char1: barnaby, char2: zara, dynamics: ['romantic', 'rivals'], notes: "Secret past lovers; now bitter enemies due to Barnaby's greed." },
      { char1: barnaby, char2: silas, dynamics: ['family', 'rivals'], notes: "Biological half-brothers; Silas is bitter about being forced into slapstick." },
      { char1: barnaby, char2: zephyr, dynamics: ['co-workers'], notes: "Barnaby blackmails Zephyr over her past trapeze rigging accident." },
      { char1: barnaby, char2: jax, dynamics: ['co-workers', 'rivals'], notes: "Barnaby skimmed Jax's juggler ticket revenues, causing massive screaming matches." },
      { char1: barnaby, char2: gigi, dynamics: ['co-workers'], notes: "Barnaby refused Gigi's injury medical coverage after a rope snapped." },
      { char1: barnaby, char2: lucius, dynamics: ['co-workers'], notes: "Barnaby caught Lucius near his safe, threatening to brand him a thief." },
      { char1: barnaby, char2: seraphina, dynamics: ['co-workers', 'rivals'], notes: "Seraphina despised Barnaby's cruel whip training and treatment of lions." },
      { char1: barnaby, char2: thaddeus, dynamics: ['friends', 'co-workers'], notes: "Thaddeus is his personal doctor, blackmailed into prescribing chemical drugs." },
      { char1: barnaby, char2: penny, dynamics: ['romantic', 'co-workers'], notes: "Barnaby manipulated Penny into believing he loved her to keep her performing." },
      { char1: barnaby, char2: rory, dynamics: ['co-workers'], notes: "Rory found out Barnaby was embezzling the retired performer pensions." },
      { char1: barnaby, char2: mimi, dynamics: ['married', 'rivals'], notes: "Ex-spouses and co-owners; Mimi demanded sole ownership of the circus." },

      // Inter-Suspect Connections (Creating a rich social web of relationships)
      { char1: zara, char2: silas, dynamics: ['besties'], notes: "Silas confides in Zara, who predicts a dark fate for his brother." },
      { char1: zara, char2: jax, dynamics: ['co-workers'], notes: "Zara reads tarot cards to Jax and guides his risky stunts." },
      { char1: jax, char2: gigi, dynamics: ['besties'], notes: "Lifting partners; Jax fire-proofed Gigi's weights." },
      { char1: lucius, char2: mimi, dynamics: ['co-workers', 'rivals'], notes: "Showmanship rivals; they constantly fight over the spotlight." },
      { char1: seraphina, char2: silas, dynamics: ['friends'], notes: "They share a quiet love for the animals and hate Barnaby's whip." },
      { char1: rory, char2: thaddeus, dynamics: ['besties'], notes: "Drinking buddies who gossip about circus finances and health." },
      { char1: penny, char2: zephyr, dynamics: ['besties'], notes: "Zephyr mentors Penny in acrobatic grace; Penny trusts Zephyr completely." }
    ];

    const sortedRelationships = relationshipsToCreate.map(rel => {
      const [a, b] = [rel.char1.id, rel.char2.id].sort();
      return {
        mystery_id: mystery.id,
        character_a_id: a,
        character_b_id: b,
        know_each_other: true,
        dynamics: rel.dynamics,
        notes: rel.notes
      };
    });

    const { error: relsErr } = await supabase
      .from('relationships')
      .insert(sortedRelationships);

    if (relsErr) {
      console.error('API Seeder: Error creating relationships:', relsErr);
      return NextResponse.json({ success: false, error: relsErr.message }, { status: 500 });
    }

    console.log('API Seeder: Successfully created all relationships with alphabetical ID sorting.');

    // 7. Create Plot Beats
    const { data: beat1, error: b1Err } = await supabase.from('plot_beats').insert({
      mystery_id: mystery.id,
      beat_number: 1,
      event_title: "The Grand Entrance Feast",
      description: "The circus performers gather in the dining pavilion. Barnaby Frost makes a booming announcement that he is selling off the circus animals, causing massive outrage and bitter fights across the cast.",
      characters_involved: [barnaby.name.split('|')[0], mimi.name.split('|')[0], seraphina.name.split('|')[0], zara.name.split('|')[0], silas.name.split('|')[0]],
      is_required: true
    }).select().single();

    const { data: beat2, error: b2Err } = await supabase.from('plot_beats').insert({
      mystery_id: mystery.id,
      beat_number: 2,
      event_title: "A Scream in the Starlight",
      description: "At midnight, a terrifying scream echoes from the animal tents. Jax and Silas run to investigate and discover Barnaby Frost's lifeless body locked inside the lion's cage, but the lion is sleeping quietly in the corner.",
      characters_involved: [barnaby.name.split('|')[0], jax.name.split('|')[0], silas.name.split('|')[0], seraphina.name.split('|')[0]],
      is_required: true
    }).select().single();

    const { data: beat3, error: b3Err } = await supabase.from('plot_beats').insert({
      mystery_id: mystery.id,
      beat_number: 3,
      event_title: "The Poisoned Brandy Decanter",
      description: "Professor Thaddeus examines the body, noticing the sharp scent of bitter almonds (cyanide). Nearby, Lucius Vane discovers a shattered crystal decanter smelling of the exact same chemicals.",
      characters_involved: [thaddeus.name.split('|')[0], lucius.name.split('|')[0], zara.name.split('|')[0]],
      is_required: true
    }).select().single();

    const { data: beat4, error: b4Err } = await supabase.from('plot_beats').insert({
      mystery_id: mystery.id,
      beat_number: 4,
      event_title: "The Burning Ledger Scraps",
      description: "Ring Barker Rory Vance spots Zephyr burning papers in a metal tin behind the trapeze rigging. Rory retrieves a charred fragment—it is a portion of Barnaby's private financial ledgers showing massive debt skimming.",
      characters_involved: [rory.name.split('|')[0], zephyr.name.split('|')[0], penny.name.split('|')[0], gigi.name.split('|')[0]],
      is_required: true
    }).select().single();

    if (b1Err || b2Err || b3Err || b4Err || !beat1 || !beat2 || !beat3 || !beat4) {
      console.error('API Seeder: Error creating plot beats:', { b1Err, b2Err, b3Err, b4Err });
      return NextResponse.json({ success: false, error: 'Failed to create plot beats' }, { status: 500 });
    }

    // 8. Create Clues
    const { error: cluesErr } = await supabase
      .from('clues')
      .insert([
        {
          mystery_id: mystery.id,
          title: "The Oiled Lion Cage Key",
          clue_type: 'physical',
          implication_type: 'circumstantial',
          round_number: 1,
          is_essential: true,
          linked_plot_beat_id: beat2.id,
          description: "A heavy iron key smeared with aerialist silk grease, found stuffed inside the bottom of the sad clown's makeup trunk."
        },
        {
          mystery_id: mystery.id,
          title: "The Tarot Card of Death",
          clue_type: 'secret',
          implication_type: 'red_herring',
          round_number: 2,
          is_essential: false,
          linked_plot_beat_id: beat1.id,
          description: "A card of Death tucked inside Barnaby's vest pocket, with Madame Zara's cryptic handwriting on the back: 'Tonight, the final curtain falls.'"
        },
        {
          mystery_id: mystery.id,
          title: "The Shattered Brandy Decanter",
          clue_type: 'physical',
          implication_type: 'direct',
          round_number: 2,
          is_essential: true,
          linked_plot_beat_id: beat3.id,
          description: "Crystal fragments smelling strongly of bitter almonds (cyanide). Thaddeus was blackmailed into extracting this poison from peach kernels."
        },
        {
          mystery_id: mystery.id,
          title: "The Burnt Ledger Fragment",
          clue_type: 'physical',
          implication_type: 'direct',
          round_number: 3,
          is_essential: true,
          linked_plot_beat_id: beat4.id,
          description: "Charred paper scraps showing Barnaby's skimming of performer pensions and the payouts relating to Zephyr's past rigging accident."
        },
        {
          mystery_id: mystery.id,
          title: "The Broken Safe Lockbox",
          clue_type: 'physical',
          implication_type: 'red_herring',
          round_number: 1,
          is_essential: false,
          linked_plot_beat_id: beat3.id,
          description: "Barnaby's safe was pried open. Lucius Vane's signature lockpick was found bent nearby, but the money envelopes inside were left completely untouched."
        },
        {
          mystery_id: mystery.id,
          title: "A Torn Feather Boa Trim",
          clue_type: 'physical',
          implication_type: 'circumstantial',
          round_number: 3,
          is_essential: false,
          linked_plot_beat_id: beat2.id,
          description: "A fancy scrap of white feather trim caught on the lion cage lock, matching the glamorous boa Mimi Le Grand wore during her argument."
        }
      ]);

    if (cluesErr) {
      console.error('API Seeder: Error creating clues:', cluesErr);
      return NextResponse.json({ success: false, error: cluesErr.message }, { status: 500 });
    }

    // 9. Create Subplot ("The Safe-Cracking Pact" between Jax and Lucius)
    const { data: subplot, error: subErr } = await supabase
      .from('subplots')
      .insert({
        mystery_id: mystery.id,
        title: "The Safe-Cracking Pact",
        description: "Jax and Lucius Vane conspired to crack Barnaby's desk safe during the midnight show to recover the fire juggling ticket ledger and Lucius's pawned escape handcuffs.",
        primary_character_id: jax.id,
        secondary_character_id: lucius.id,
        theme: "greed"
      })
      .select()
      .single();

    if (subErr || !subplot) {
      console.error('API Seeder: Error creating subplot:', subErr);
      return NextResponse.json({ success: false, error: subErr?.message || 'Failed to create subplot' }, { status: 500 });
    }

    // 10. Create Subplot Beats
    const { error: subBeatsErr } = await supabase
      .from('subplot_beats')
      .insert([
        {
          subplot_id: subplot.id,
          beat_number: 1,
          description: "Jax asks Lucius to pick the safe lock. Lucius agrees but gets cold feet when he hears footsteps near the pavilion.",
          linked_plot_beat_id: beat1.id
        },
        {
          subplot_id: subplot.id,
          beat_number: 2,
          description: "Lucius is caught near the desk safe. Jax covers for him, claiming Lucius was performing a magic prop inspection.",
          linked_plot_beat_id: beat3.id
        }
      ]);

    if (subBeatsErr) {
      console.error('API Seeder: Error creating subplot beats:', subBeatsErr);
      return NextResponse.json({ success: false, error: subBeatsErr.message }, { status: 500 });
    }

    console.log('API Seeder: Seeding completed successfully! Mystery ID:', mystery.id);

    // 11. Return beautiful success response with direct compile redirect links
    return new NextResponse(
      JSON.stringify({
        success: true,
        message: "12-Character Circus Murder Mystery seeded successfully!",
        mysteryId: mystery.id,
        title: mystery.title,
        theme: mystery.theme,
        redirectUrl: `/en/builder/mysteries/${mystery.id}/compile`
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (err: any) {
    console.error('API Seeder: Caught unexpected error:', err);
    return NextResponse.json({ success: false, error: err.message || 'Unknown server error' }, { status: 500 });
  }
}
