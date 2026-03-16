import type { WasmCutSite } from "../types/wasm";

interface CutSiteListProps {
  cutSites: WasmCutSite[];
  isLoading: boolean;
}

export function CutSiteList({ cutSites, isLoading }: CutSiteListProps) {
  if (isLoading) {
    return <div className="cut-site-list">Calculating cut sites...</div>;
  }

  if (cutSites.length === 0) {
    return null;
  }

  // Group cut sites by enzyme name.
  const grouped = new Map<string, WasmCutSite[]>();
  for (const site of cutSites) {
    const existing = grouped.get(site.enzyme_name) || [];
    existing.push(site);
    grouped.set(site.enzyme_name, existing);
  }

  return (
    <div className="cut-site-list">
      <h3>Cut Sites ({cutSites.length})</h3>
      <div className="cut-site-groups">
        {Array.from(grouped.entries()).map(([enzyme, sites]) => (
          <div key={enzyme} className="cut-site-group">
            <span className="enzyme-name">
              {enzyme} ({sites.length})
            </span>
            <span className="cut-positions">{sites.map((s) => s.position + 1).join(", ")}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
