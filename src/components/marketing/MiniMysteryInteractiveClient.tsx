'use client';

import React, { useState } from 'react';
import Link from 'next/link';

interface MiniCase {
  id: string;
  caseNumber: string;
  title: string;
  themeBadge: string;
  themeSlug: string;
  victimLine: string;
  timeWindow: string;
  chatLogTitle: string;
  chatMessages: Array<{
    sender: string;
    role: string;
    time: string;
    text: string;
    isRecovered?: boolean;
  }>;
  forensicTitle: string;
  forensicItems: Array<{
    label: string;
    value: string;
    highlight?: boolean;
  }>;
  suspects: Array<{
    id: string;
    name: string;
    role: string;
    statement: string;
    isKiller: boolean;
    verdictTitle: string;
    verdictExplanation: string;
  }>;
}

const MINI_CASES: MiniCase[] = [
  {
    id: 'christmas-terrace',
    caseNumber: 'CASE FILE #01',
    title: 'The 11:42 PM Champagne Terrace Alibi',
    themeBadge: 'Inspired by Christmas Nightmare',
    themeSlug: 'christmas-nightmare',
    victimLine:
      'Arthur Sterling (The Host) was found poisoned in the locked Ground-Floor Study at 11:50 PM on Christmas Eve.',
    timeWindow: 'Fatal Poisoning Window: 11:38 PM – 11:46 PM',
    chatLogTitle: '📱 Recovered Family Group Chat ("Sterling Xmas Eve")',
    chatMessages: [
      {
        sender: 'Camilla',
        role: 'The Sister-in-Law',
        time: '11:36 PM',
        text: 'Anyone seen Arthur? He promised to open the 1996 Bordeaux before midnight.',
      },
      {
        sender: 'Julian',
        role: 'The Co-Worker',
        time: '11:41 PM',
        text: 'I am upstairs in the 3rd-floor guest suite wrapping my Secret Santa gift. Be down in 10!',
      },
      {
        sender: 'Elena',
        role: 'The Wife',
        time: '11:43 PM',
        text: '[DELETED MESSAGE RECOVERED]: Stop texting the group chat, your phone just lit up next to the study bookcase.',
        isRecovered: true,
      },
    ],
    forensicTitle: '🔐 Manor Smart-Home & Wi-Fi Router Telemetry',
    forensicItems: [
      {
        label: '11:39 PM • Study Smart-Thermostat Motion Sensor',
        value: '2 Heat Signatures Detected Inside Ground-Floor Study',
        highlight: true,
      },
      {
        label: '11:41 PM • Manor Mesh Wi-Fi Access Point Log',
        value: 'Julian’s iPhone connected to GROUND-FLOOR_STUDY_AP (Signal: -38 dBm / < 2 meters)',
        highlight: true,
      },
      {
        label: '11:44 PM • Wine Cellar Keypad',
        value: 'Camilla’s PIN entered in Basement Wine Cellar',
      },
    ],
    suspects: [
      {
        id: 'camilla',
        name: 'Camilla',
        role: 'The Sister-in-Law',
        statement:
          '“At 11:41 PM I was heading down to the basement wine cellar to grab the Bordeaux myself because Arthur never showed up.”',
        isKiller: false,
        verdictTitle: '❌ Not the Liar — Camilla’s Alibi Checks Out!',
        verdictExplanation:
          'The Wine Cellar keypad confirms Camilla entered her PIN in the basement at 11:44 PM. Look closely at the Wi-Fi Access Point telemetry at 11:41 PM!',
      },
      {
        id: 'julian',
        name: 'Julian',
        role: 'The Co-Worker',
        statement:
          '“I never went near the Ground-Floor Study! I was on the 3rd floor wrapping presents from 11:30 PM until midnight.”',
        isKiller: true,
        verdictTitle: '🎯 BUSTED! You Caught the Killer in a Timestamp Lie!',
        verdictExplanation:
          'At 11:41 PM, Julian texted that he was on the 3rd floor—but the Manor Mesh Wi-Fi router logged his iPhone connected to GROUND-FLOOR_STUDY_AP within 2 meters of the study desk, and Elena’s recovered 11:43 PM text caught his screen lighting up by the study bookcase!',
      },
      {
        id: 'elena',
        name: 'Elena',
        role: 'The Wife',
        statement:
          '“Okay fine, I walked past the Study hallway at 11:43 PM to confront Arthur about our prenup, and I saw someone hiding by the bookcase!”',
        isKiller: false,
        verdictTitle: '❌ Decoy Red Herring — Elena Was a Witness, Not the Liar!',
        verdictExplanation:
          'Elena deleted her 11:43 PM text out of panic, which makes her look suspicious—but her message actually proves someone else’s phone lit up inside the study at 11:41 PM!',
      },
    ],
  },
  {
    id: 'villa-poolside',
    caseNumber: 'CASE FILE #02',
    title: 'The Deleted Villa Infinity-Pool Alibi',
    themeBadge: 'Bonus 60-Second Detective Case',
    themeSlug: 'christmas-nightmare',
    victimLine:
      'ricky Vance (The Show Producer) was struck with a golden microphone trophy by the Villa Firepit at 10:15 PM.',
    timeWindow: 'Crime Window: 10:12 PM – 10:17 PM',
    chatLogTitle: '📱 Recovered Villa Producer DM Thread',
    chatMessages: [
      {
        sender: 'Chloe',
        role: 'The Bombshell',
        time: '10:10 PM',
        text: 'Meet me at the rooftop jacuzzi at 10:15. Do not let the cameras see you.',
      },
      {
        sender: 'Marcus',
        role: 'The Ex',
        time: '10:14 PM',
        text: 'Just took a mirror selfie in the Dressing Room getting my mic pack fixed. Hands are clean.',
      },
      {
        sender: 'Sienna',
        role: 'The Host',
        time: '10:16 PM',
        text: '[DELETED VOICE NOTE TRANSCRIPT]: Why is Marcus’s wireless lapel mic broadcasting wind noise from the Firepit right now?!',
        isRecovered: true,
      },
    ],
    forensicTitle: '🎙️ Sound-Desk & Metadata Forensics',
    forensicItems: [
      {
        label: '10:14 PM • Marcus’s Dressing Room Mirror Selfie EXIF Data',
        value: 'Original Photo Captured at 08:42 PM (Uploaded to chat 92 mins later)',
        highlight: true,
      },
      {
        label: '10:15 PM • Sound-Booth RF Receiver Channel #04 (Marcus)',
        value: 'Peak impact transient + outdoor firepit crickets recorded on Channel #04',
        highlight: true,
      },
      {
        label: '10:15 PM • Rooftop Jacuzzi CCTV Camera #2',
        value: 'Chloe seen pacing alone by the jacuzzi checking her watch',
      },
    ],
    suspects: [
      {
        id: 'chloe',
        name: 'Chloe',
        role: 'The Bombshell',
        statement:
          '“I sent a risky DM at 10:10 PM, sure, but I was waiting alone at the rooftop jacuzzi at 10:15 PM!”',
        isKiller: false,
        verdictTitle: '❌ Not the Killer — Rooftop CCTV Clears Chloe!',
        verdictExplanation:
          'Camera #2 confirms Chloe was pacing alone on the roof at 10:15 PM. Check the EXIF metadata on the 10:14 PM photo!',
      },
      {
        id: 'marcus',
        name: 'Marcus',
        role: 'The Ex',
        statement:
          '“I posted a photo from the Dressing Room at 10:14 PM! How could I be at the outdoor Firepit at 10:15 PM?”',
        isKiller: true,
        verdictTitle: '🎯 BUSTED! You Exposed the Fake EXIF Photo Alibi!',
        verdictExplanation:
          'Marcus took his Dressing Room mirror selfie at 8:42 PM and waited until 10:14 PM to send it as a fake alibi—forgetting his live wireless lapel mic (Channel #04) was still broadcasting outdoor firepit audio at 10:15 PM!',
      },
      {
        id: 'sienna',
        name: 'Sienna',
        role: 'The Show Host',
        statement:
          '“I was in the audio booth monitoring the live feeds when I heard the trophy impact over one of the suspect mics.”',
        isKiller: false,
        verdictTitle: '❌ Innocent — Sienna Logged the Key Audio Evidence!',
        verdictExplanation:
          'Sienna was in the sound booth and recorded the wireless mic transmission that proves who was standing at the Firepit.',
      },
    ],
  },
];

