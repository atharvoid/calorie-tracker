"use client"

type TopFood = {
  name: string
  totalKcal: number
  totalProteinG: number
  count: number
}

type Props = {
  byKcal: TopFood[]
  byProtein: TopFood[]
  loading?: boolean
}

function FoodTable({
  foods,
  valueKey,
  label,
}: {
  foods: TopFood[]
  valueKey: "totalKcal" | "totalProteinG"
  label: string
}) {
  if (foods.length === 0) {
    return <p className="text-xs text-muted py-2">No data yet.</p>
  }

  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-subtle">
          <th className="pb-2 text-left text-xs font-medium uppercase tracking-wide text-muted">Food</th>
          <th className="pb-2 text-right text-xs font-medium uppercase tracking-wide text-muted">{label}</th>
          <th className="pb-2 text-right text-xs font-medium uppercase tracking-wide text-muted">#</th>
        </tr>
      </thead>
      <tbody>
        {foods.map((f) => (
          <tr key={f.name} className="border-b border-subtle last:border-0">
            <td className="py-1.5 text-secondary truncate max-w-[140px]" title={f.name}>
              {f.name}
            </td>
            <td className="py-1.5 text-right font-mono tabular text-primary">
              {valueKey === "totalKcal"
                ? `${Math.round(f.totalKcal).toLocaleString("en-IN")} kcal`
                : `${f.totalProteinG.toFixed(1)}g`}
            </td>
            <td className="py-1.5 text-right text-muted tabular">{f.count}×</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

export function TopFoods({ byKcal, byProtein, loading = false }: Props) {
  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 animate-pulse">
        <div className="h-40 rounded-xl bg-elevated" />
        <div className="h-40 rounded-xl bg-elevated" />
      </div>
    )
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div>
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted">
          Top foods by calories
        </p>
        <FoodTable foods={byKcal} valueKey="totalKcal" label="Total kcal" />
      </div>
      <div>
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted">
          Top foods by protein
        </p>
        <FoodTable foods={byProtein} valueKey="totalProteinG" label="Total protein" />
      </div>
    </div>
  )
}
