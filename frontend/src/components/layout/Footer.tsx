export function Footer() {
  return (
    <footer className="border-t border-white/[0.08] bg-[#09090b]/80">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-6 py-6 text-xs text-zinc-500 sm:flex-row">
        <p>&copy; {new Date().getFullYear()} Chatbot Studio AI. All rights reserved.</p>
        <p className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
          Production-grade AI Infrastructure &middot; RAG Enabled
        </p>
      </div>
    </footer>
  );
}
