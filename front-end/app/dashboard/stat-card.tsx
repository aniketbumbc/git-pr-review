export function StatCard({
  label,
  value,
  note,
}: {
  label: string;
  value: string;
  note: string;
}) {
  return (
    <div className="flex-1 min-w-[150px] rounded-lg border border-divider bg-surface px-[15px] py-[13px]">
      <span className="block text-[11px] uppercase tracking-wide text-fg/45">{label}</span>
      <span className="block mt-1 text-[22px] font-medium tracking-tight">{value}</span>
      <span className="block mt-0.5 text-[11px] text-fg/45">{note}</span>
    </div>
  );
}
