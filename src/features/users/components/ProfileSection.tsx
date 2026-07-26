import type { ReactNode } from "react";

type ProfileSectionProps = {
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
};

export function ProfileSection({
  title,
  description,
  actions,
  children,
}: ProfileSectionProps) {
  return (
    <section className="overflow-hidden rounded-xl border border-slate-800 bg-slate-950">
      <div className="flex flex-col gap-4 border-b border-slate-800 px-5 py-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white">
            {title}
          </h2>

          {description ? (
            <p className="mt-1 text-sm text-slate-400">
              {description}
            </p>
          ) : null}
        </div>

        {actions ? (
          <div className="shrink-0">
            {actions}
          </div>
        ) : null}
      </div>

      <div className="p-5">{children}</div>
    </section>
  );
}