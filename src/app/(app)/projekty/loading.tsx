export default function ProjektyLoading() {
  return (
    <div className="flex flex-col gap-5 animate-pulse">
      <div className="h-7 w-48 rounded bg-muted" />
      <div className="flex gap-2">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-7 w-28 rounded-full bg-muted" />
        ))}
      </div>
      <div className="rounded-[10px] border border-border bg-card overflow-hidden">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="flex items-center gap-3 px-3 py-3 border-b border-border/60 last:border-0">
            <div className="flex-1 h-4 rounded bg-muted" />
            <div className="h-5 w-16 rounded-full bg-muted/70" />
            <div className="hidden sm:block h-4 w-20 rounded bg-muted/50" />
          </div>
        ))}
      </div>
    </div>
  )
}
