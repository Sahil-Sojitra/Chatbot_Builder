export function Footer() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-6 py-6 text-xs text-muted-foreground sm:flex-row">
        <p>&copy; {new Date().getFullYear()} Chatbot Builder. All rights reserved.</p>
        <p>Built for teams shipping AI support experiences.</p>
      </div>
    </footer>
  );
}
