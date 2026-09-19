export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="mt-auto border-t border-divider">
      <div className="mx-auto flex max-w-[1240px] flex-wrap items-center justify-between gap-3 px-8 py-5 text-[12px] text-fg/45">
        <span>© {year} Auto ReviewPR — PR reviews, powered by Inngest.</span>
        <a
          href="https://www.aniketbdev.com/"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-full border bg-accent-900 px-3.5 py-2 text-[12.5px] text-fg/60 transition-shadow duration-300 hover:shadow-[0_0_12px_rgba(201,96,31,0.4)]"
          style={{ borderColor: "rgba(110, 231, 183, 0.18)" }}
        >
          <span>✦</span>
          <span>
            Developed by <span className="text-warn-400">Aniket B</span>
          </span>
        </a>
      </div>
    </footer>
  );
}
