export default function WizardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-white">
      {/* Minimal Header for Wizard */}
      <header className="border-b border-slate-100 py-6 px-8 bg-white sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="font-black text-xl tracking-tighter uppercase text-slate-900">
            Back Pocket <span className="text-brand-pink italic">Mysteries</span>
          </div>
          <div className="text-xs font-black uppercase tracking-widest text-slate-400">
            Mystery Generator
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="animate-in fade-in duration-700">
        {children}
      </main>
    </div>
  );
}
