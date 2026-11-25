import React from 'react';
import { Metadata } from 'next';
import Link from 'next/link';
import { getDictionary } from '@/lib/get-dictionary';
import { Locale } from '@/lib/i18n-config';
import PriceDisplay from '@/components/marketing/PriceDisplay';
import InteractivePackPreview from '@/components/marketing/InteractivePackPreview';
import HowItWorksVideoShowcase from '@/components/marketing/HowItWorksVideoShowcase';

export async function generateMetadata(props: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const params = await props.params;
  const locale = params.locale;
  const dict = await getDictionary(locale as Locale);

  return {
    title: `${dict.common.howItWorks} | ${dict.common.siteTitle}`,
    description:
      'Create your guests, pick a human-crafted mystery theme, assign roles, generate fully custom clues in ~20 minutes, send character invites before the party, and launch Live Game Mode when everyone arrives.',
    alternates: {
      canonical: `https://backpocketmysteries.com/en/how-it-works`,
    },
  };
}

export default async function HowItWorksPage(props: { params: Promise<{ locale: string }> }) {
  const params = await props.params;
  const locale = params.locale;
  const dict = await getDictionary(locale as Locale);

  return (
    <div className="bg-white overflow-hidden">
      {/* =====================================================================
          HERO HEADER + PROMOTIONAL VIDEO SHOWCASE
      ===================================================================== */}
      <div className="relative pt-10 pb-14 lg:pt-16 lg:pb-20 border-b border-gray-200 bg-white">
        <div className="container mx-auto px-6 max-w-6xl">
          <div className="grid lg:grid-cols-12 gap-8 items-end">
            <div className="lg:col-span-8">
              <div className="inline-flex items-center gap-2.5 px-4 py-1.5 mb-6 text-[11px] font-black tracking-[0.22em] uppercase text-white bg-brand-dark rounded-full">
                <span className="w-2 h-2 rounded-full bg-brand-pink" />
                {dict.howItWorks.badge}
              </div>
              <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black text-brand-dark tracking-tighter uppercase leading-[0.9]">
                From Your Group Chat
                <br />
                To <span className="text-brand-pink italic">Crime Scene.</span>
              </h1>
            </div>
            <div className="lg:col-span-4">
              <p className="text-base sm:text-lg text-gray-600 leading-relaxed font-semibold border-l-4 border-brand-pink pl-5">
                Create your guests, pick a human-written story, generate custom clues around your friends in ~20 minutes, and launch Live Game Mode when everyone arrives.
              </p>
            </div>
          </div>

          <HowItWorksVideoShowcase />
        </div>
      </div>

      {/* =====================================================================
          SECTION 1: THE 6-STEP VISUAL TIMELINE (ALTERNATING COLLAGES)
      ===================================================================== */}
      <section className="relative py-20 lg:py-28 bg-white">
        <div className="container mx-auto px-6 max-w-6xl relative">
          {/* Central Vertical Timeline Spine on Desktop */}
          <div className="hidden lg:block absolute left-1/2 top-8 bottom-8 w-0.5 bg-gray-200 -translate-x-1/2" />

          <div className="space-y-24 lg:space-y-32">
            {/* ---------------------------------------------------------------
                STEP 01: CREATE YOUR GUESTS
            ---------------------------------------------------------------- */}
            <div className="relative grid lg:grid-cols-12 gap-10 lg:gap-16 items-center group">
              <div className="hidden lg:flex absolute left-1/2 -translate-x-1/2 w-12 h-12 rounded-full bg-brand-dark text-white border-4 border-white shadow-lg items-center justify-center font-black text-xs z-10 group-hover:bg-brand-pink transition-colors">
                01
              </div>

              {/* Left Copy */}
              <div className="lg:col-span-5 lg:text-right space-y-4">
                <span className="inline-block text-[11px] font-black uppercase tracking-[0.22em] text-brand-pink">
                  Step 01 · Before the Party
                </span>
                <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-brand-dark uppercase tracking-tight leading-[0.98]">
                  Create Your <span className="text-brand-pink italic">Guests.</span>
                </h2>
                <p className="text-base text-gray-500 font-semibold leading-relaxed">
                  Add the friends coming to your party—enter their names, appearances (or upload a quick photo), accents, and an inside joke. Save them once and reuse them for future mystery nights.
                </p>
              </div>

              <div className="hidden lg:block lg:col-span-2" />

              {/* Right Visual Collage: Tilted Polaroid Guest Cards */}
              <div className="lg:col-span-5">
                <div className="relative py-4 px-2">
                  <div className="grid grid-cols-3 gap-3 sm:gap-4">
                    {[
                      {
                        name: 'Sarah',
                        trait: 'Always 15m late with an espresso martini',
                        img: '/generated-avatars/44d70cd0-9f04-408b-8ac9-e064eb5c31d0-6224c730c6c6.jpg',
                        tilt: '-rotate-3 group-hover:-rotate-6',
                      },
                      {
                        name: 'Jason',
                        trait: 'Knows everyone’s office gossip',
                        img: '/generated-avatars/da18ef00-ecdc-41e7-8c71-97d78046e43b-486590f0918d.jpg',
                        tilt: 'rotate-2 translate-y-3 group-hover:translate-y-1',
                      },
                      {
                        name: 'Chloe',
                        trait: 'Brings up the 2023 Ibiza trip',
                        img: '/generated-avatars/5f9b36e0-44ae-4c3d-9762-432c5bb17783-5518cb6b6215.jpg',
                        tilt: 'rotate-3 group-hover:rotate-6',
                      },
                    ].map((g) => (
                      <div
                        key={g.name}
                        className={`bg-white p-2.5 pb-3.5 rounded-2xl border-2 border-brand-dark shadow-[6px_6px_0px_#120914] transition-transform duration-300 ${g.tilt}`}
                      >
                        <div className="aspect-[4/5] rounded-xl overflow-hidden bg-brand-dark mb-2.5">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={g.img}
                            alt={g.name}
                            className="w-full h-full object-cover object-top"
                          />
                        </div>
                        <p className="text-xs font-black uppercase text-brand-dark">{g.name}</p>
                        <p className="text-[10px] text-gray-500 font-semibold leading-tight mt-0.5 line-clamp-2">
                          &ldquo;{g.trait}&rdquo;
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* ---------------------------------------------------------------
                STEP 02: PICK YOUR MYSTERY THEME
            ---------------------------------------------------------------- */}
            <div className="relative grid lg:grid-cols-12 gap-10 lg:gap-16 items-center group">
              <div className="hidden lg:flex absolute left-1/2 -translate-x-1/2 w-12 h-12 rounded-full bg-brand-dark text-white border-4 border-white shadow-lg items-center justify-center font-black text-xs z-10 group-hover:bg-brand-pink transition-colors">
                02
              </div>

              {/* Left Visual Collage: Overlapping Story Cover & Spice Stamp */}
              <div className="lg:col-span-5 order-2 lg:order-1">
                <div className="relative">
                  <div className="rounded-3xl overflow-hidden border-2 border-brand-dark shadow-[8px_8px_0px_#fe04c6] -rotate-1 group-hover:rotate-0 transition-transform duration-300 bg-brand-dark">
                    <div className="relative aspect-[16/10]">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src="/moodboard/christmas/main-promo-murder.jpg"
                        alt="Mystery Theme"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-brand-dark via-brand-dark/20 to-transparent" />
                      <div className="absolute bottom-4 left-5 right-5 flex items-end justify-between">
                        <div>
                          <span className="text-[10px] font-black uppercase tracking-widest text-brand-pink block">
                            Human-Crafted Storylines
                          </span>
                          <p className="text-2xl font-black text-white uppercase tracking-tight">
                            Christmas Nightmare
                          </p>
                        </div>
                        <span className="px-3 py-1 rounded-full bg-brand-pink text-white text-[10px] font-black uppercase tracking-wider">
                          4 Spice Levels
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="hidden lg:block lg:col-span-2 order-2" />

              {/* Right Copy */}
              <div className="lg:col-span-5 order-1 lg:order-3 space-y-4">
                <span className="inline-block text-[11px] font-black uppercase tracking-[0.22em] text-brand-pink">
                  Step 02 · Choose the Vibe
                </span>
                <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-brand-dark uppercase tracking-tight leading-[0.98]">
                  Pick Your <span className="text-brand-pink italic">Theme.</span>
                </h2>
                <p className="text-base text-gray-500 font-semibold leading-relaxed">
                  Every plot, alibi, and twist is written by a human mystery author first so the clue logic is watertight. Pick the setting, difficulty, and spice level that fits your crowd—from work-friendly Clean to Spicy or Filthy.
                </p>
              </div>
            </div>

            {/* ---------------------------------------------------------------
                STEP 03: ASSIGN YOUR GUESTS TO CHARACTERS
            ---------------------------------------------------------------- */}
            <div className="relative grid lg:grid-cols-12 gap-10 lg:gap-16 items-center group">
              <div className="hidden lg:flex absolute left-1/2 -translate-x-1/2 w-12 h-12 rounded-full bg-brand-dark text-white border-4 border-white shadow-lg items-center justify-center font-black text-xs z-10 group-hover:bg-brand-pink transition-colors">
                03
              </div>

              {/* Left Copy */}
              <div className="lg:col-span-5 lg:text-right space-y-4">
                <span className="inline-block text-[11px] font-black uppercase tracking-[0.22em] text-brand-pink">
                  Step 03 · Match Your Crew
                </span>
                <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-brand-dark uppercase tracking-tight leading-[0.98]">
                  Assign Your <span className="text-brand-pink italic">Cast.</span>
                </h2>
                <p className="text-base text-gray-500 font-semibold leading-relaxed">
                  Match your friends to iconic character roles—or let our AI auto-cast them in one click. Every role automatically gender-flexes to fit any group mix, and you can auto-fill any empty slots with fictional suspects.
                </p>
              </div>

              <div className="hidden lg:block lg:col-span-2" />

              {/* Right Visual: Tactile Casting Stack */}
              <div className="lg:col-span-5">
                <div className="bg-brand-gray rounded-3xl p-5 border-2 border-brand-dark shadow-[8px_8px_0px_#120914] space-y-3 rotate-1 group-hover:rotate-0 transition-transform duration-300">
                  {[
                    {
                      guest: 'Sarah',
                      role: 'The Sister-in-Law',
                      img: '/generated-avatars/44d70cd0-9f04-408b-8ac9-e064eb5c31d0-6224c730c6c6.jpg',
                      tag: 'Suspect',
                    },
                    {
                      guest: 'Gabby',
                      role: 'The Wife',
                      img: '/generated-avatars/4903bd39-e54f-42e4-b679-2af5d128bb8f-b130e47b4cee2149a7aad02dfc972e91.jpg',
                      tag: 'Host Playing',
                    },
                    {
                      guest: 'Jason',
                      role: 'The Co-Worker',
                      img: '/generated-avatars/da18ef00-ecdc-41e7-8c71-97d78046e43b-486590f0918d.jpg',
                      tag: 'Suspect',
                    },
                  ].map((row) => (
                    <div
                      key={row.guest}
                      className="bg-white rounded-2xl p-3 border border-gray-200 flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={row.img}
                          alt={row.guest}
                          className="w-10 h-10 rounded-xl object-cover object-top border border-gray-200"
                        />
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-black text-brand-dark">{row.guest}</span>
                          <span className="text-brand-pink font-black">→</span>
                          <span className="text-sm font-black uppercase text-brand-pink">
                            {row.role}
                          </span>
                        </div>
                      </div>
                      <span className="px-2.5 py-1 rounded-full bg-brand-dark text-white text-[9px] font-black uppercase tracking-widest">
                        {row.tag}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* ---------------------------------------------------------------
                STEP 04: GENERATE YOUR CUSTOM MYSTERY & CLUES (GUEST -> CLUE BREAKDOWN)
            ---------------------------------------------------------------- */}
            <div className="relative grid lg:grid-cols-12 gap-10 lg:gap-16 items-center group">
              <div className="hidden lg:flex absolute left-1/2 -translate-x-1/2 w-12 h-12 rounded-full bg-brand-dark text-white border-4 border-white shadow-lg items-center justify-center font-black text-xs z-10 group-hover:bg-brand-pink transition-colors">
                04
              </div>

              {/* Left Visual Collage: Guest Profile -> Lookalike Crime-Scene Photo + Leaked Text + Voice Wiretap */}
              <div className="lg:col-span-5 order-2 lg:order-1 space-y-4">
                {/* Pair 1: Guest Sarah -> Lookalike Crime-Scene Photo */}
                <div className="bg-brand-dark text-white rounded-3xl p-3.5 border-2 border-brand-dark shadow-[8px_8px_0px_#fe04c6] -rotate-1 group-hover:rotate-0 transition-transform">
                  <div className="flex items-center justify-between px-1 mb-2.5">
                    <span className="text-[10px] font-black uppercase tracking-widest text-brand-pink">
                      Clue Type #1 · Guest-Lookalike Crime Photos
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full bg-brand-pink text-white text-[9px] font-black uppercase tracking-wider">
                      ✓ 100% Appearance Match
                    </span>
                  </div>
                  <div className="grid grid-cols-12 gap-2.5 items-center">
                    <div className="col-span-4 bg-white text-brand-dark rounded-2xl p-2 border border-gray-200">
                      <div className="aspect-[4/5] rounded-xl overflow-hidden mb-1.5">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src="/generated-avatars/44d70cd0-9f04-408b-8ac9-e064eb5c31d0-6224c730c6c6.jpg"
                          alt="Guest Sarah"
                          className="w-full h-full object-cover object-top"
                        />
                      </div>
                      <p className="text-[10px] font-black uppercase">Guest: Sarah</p>
                      <p className="text-[9px] text-brand-pink font-bold leading-tight">
                        Emerald velvet · Gold earrings
                      </p>
                    </div>

                    <div className="col-span-1 flex justify-center">
                      <span className="w-7 h-7 rounded-full bg-brand-pink text-white font-black text-xs flex items-center justify-center shadow-md">
                        →
                      </span>
                    </div>

                    <div className="col-span-7 relative rounded-2xl overflow-hidden border border-white/15 bg-black">
                      <div className="aspect-[4/3]">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src="/generated-clues/a1111111-1111-4111-8111-111111111107-5a3adbbd85bd.jpg"
                          alt="Sarah Rendered Into Fireplace Crime Clue"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="p-2 bg-black/85">
                        <p className="text-[10px] font-black uppercase text-brand-pink">
                          Rendered Crime-Scene Clue #04
                        </p>
                        <p className="text-[10px] font-semibold text-white/90 leading-tight">
                          Sarah caught burning documents by the fireplace in her exact emerald dress!
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Overlapping Leaked Text + Physical Forensic + AI Voice Wiretap Card */}
                <div className="bg-white rounded-3xl p-4 border-2 border-brand-dark shadow-[8px_8px_0px_#120914] rotate-1 group-hover:rotate-0 transition-transform space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-wider text-brand-pink">
                      Clue Type #2 · Leaked Texts &amp; Physical Forensics
                    </span>
                    <span className="text-[10px] font-black uppercase text-brand-dark">7:32 PM</span>
                  </div>
                  <div className="flex items-center gap-3 bg-gray-50 rounded-2xl p-2.5 border border-gray-200">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src="/generated-clues/a1111111-1111-4111-8111-111111111109-6c6f2b97ac73.jpg"
                      alt="Dropped Snowflake Hairpin Clue"
                      className="w-14 h-14 rounded-xl object-cover shrink-0 border border-gray-300"
                    />
                    <p className="text-xs font-bold text-brand-dark leading-snug">
                      &ldquo;Burn the offshore transfer fast—and don&apos;t drop your silver snowflake hairpin like you did in Ibiza 👀&rdquo;
                    </p>
                  </div>

                  {/* Clue Type #3: AI Voice Wiretap Strip */}
                  <div className="flex items-center justify-between bg-brand-dark text-white rounded-2xl px-3.5 py-2.5">
                    <div className="flex items-center gap-2.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-brand-pink animate-pulse" />
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-wider text-brand-pink">
                          Clue Type #3 · AI Voice Wiretap (0:14)
                        </p>
                        <p className="text-[11px] font-bold text-white">
                          Synthesized in Sarah&apos;s British Accent
                        </p>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 rounded-full bg-brand-pink text-white text-[9px] font-black uppercase tracking-widest">
                      ▶ Audio Clue
                    </span>
                  </div>
                </div>
              </div>

              <div className="hidden lg:block lg:col-span-2 order-2" />

              {/* Right Copy: 3 Clue Type Breakdown */}
              <div className="lg:col-span-5 order-1 lg:order-3 space-y-4">
                <span className="inline-block text-[11px] font-black uppercase tracking-[0.22em] text-brand-pink">
                  Step 04 · Custom Clue Engine (~20 Mins)
                </span>
                <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-brand-dark uppercase tracking-tight leading-[0.98]">
                  Clues Rendered To <span className="text-brand-pink italic">Look Like Your Guests.</span>
                </h2>
                <p className="text-base text-gray-500 font-semibold leading-relaxed">
                  Hit generate and our engine builds multi-sensory evidence tailored directly to your guest list:
                </p>
                <div className="space-y-2.5 pt-1">
                  {[
                    {
                      tag: '01 · Lookalike Photos',
                      text: 'Crime-scene & CCTV photos rendered to match each guest’s hair, glasses, beard & outfit.',
                    },
                    {
                      tag: '02 · Texts & Forensics',
                      text: 'Leaked iMessage threads, bank transfers & physical evidence weaving in their real names & inside jokes.',
                    },
                    {
                      tag: '03 · AI Voice Wiretaps',
                      text: 'Intercepted voicemails generated in each friend’s accent and played out loud on their phones.',
                    },
                  ].map((item) => (
                    <div
                      key={item.tag}
                      className="p-3 rounded-2xl bg-[#f8f7fa] border border-gray-200 flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-3"
                    >
                      <span className="px-2.5 py-1 rounded-full bg-brand-dark text-white text-[10px] font-black uppercase tracking-wider shrink-0">
                        {item.tag}
                      </span>
                      <p className="text-xs font-bold text-gray-600 leading-snug">{item.text}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* ---------------------------------------------------------------
                STEP 05: SEND CHARACTER INVITES BEFORE THE NIGHT
            ---------------------------------------------------------------- */}
            <div className="relative grid lg:grid-cols-12 gap-10 lg:gap-16 items-center group">
              <div className="hidden lg:flex absolute left-1/2 -translate-x-1/2 w-12 h-12 rounded-full bg-brand-dark text-white border-4 border-white shadow-lg items-center justify-center font-black text-xs z-10 group-hover:bg-brand-pink transition-colors">
                05
              </div>

              {/* Left Copy */}
              <div className="lg:col-span-5 lg:text-right space-y-4">
                <span className="inline-block text-[11px] font-black uppercase tracking-[0.22em] text-brand-pink">
                  Step 05 · Build the Hype
                </span>
                <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-brand-dark uppercase tracking-tight leading-[0.98]">
                  Invite Your <span className="text-brand-pink italic">Friends.</span>
                </h2>
                <p className="text-base text-gray-500 font-semibold leading-relaxed">
                  Drop a single 1-click link into your group chat before the party. Each guest taps their name to preview their spoiler-free character blurb and outfit &amp; dress code guide so everyone arrives in character.
                </p>
              </div>

              <div className="hidden lg:block lg:col-span-2" />

              {/* Right Visual: Pre-Party Character & Outfit Invite Card */}
              <div className="lg:col-span-5">
                <div className="bg-brand-dark text-white rounded-3xl p-6 border-2 border-brand-dark shadow-[8px_8px_0px_#fe04c6] -rotate-1 group-hover:rotate-0 transition-transform space-y-4">
                  <div className="flex items-center justify-between border-b border-white/15 pb-3">
                    <span className="text-[10px] font-black uppercase tracking-widest text-brand-pink">
                      Pre-Party Character Invite · For Sarah
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full bg-white/10 text-white text-[9px] font-black uppercase">
                      Spoiler-Free
                    </span>
                  </div>
                  <div>
                    <p className="text-xl font-black uppercase tracking-tight">
                      Your Role: The Sister-in-Law
                    </p>
                    <p className="text-xs text-gray-300 mt-1 leading-relaxed">
                      What to Wear: Sleek winter chic—an emerald silk dress or tailored velvet blazer, silver snowflake hairpin, and dark berry lipstick.
                    </p>
                  </div>
                  <div className="pt-2 flex items-center justify-between text-[11px] font-black uppercase tracking-wider text-brand-pink">
                    <span>Shared via 1-Click Group Chat Link</span>
                    <span>→</span>
                  </div>
                </div>
              </div>
            </div>

            {/* ---------------------------------------------------------------
                STEP 06: LAUNCH LIVE GAME MODE WHEN EVERYONE ARRIVES
            ---------------------------------------------------------------- */}
            <div className="relative grid lg:grid-cols-12 gap-10 lg:gap-16 items-center group">
              <div className="hidden lg:flex absolute left-1/2 -translate-x-1/2 w-12 h-12 rounded-full bg-brand-pink text-white border-4 border-white shadow-lg items-center justify-center font-black text-xs z-10">
                06
              </div>

              {/* Left Visual: Live Game PIN + Extra Guest Detective Join */}
              <div className="lg:col-span-5 order-2 lg:order-1">
                <div className="bg-brand-pink text-white rounded-3xl p-6 border-2 border-brand-dark shadow-[8px_8px_0px_#120914] rotate-1 group-hover:rotate-0 transition-transform space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="px-3 py-1 rounded-full bg-brand-dark text-white text-[10px] font-black uppercase tracking-widest">
                      Live Game PIN · 146 492
                    </span>
                    <span className="text-[10px] font-black uppercase tracking-widest text-white">
                      6/6 Cast + 2 Detectives
                    </span>
                  </div>
                  <div className="bg-brand-dark text-white rounded-2xl p-4 space-y-1.5">
                    <p className="text-[10px] font-black uppercase tracking-widest text-brand-pink">
                      Extra Friend Joining the Party?
                    </p>
                    <p className="text-base font-black uppercase tracking-tight">
                      Join as &ldquo;Detective Sarah&rdquo; →
                    </p>
                    <p className="text-xs text-gray-300 leading-snug">
                      Scan the QR code to get an official Detective Briefing, interrogate suspects, see every live clue, and vote in every round.
                    </p>
                  </div>
                </div>
              </div>

              <div className="hidden lg:block lg:col-span-2 order-2" />

              {/* Right Copy */}
              <div className="lg:col-span-5 order-1 lg:order-3 space-y-4">
                <span className="inline-block text-[11px] font-black uppercase tracking-[0.22em] text-brand-pink">
                  Step 06 · Party Night
                </span>
                <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-brand-dark uppercase tracking-tight leading-[0.98]">
                  Launch Live <span className="text-brand-pink italic">Game Mode.</span>
                </h2>
                <p className="text-base text-gray-500 font-semibold leading-relaxed">
                  Open the Live Playroom on your laptop when everyone arrives. Guests scan the QR code on their phones to view their role cheat-sheet, get live clue drops each round, and vote on who did it—while extra friends join on the spot as <strong>Detective [Their Name]</strong>.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================================
          SECTION 2: INTERACTIVE LIVE GAME ROOM PREVIEW
      ===================================================================== */}
      <InteractivePackPreview locale={locale} />

      {/* =====================================================================
          SECTION 3: COOL FEATURES — ASYMMETRIC BENTO GRID (NO EMOJI SQUARES)
      ===================================================================== */}
      <section className="py-24 lg:py-32 bg-white">
        <div className="container mx-auto px-6 max-w-6xl space-y-16">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.25em] text-brand-pink mb-3">
                Built for Effortless Hosting
              </p>
              <h2 className="text-4xl sm:text-5xl lg:text-6xl font-black text-brand-dark uppercase tracking-tight leading-[0.95]">
                Why Hosts Love <span className="text-brand-pink italic">Playing It.</span>
              </h2>
            </div>
            <p className="text-gray-500 font-semibold text-base max-w-md leading-relaxed">
              Designed so you spend zero time reading rules and 100% of the night laughing, mingling, and accusing your friends.
            </p>
          </div>

          {/* Asymmetric 4-Card Bento Grid */}
          <div className="grid lg:grid-cols-12 gap-6">
            {/* BENTO 1 (7 Cols — Deep Party Ink): Extra Guest Players ("Detective [Name]") */}
            <div className="lg:col-span-7 bg-brand-dark text-white rounded-[2.5rem] p-8 sm:p-10 border-2 border-brand-dark shadow-xl flex flex-col justify-between gap-8 relative overflow-hidden group">
              <div className="space-y-4 max-w-xl">
                <span className="inline-block px-3.5 py-1 rounded-full bg-brand-pink text-white text-[10px] font-black uppercase tracking-widest">
                  Have More Than 6 Guests? · $0 Extra
                </span>
                <h3 className="text-3xl sm:text-4xl font-black uppercase tracking-tight leading-none">
                  Extra Friends Play Along as <span className="text-brand-pink italic">&ldquo;Detective [Name]&rdquo;</span>
                </h3>
                <p className="text-sm sm:text-base text-gray-300 font-medium leading-relaxed">
                  Originally planned for 6 people and extra friends or plus-ones show up? They don&apos;t need a pre-assigned character role to join the party. They scan the QR code, type their name, and get a custom <strong>Suspect Interrogation Lineup</strong>, every live clue drop on their phone, and round-by-round voting.
                </p>
              </div>

              <div className="grid sm:grid-cols-2 gap-3 pt-4 border-t border-white/15">
                <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                  <p className="text-[10px] font-black uppercase tracking-widest text-brand-pink mb-1">
                    Official Detective Briefing
                  </p>
                  <p className="text-xs text-gray-200 font-medium">
                    Tailored &ldquo;Ask Them Tonight&rdquo; interrogation prompts for every suspect in the room.
                  </p>
                </div>
                <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                  <p className="text-[10px] font-black uppercase tracking-widest text-brand-pink mb-1">
                    Full Clues, Voting &amp; Leaderboard
                  </p>
                  <p className="text-xs text-gray-200 font-medium">
                    Votes in every round and competes on the final room Detective Leaderboard.
                  </p>
                </div>
              </div>
            </div>

            {/* BENTO 2 (5 Cols — Electric Brand Pink): 100% Spoiler-Free Host Mode */}
            <div className="lg:col-span-5 bg-brand-pink text-white rounded-[2.5rem] p-8 sm:p-10 border-2 border-brand-dark shadow-[8px_8px_0px_#120914] flex flex-col justify-between gap-6">
              <div className="space-y-4">
                <span className="inline-block px-3.5 py-1 rounded-full bg-brand-dark text-white text-[10px] font-black uppercase tracking-widest">
                  Host Plays Too
                </span>
                <h3 className="text-3xl sm:text-4xl font-black uppercase tracking-tight leading-none">
                  100% Spoiler-Free for the Host.
                </h3>
                <p className="text-sm sm:text-base text-white/90 font-semibold leading-relaxed">
                  In traditional murder mystery kits, the host has to sit out or already knows who did it. We seal the killer&apos;s identity until the final reveal round—so you play a full suspect role and solve the crime alongside your guests.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-brand-dark text-white flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wider">
                  Killer Sealed Until Final Reveal
                </span>
                <span className="text-brand-pink font-black text-sm">✓</span>
              </div>
            </div>

            {/* BENTO 3 (5 Cols — Crisp White + Hard Shadow): Host on Laptop, Guests on Phones */}
            <div className="lg:col-span-5 bg-white text-brand-dark rounded-[2.5rem] p-8 sm:p-10 border-2 border-brand-dark shadow-[8px_8px_0px_#120914] flex flex-col justify-between gap-6">
              <div className="space-y-4">
                <span className="inline-block px-3.5 py-1 rounded-full bg-brand-gray text-brand-dark text-[10px] font-black uppercase tracking-widest border border-gray-300">
                  Effortless Pacing
                </span>
                <h3 className="text-3xl font-black uppercase tracking-tight leading-none">
                  Host on a <span className="text-brand-pink italic">Laptop.</span>
                  <br />
                  Guests on <span className="text-brand-pink italic">Phones.</span>
                </h3>
                <p className="text-sm text-gray-600 font-semibold leading-relaxed">
                  Only the host sees the round controller on their laptop and decides when voting opens for each round—keeping guest phones super clean, simple, and distraction-free.
                </p>
              </div>

              <div className="pt-4 border-t border-gray-200 flex items-center justify-between text-xs font-black uppercase tracking-wider text-brand-dark">
                <span>Zero App Store Downloads</span>
                <span className="text-brand-pink">Instant QR Join</span>
              </div>
            </div>

            {/* BENTO 4 (7 Cols — Warm Gray + Photo Split): Gender-Flex & 2 Ways to Play */}
            <div className="lg:col-span-7 bg-brand-gray text-brand-dark rounded-[2.5rem] p-8 sm:p-10 border-2 border-gray-200 flex flex-col justify-between gap-6">
              <div className="grid sm:grid-cols-12 gap-6 items-center">
                <div className="sm:col-span-7 space-y-4">
                  <span className="inline-block px-3.5 py-1 rounded-full bg-brand-pink/10 text-brand-pink text-[10px] font-black uppercase tracking-widest">
                    1 to 16+ Players · Any Group Mix
                  </span>
                  <h3 className="text-3xl font-black uppercase tracking-tight leading-none">
                    Gender-Flex Casting &amp; <span className="text-brand-pink italic">Two Ways to Play.</span>
                  </h3>
                  <p className="text-sm text-gray-600 font-semibold leading-relaxed">
                    Every character role automatically adapts pronouns, titles, and costume guides to match any guest gender—and you can host a full-cast <strong>Dinner Party Roleplay</strong> or solve all the dossiers together on the sofa in <strong>Couch Detective Mode</strong>.
                  </p>
                </div>

                <div className="sm:col-span-5">
                  <div className="rounded-2xl overflow-hidden border-2 border-brand-dark shadow-[6px_6px_0px_#120914] rotate-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src="/moodboard/lotr/cocktail-hour.jpg"
                      alt="Murder Mystery Dinner Party"
                      className="w-full h-44 object-cover"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================================
          SECTION 4: WHAT'S IN THE PACK (2-COLUMN EDITORIAL SPLIT)
      ===================================================================== */}
      <section className="py-20 lg:py-28 bg-brand-gray border-t border-gray-200">
        <div className="container mx-auto px-6 max-w-6xl space-y-16">
          <div className="grid lg:grid-cols-12 gap-12 items-start">
            <div className="lg:col-span-5 space-y-4">
              <span className="text-[11px] font-black uppercase tracking-[0.25em] text-brand-pink block">
                100% Online • Zero Printing Required
              </span>
              <h2 className="text-4xl sm:text-5xl font-black text-brand-dark uppercase tracking-tight leading-[0.95]">
                Everything Inside <span className="text-brand-pink italic">Your Pack.</span>
              </h2>
              <p className="text-base text-gray-500 font-semibold leading-relaxed">
                Every mystery runs 100% online inside our live interactive Mobile &amp; Web Playroom — no printing or paper envelopes required.
              </p>
              <div className="pt-4">
                <Link
                  href={`/${locale}/themes`}
                  className="inline-block px-8 py-4 bg-brand-pink text-white rounded-full font-black uppercase tracking-widest text-xs hover:bg-brand-dark transition-all shadow-lg"
                >
                  Browse Mystery Themes →
                </Link>
              </div>
            </div>

            <div className="lg:col-span-7 bg-white rounded-[2.5rem] border-2 border-brand-dark shadow-[8px_8px_0px_#120914] divide-y divide-gray-200 overflow-hidden">
              {Object.entries(dict.howItWorks.packContents.items).map(([key, item], i) => (
                <div
                  key={key}
                  className="p-6 sm:p-7 flex items-start gap-5 hover:bg-brand-gray/50 transition-colors"
                >
                  <span className="text-xl font-black text-brand-pink shrink-0 mt-0.5">
                    0{i + 1}
                  </span>
                  <div>
                    <h3 className="text-lg font-black text-brand-dark uppercase tracking-tight">
                      {item.title}
                    </h3>
                    <p className="text-sm text-gray-500 font-medium leading-relaxed mt-1">
                      {item.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Final CTA Banner */}
          <div className="text-center bg-brand-dark rounded-[2.5rem] lg:rounded-[3rem] p-10 sm:p-16 lg:p-24 relative overflow-hidden shadow-2xl">
            <div className="relative z-10">
              <h2 className="text-3xl sm:text-4xl lg:text-6xl font-black text-white mb-8 uppercase tracking-tighter leading-[0.95]">
                {dict.howItWorks.cta.title.split(',')[0]}
                <br />
                <span className="text-brand-pink italic">{dict.howItWorks.cta.title.split(',')[1]}</span>
              </h2>
              <p className="text-lg text-gray-400 mb-12 max-w-xl mx-auto font-bold">
                {dict.howItWorks.cta.desc.split('{{price}}')[0]}
                <PriceDisplay tier="basic" locale={locale as Locale} />
                {dict.howItWorks.cta.desc.split('{{price}}')[1]}
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center w-full">
                <Link
                  href={`/${locale}/themes`}
                  className="px-10 py-5 bg-brand-pink text-white rounded-full font-black uppercase tracking-widest text-sm hover:bg-white hover:text-brand-pink transition-all shadow-xl hover:translate-y-[-4px] active:scale-95 w-full sm:w-auto text-center"
                >
                  {dict.howItWorks.cta.ctaThemes}
                </Link>
                <Link
                  href={`/${locale}/pricing`}
                  className="px-10 py-5 bg-white/10 text-white border-2 border-white/20 rounded-full font-black uppercase tracking-widest text-sm hover:border-brand-pink transition-all hover:translate-y-[-4px] active:scale-95 w-full sm:w-auto text-center"
                >
                  {dict.howItWorks.cta.ctaPricing}
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
