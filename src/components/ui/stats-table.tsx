"use client";
import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp } from "lucide-react";

export interface Col<T> { key: keyof T & string; label: string; abbr?: string; numeric?: boolean }

/** Tableau triable. aria-sort sur l'en-tête actif ; défile horizontalement dans son cadre sur mobile. */
export function StatsTable<T extends Record<string, string | number>>({ cols, rows, caption, initialSort }: {
  cols: Col<T>[]; rows: T[]; caption: string; initialSort?: keyof T & string;
}) {
  const [sort, setSort] = useState<{ key: keyof T & string; dir: "asc" | "desc" }>({ key: initialSort ?? cols[0]!.key, dir: "desc" });
  const sorted = useMemo(() => {
    const r = [...rows].sort((a, b) => {
      const x = a[sort.key], y = b[sort.key];
      const c = typeof x === "number" && typeof y === "number" ? x - y : String(x).localeCompare(String(y), "fr-CA");
      return sort.dir === "asc" ? c : -c;
    });
    return r;
  }, [rows, sort]);

  if (!rows.length) return <p className="rounded-lg border border-border bg-surface p-6 text-center text-muted">Pas encore de stats. Elles apparaissent après le premier match pointé.</p>;

  return (
    <div className="overflow-x-auto rounded-lg border border-border bg-surface">
      <table className="w-full min-w-[480px] text-sm">
        <caption className="sr-only">{caption}</caption>
        <thead className="bg-surface-2">
          <tr>
            {cols.map((c) => {
              const active = sort.key === c.key;
              return (
                <th key={c.key} scope="col" aria-sort={active ? (sort.dir === "asc" ? "ascending" : "descending") : "none"}
                  className={c.numeric ? "text-right" : "text-left"}>
                  <button
                    type="button"
                    onClick={() => setSort({ key: c.key, dir: active && sort.dir === "desc" ? "asc" : "desc" })}
                    className="inline-flex h-10 items-center gap-1 px-3 font-bold text-text hover:text-accent-strong"
                    title={c.label}
                  >
                    {c.abbr ? <abbr title={c.label} className="no-underline">{c.abbr}</abbr> : c.label}
                    {active && (sort.dir === "asc" ? <ArrowUp aria-hidden className="size-3.5" /> : <ArrowDown aria-hidden className="size-3.5" />)}
                  </button>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {sorted.map((r, i) => (
            <tr key={i} className="hover:bg-surface-2">
              {cols.map((c, j) =>
                j === 0 ? (
                  <th key={c.key} scope="row" className="px-3 py-2.5 text-left font-semibold">{r[c.key]}</th>
                ) : (
                  <td key={c.key} className={c.numeric ? "px-3 py-2.5 text-right tabular" : "px-3 py-2.5"}>{r[c.key]}</td>
                ),
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
