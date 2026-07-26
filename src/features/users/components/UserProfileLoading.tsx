export function UserProfileLoading() {
  return (
    <div className="space-y-6">
      <div className="h-32 animate-pulse rounded-xl border border-slate-800 bg-slate-950" />

      <div className="grid gap-6 xl:grid-cols-2">
        <div className="h-64 animate-pulse rounded-xl border border-slate-800 bg-slate-950" />
        <div className="h-64 animate-pulse rounded-xl border border-slate-800 bg-slate-950" />
      </div>
    </div>
  );
}