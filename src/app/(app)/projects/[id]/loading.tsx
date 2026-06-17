export default function ProjectLoading() {
  return (
    <div className="flex flex-col gap-6 animate-pulse">
      {/* Header skeleton */}
      <div className="flex flex-col gap-3">
        <div className="h-3 w-40 rounded bg-muted" />
        <div className="h-6 w-72 rounded bg-muted" />
        <div className="flex gap-2">
          <div className="h-5 w-12 rounded-full bg-muted" />
          <div className="h-5 w-12 rounded-full bg-muted" />
        </div>
      </div>
      {/* Tabs skeleton */}
      <div className="flex gap-2 border-b border-border pb-3">
        <div className="h-7 w-28 rounded-full bg-muted" />
        <div className="h-7 w-28 rounded-full bg-muted/60" />
      </div>
      {/* Content skeleton */}
      <div className="flex gap-3 overflow-hidden">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-24 w-28 shrink-0 rounded-[9px] bg-muted" />
        ))}
      </div>
    </div>
  )
}
