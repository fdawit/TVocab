import { fmtShort, fmtTime } from '../lib/dates';
import type { Pull, Spot } from '../lib/types';
import { SpotBadge } from './ui';

/** One row in the logbook / history lists. Tapping it opens the pull for editing. */
export function PullCard({ pull, spot, showDate = false }: { pull: Pull; spot?: Spot; showDate?: boolean }) {
  return (
    <a className="pull-card" href={`#/log?edit=${pull.id}`}>
      {spot ? <SpotBadge number={spot.number} /> : <span className="spot-badge s-new">?</span>}
      <div className="pull-main">
        <div className="pull-title">
          {spot?.name ?? 'Deleted spot'}
          <span className="pull-time">
            {showDate && `${fmtShort(pull.at)} · `}
            {fmtTime(pull.at)}
          </span>
        </div>
        <div className="pull-meta">
          {[pull.trapType, pull.bait].filter(Boolean).join(' · ') || 'No trap/bait noted'}
        </div>
        {(pull.overnight || pull.experimental) && (
          <div className="pull-tags">
            {pull.overnight && <span className="tag tag-night">🌙 Overnight</span>}
            {pull.experimental && <span className="tag tag-exp">🧪 Experimental</span>}
          </div>
        )}
        {pull.notes && <div className="pull-notes">“{pull.notes}”</div>}
      </div>
      <div className={`keepers ${pull.keepers === 0 ? 'zero' : ''}`}>
        <strong>{pull.keepers}</strong>
        <small>keeper{pull.keepers === 1 ? '' : 's'}</small>
      </div>
    </a>
  );
}
