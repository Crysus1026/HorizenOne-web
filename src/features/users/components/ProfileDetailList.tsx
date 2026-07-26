export type ProfileDetailItem = {
  label: string;
  value: string;
};

type ProfileDetailListProps = {
  items: ProfileDetailItem[];
};

export function ProfileDetailList({
  items,
}: ProfileDetailListProps) {
  return (
    <dl className="grid gap-5 sm:grid-cols-2">
      {items.map((item) => (
        <div key={item.label}>
          <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
            {item.label}
          </dt>

          <dd className="mt-1 text-sm text-slate-100">
            {item.value || "—"}
          </dd>
        </div>
      ))}
    </dl>
  );
}