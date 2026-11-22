export default function Home() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-content flex-col justify-center gap-4 px-4">
      <h1 className="font-display text-3xl font-bold">Buddy &amp; Beer</h1>
      <p className="text-muted">L&apos;appli arrive. En attendant, le système de design est ici :</p>
      <a href="/design" className="font-semibold text-accent-strong underline underline-offset-4">Voir /design</a>
    </main>
  );
}