export default function MiniMysteryInteractiveClient({ locale }: { locale: string }) {
  const [activeCaseIdx, setActiveCaseIdx] = useState(0);
  const [selectedSuspectId, setSelectedSuspectId] = useState<string | null>(null);
  const [solvedCases, setSolvedCases] = useState<Record<string, boolean>>({});
  const [copiedShare, setCopiedShare] = useState(false);

  const currentCase = MINI_CASES[activeCaseIdx];
  const selectedSuspect =
    currentCase.suspects.find((s) => s.id === selectedSuspectId) || null;

  const handleSelectSuspect = (suspectId: string, isKiller: boolean) => {
    setSelectedSuspectId(suspectId);
    if (isKiller) {
      setSolvedCases((prev) => ({ ...prev, [currentCase.id]: true }));
    }
  };

  const handleCopyGroupChatChallenge = () => {
    const shareText = `🕵️‍♀️ Can you spot who is lying in 60 seconds? Try "${currentCase.title}" on Back Pocket Mysteries: https://backpocketmysteries.com/${locale}/mini-mystery`;
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(shareText);
      setCopiedShare(true);
      setTimeout(() => setCopiedShare(false), 3000);
    }
  };

  return (
    <div className="space-y-8">
      {/* Case Switcher Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-3 rounded-2xl border border-gray-200 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          {MINI_CASES.map((mc, idx) => {
            const isSolved = solvedCases[mc.id];
            const isActive = idx === activeCaseIdx;
            return (
              <button
                key={mc.id}
                type="button"
                onClick={() => {
                  setActiveCaseIdx(idx);
                  setSelectedSuspectId(null);
                }}
                className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 ${
                  isActive
                    ? 'bg-brand-dark text-white shadow-sm'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <span>{mc.caseNumber}: {mc.title}</span>
                {isSolved && (
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500 text-white text-[9px]">
                    ✓ Solved
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={handleCopyGroupChatChallenge}
          className="px-4 py-2.5 rounded-xl bg-brand-pink/10 hover:bg-brand-pink text-brand-pink hover:text-white text-xs font-black uppercase tracking-wider transition-all"
        >
          {copiedShare ? '✓ Challenge Link Copied!' : '📲 Challenge Your Group Chat'}
        </button>
      </div>

      {/* Main Case File Board */}
      <div className="bg-brand-dark text-white rounded-[32px] p-6 sm:p-10 shadow-2xl border border-white/10 space-y-8">
        {/* Case Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-white/10">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="px-3 py-1 rounded-full bg-brand-pink text-white text-[10px] font-black uppercase tracking-widest">
                {currentCase.caseNumber} • 60-SECOND DETECTIVE TEST
              </span>
              <span className="px-3 py-1 rounded-full bg-white/10 text-gray-300 text-[10px] font-black uppercase tracking-widest">
                {currentCase.themeBadge}
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black uppercase tracking-tight">
              {currentCase.title}
            </h2>
            <p className="text-sm text-gray-300 font-medium">
              {currentCase.victimLine}
            </p>
          </div>
          <div className="bg-rose-500/15 border border-rose-500/30 rounded-2xl px-4 py-3 shrink-0">
            <p className="text-[10px] font-black uppercase tracking-widest text-rose-300">
              Forensic Window
            </p>
            <p className="text-xs font-black text-white mt-0.5">
              ⏱️ {currentCase.timeWindow}
            </p>
          </div>
        </div>

        {/* 2-Column Evidence Grid */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Clue 1: Dark-Mode Group Chat */}
          <div className="bg-black/40 rounded-2xl p-5 border border-white/10 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black uppercase tracking-widest text-brand-pink">
                {currentCase.chatLogTitle}
              </h3>
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                Clue #1 of 2
              </span>
            </div>
            <div className="space-y-3">
              {currentCase.chatMessages.map((msg, i) => (
                <div
                  key={i}
                  className={`p-3.5 rounded-xl border ${
                    msg.isRecovered
                      ? 'bg-rose-950/40 border-rose-500/40'
                      : 'bg-white/5 border-white/10'
                  }`}
                >
                  <div className="flex items-center justify-between text-[11px] font-black mb-1">
                    <span className={msg.isRecovered ? 'text-rose-300' : 'text-brand-pink'}>
                      {msg.sender} ({msg.role})
                    </span>
                    <span className="text-gray-400 font-mono">{msg.time}</span>
                  </div>
                  <p className="text-xs text-gray-200 leading-relaxed font-medium">
                    {msg.text}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Clue 2: Forensic / Sensor Log */}
          <div className="bg-black/40 rounded-2xl p-5 border border-white/10 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black uppercase tracking-widest text-amber-400">
                {currentCase.forensicTitle}
              </h3>
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                Clue #2 of 2
              </span>
            </div>
            <div className="space-y-3">
              {currentCase.forensicItems.map((item, i) => (
                <div
                  key={i}
                  className={`p-3.5 rounded-xl border ${
                    item.highlight
                      ? 'bg-amber-500/10 border-amber-400/30'
                      : 'bg-white/5 border-white/10'
                  }`}
                >
                  <p className="text-[10px] font-black uppercase tracking-wider text-gray-400">
                    {item.label}
                  </p>
                  <p className="text-xs font-bold text-white mt-1 font-mono">
                    {item.value}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 3 Suspects Accusation Cards */}
        <div className="space-y-4 pt-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black uppercase tracking-widest text-white">
              👇 Tap the Suspect Whose Alibi Contradicts the Evidence:
            </h3>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            {currentCase.suspects.map((suspect) => {
              const isSelected = selectedSuspectId === suspect.id;
              return (
                <button
                  key={suspect.id}
                  type="button"
                  onClick={() => handleSelectSuspect(suspect.id, suspect.isKiller)}
                  className={`text-left p-5 rounded-2xl border-2 transition-all flex flex-col justify-between gap-4 ${
                    isSelected
                      ? suspect.isKiller
                        ? 'bg-emerald-950/60 border-emerald-400 shadow-lg'
                        : 'bg-rose-950/50 border-rose-400'
                      : 'bg-white/5 border-white/10 hover:border-brand-pink/60 hover:bg-white/10'
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-base font-black uppercase tracking-tight text-white">
                        {suspect.name}
                      </span>
                      <span className="px-2.5 py-0.5 rounded-full bg-white/10 text-[10px] font-black uppercase tracking-widest text-brand-pink">
                        {suspect.role}
                      </span>
                    </div>
                    <p className="text-xs text-gray-300 leading-relaxed italic">
                      {suspect.statement}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-white/10 flex items-center justify-between">
                    <span className="text-[11px] font-black uppercase tracking-widest text-brand-pink">
                      {isSelected ? 'Selected Accusation' : '🚨 Accuse Suspect →'}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Instant Verdict Reveal Box */}
        {selectedSuspect && (
          <div
            className={`p-6 rounded-2xl border-2 transition-all ${
              selectedSuspect.isKiller
                ? 'bg-emerald-950/80 border-emerald-400 text-white'
                : 'bg-rose-950/80 border-rose-400 text-white'
            }`}
          >
            <h4 className="text-lg font-black uppercase tracking-tight mb-2">
              {selectedSuspect.verdictTitle}
            </h4>
            <p className="text-sm text-gray-200 leading-relaxed mb-6">
              {selectedSuspect.verdictExplanation}
            </p>

            <div className="flex flex-wrap items-center gap-3">
              {selectedSuspect.isKiller && activeCaseIdx < MINI_CASES.length - 1 && (
                <button
                  type="button"
                  onClick={() => {
                    setActiveCaseIdx(activeCaseIdx + 1);
                    setSelectedSuspectId(null);
                  }}
                  className="px-6 py-3 rounded-full bg-white text-brand-dark font-black uppercase tracking-widest text-xs hover:bg-brand-pink hover:text-white transition-all"
                >
                  Next Mini-Mystery Case →
                </button>
              )}
              <Link
                href={`/${locale}/themes/${currentCase.themeSlug}`}
                className="px-6 py-3 rounded-full bg-brand-pink text-white font-black uppercase tracking-widest text-xs hover:bg-white hover:text-brand-dark transition-all"
              >
                Cast Your Friends in This Full Custom Mystery →
              </Link>
              <button
                type="button"
                onClick={handleCopyGroupChatChallenge}
                className="px-5 py-3 rounded-full bg-white/10 hover:bg-white/20 text-white font-black uppercase tracking-widest text-xs transition-all"
              >
                {copiedShare ? '✓ Copied for Group Chat!' : '📲 Send to Group Chat'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
