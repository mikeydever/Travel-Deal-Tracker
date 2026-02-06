const block = "rounded-3xl border border-[var(--card-border)] bg-white/50 animate-pulse";

export default function LoadingHotels() {
  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 pb-16 pt-10 sm:px-6 lg:px-8">
      <div className={`${block} h-44`} />
      <div className={`${block} min-h-[360px]`} />
      <div className={`${block} min-h-[360px]`} />
    </div>
  );
}
