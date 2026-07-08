import React from "react";
import type { OrfResult, RestrictionCutSite } from "../types/sequence";

interface Props {
  length: number;
  orfs: OrfResult[];
  restrictionSites: RestrictionCutSite[];
}

// 線形のシーケンストラック（ORF と制限酵素サイトの位置をざっくり表示）
export const SequenceTrack: React.FC<Props> = ({
  length,
  orfs,
  restrictionSites,
}) => {
  if (length <= 0) {
    return null;
  }

  const toPercent = (pos: number) => (100 * pos) / length;

  return (
    <div className="seq-track">
      <div className="seq-track-scale">
        <span>0</span>
        <span>{length} bp</span>
      </div>
      <div className="seq-track-bar">
        {orfs.map((orf, idx) => {
          const startPct = toPercent(orf.start - 1);
          const widthPct = toPercent(orf.end - orf.start + 1);
          return (
            <div
              key={`orf-${idx}`}
              className="seq-track-orf"
              style={{ left: `${startPct}%`, width: `${widthPct}%` }}
              title={`ORF ${idx + 1}: frame=${orf.frame}, ${orf.start}-${orf.end}`}
            />
          );
        })}
        {restrictionSites.flatMap((site) =>
          site.cut_positions.map((pos, idx) => {
            const leftPct = toPercent(pos - 1);
            return (
              <div
                key={`cut-${site.enzyme}-${idx}`}
                className="seq-track-cut"
                style={{ left: `${leftPct}%` }}
                title={`${site.enzyme} cut at ${pos}`}
              />
            );
          }),
        )}
      </div>
      <div className="seq-track-legend">
        <span className="legend-item">
          <span className="legend-box orf" /> ORF
        </span>
        <span className="legend-item">
          <span className="legend-box cut" /> 制限酵素サイト
        </span>
      </div>
    </div>
  );
};

