import React from "react";

export interface FilterGroup {
  label: string;
  key: string;
  options: string[];
}

interface Props {
  groups: FilterGroup[];
  active: Record<string, string>;
  onChange: (key: string, value: string) => void;
  resultCount?: number;
  totalCount?: number;
}

export function FilterBar({ groups, active, onChange, resultCount, totalCount }: Props) {
  const hasActiveFilter = groups.some((g) => active[g.key] && active[g.key] !== "All");

  return (
    <div className="filter-bar">
      {groups.map((group, gi) => (
        <React.Fragment key={group.key}>
          {gi > 0 && <div className="filter-sep" />}
          <div className="filter-group">
            <span className="filter-label">{group.label}</span>
            {group.options.map((opt) => (
              <button
                key={opt}
                className={`filter-pill ${active[group.key] === opt ? "active" : ""}`}
                onClick={() => onChange(group.key, active[group.key] === opt ? "All" : opt)}
              >
                {opt}
              </button>
            ))}
          </div>
        </React.Fragment>
      ))}
      {hasActiveFilter && resultCount !== undefined && totalCount !== undefined && (
        <span className="filter-active-summary">
          Showing {resultCount} of {totalCount}
        </span>
      )}
    </div>
  );
}
