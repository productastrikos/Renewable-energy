import { useState } from "react";
import { SITE_ASSET_HIERARCHY, SiteHierarchy } from "../../data/mockData";
import { fetchHierarchy } from "../../api/endpoints";
import { useApi } from "../../hooks/useApi";
import { IcoChevronRight, IcoLayers, IcoChevronLeft } from "./Icons";

// ─── Tree node ────────────────────────────────────────────────────────────────
function TreeNode({
  id,
  label,
  status,
  health,
  alarms,
  indent = 0,
  selected,
  onSelect,
  children,
}: {
  id: string;
  label: string;
  status: string;
  health: number;
  alarms: number;
  indent?: number;
  selected: string;
  onSelect: (id: string) => void;
  children?: React.ReactNode;
}) {
  const [expanded, setExpanded] = useState(indent <= 1);
  const isSelected = selected === id;
  const statusColor = status === "danger" ? "var(--ds-danger)" : status === "warning" ? "var(--ds-warning)" : "var(--ds-success)";

  return (
    <div>
      <div
        className={`asset-tree-node${isSelected ? " selected" : ""}`}
        style={{ paddingLeft: 6 + indent * 14 }}
        onClick={() => {
          onSelect(id);
          if (children) setExpanded((e) => !e);
        }}
      >
        {children ? (
          <IcoChevronRight
            width={9}
            height={9}
            style={{ transform: expanded ? "rotate(90deg)" : "none", transition: "transform 0.14s", flexShrink: 0, color: "var(--ds-text-faint)" }}
          />
        ) : (
          <span style={{ width: 9, flexShrink: 0 }} />
        )}
        <span className="atn-dot" style={{ background: statusColor }} />
        <span className="atn-label">{label}</span>
        {alarms > 0 && <span className="atn-alarm">{alarms}</span>}
        <span className="atn-health" style={{ color: health >= 85 ? "var(--ds-success)" : health >= 70 ? "var(--ds-warning)" : "var(--ds-danger)" }}>
          {health}%
        </span>
      </div>
      {children && expanded && <div>{children}</div>}
    </div>
  );
}

// ─── Panel ────────────────────────────────────────────────────────────────────
interface Props {
  siteId: string;
  siteName: string;
  siteHealth: number;
  siteAlarms: number;
  selectedId: string;
  onSelect: (id: string) => void;
}

export function AssetHierarchyPanel({ siteId, siteName, siteHealth, siteAlarms, selectedId, onSelect }: Props) {
  const [collapsed, setCollapsed] = useState(false);
  const { data: apiHierarchy } = useApi(() => fetchHierarchy(siteId), [siteId]);
  const hierarchy: SiteHierarchy | undefined = apiHierarchy ?? SITE_ASSET_HIERARCHY[siteId];

  if (collapsed) {
    return (
      <div className="ahp-collapsed">
        <button className="ahp-collapse-btn" onClick={() => setCollapsed(false)} title="Show Asset Hierarchy">
          <IcoLayers width={14} height={14} />
        </button>
      </div>
    );
  }

  if (!hierarchy) {
    return (
      <div className="asset-hierarchy-panel">
        <div className="ahp-header">
          <IcoLayers width={12} height={12} />
          <span style={{ flex: 1 }}>Asset Hierarchy</span>
          <button className="ahp-collapse-btn" onClick={() => setCollapsed(true)} title="Collapse">
            <IcoChevronLeft width={11} height={11} />
          </button>
        </div>
        <div style={{ padding: 12, fontSize: 11, color: "var(--ds-text-faint)" }}>No hierarchy for {siteName}</div>
      </div>
    );
  }

  const blockHealthBadge = (invs: (typeof hierarchy.blocks)[0]["inverters"]) => ({
    status: invs.some((i) => i.status === "danger") ? "danger" : invs.some((i) => i.status === "warning") ? "warning" : "success",
    health: Math.round(invs.reduce((s, i) => s + i.health, 0) / invs.length),
    alarms: invs.reduce((s, i) => s + i.alarms, 0),
  });

  return (
    <div className="asset-hierarchy-panel swp-hierarchy">
      {/* <div className="ahp-header">
        <IcoLayers width={11} height={11} />
        <span style={{ flex: 1 }}>Asset Hierarchy</span>
        <button className="ahp-collapse-btn" onClick={() => setCollapsed(true)} title="Collapse">
          <IcoChevronLeft width={11} height={11} />
        </button>
      </div> */}

      <div className="asset-tree">
        {/* Site root */}
        <TreeNode
          id={siteId}
          label={siteName}
          status={siteHealth >= 85 ? "success" : siteHealth >= 70 ? "warning" : "danger"}
          health={siteHealth}
          alarms={siteAlarms}
          indent={0}
          selected={selectedId}
          onSelect={onSelect}
        >
          {/* Blocks → Inverters */}
          {hierarchy.blocks.map((block) => {
            const bh = blockHealthBadge(block.inverters);
            return (
              <TreeNode
                key={block.id}
                id={block.id}
                label={block.name}
                status={bh.status}
                health={bh.health}
                alarms={bh.alarms}
                indent={1}
                selected={selectedId}
                onSelect={onSelect}
              >
                {block.inverters.map((inv) => (
                  <TreeNode
                    key={inv.id}
                    id={inv.id}
                    label={inv.name}
                    status={inv.status}
                    health={inv.health}
                    alarms={inv.alarms}
                    indent={2}
                    selected={selectedId}
                    onSelect={onSelect}
                  />
                ))}
              </TreeNode>
            );
          })}

          {/* Transformers */}
          {hierarchy.transformers.map((tx) => (
            <TreeNode
              key={tx.id}
              id={tx.id}
              label={tx.name}
              status={tx.status}
              health={tx.health}
              alarms={tx.alarms}
              indent={1}
              selected={selectedId}
              onSelect={onSelect}
            />
          ))}

          {/* Fixed assets */}
          <TreeNode
            id={hierarchy.switchyard.id}
            label={hierarchy.switchyard.name}
            status={hierarchy.switchyard.status}
            health={hierarchy.switchyard.health}
            alarms={hierarchy.switchyard.alarms}
            indent={1}
            selected={selectedId}
            onSelect={onSelect}
          />

          {hierarchy.weatherStation && (
            <TreeNode
              id={hierarchy.weatherStation.id}
              label={hierarchy.weatherStation.name}
              status={hierarchy.weatherStation.status}
              health={hierarchy.weatherStation.health}
              alarms={hierarchy.weatherStation.alarms}
              indent={1}
              selected={selectedId}
              onSelect={onSelect}
            />
          )}

          <TreeNode
            id={hierarchy.scada.id}
            label={hierarchy.scada.name}
            status={hierarchy.scada.status}
            health={hierarchy.scada.health}
            alarms={hierarchy.scada.alarms}
            indent={1}
            selected={selectedId}
            onSelect={onSelect}
          />

          {hierarchy.bess && (
            <TreeNode
              id={hierarchy.bess.id}
              label={hierarchy.bess.name}
              status={hierarchy.bess.status}
              health={hierarchy.bess.health}
              alarms={hierarchy.bess.alarms}
              indent={1}
              selected={selectedId}
              onSelect={onSelect}
            />
          )}
        </TreeNode>
      </div>
    </div>
  );
}
