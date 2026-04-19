export default function Loading() {
  return (
    <div className="flex h-full flex-col gap-4 p-4">
      <div className="bg-muted/60 h-8 w-40 animate-pulse rounded-md" />
      <div className="bg-muted/60 h-28 w-full animate-pulse rounded-xl" />
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-muted/60 h-24 animate-pulse rounded-xl" />
        <div className="bg-muted/60 h-24 animate-pulse rounded-xl" />
        <div className="bg-muted/60 h-24 animate-pulse rounded-xl" />
        <div className="bg-muted/60 h-24 animate-pulse rounded-xl" />
      </div>
    </div>
  );
}
