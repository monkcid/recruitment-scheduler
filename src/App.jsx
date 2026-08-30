import { useState, useEffect, useMemo, useRef } from 'react';
import SchedulingForm, { UpcomingPanel, ROLES } from './components/SchedulingForm';
import './App.css';

// ===== Tracker (Advanced scheduling) column IDs =====
export const COLUMN_IDS = {
  candidateName: 1319526027005828,
  emailId: 5823125654376324,
  greenhouse: 3571325840691076,
  recruiter: 8074925468061572,
  coordinator: 2747206844845956, // RC
  role: 4999006658531204,
  rounds: {
    1: { interviewer: 495407031160708, date: 8658181355769732, time: 829701515677572, duration: 4717531681820548 },
    2: { interviewer: 4154581728399236, date: 6406381542084484, time: 5333301143048068, duration: 213932054450052 },
    3: { interviewer: 1902781914713988, date: 7532281448927108, time: 3028681821556612, duration: 8798918844125060 },
    4: { interviewer: 5280481635241860, date: 776882007871364, time: 8095231402348420, duration: 4295319216754564 },
    5: { interviewer: 3591631774977924, date: 5843431588663172, time: 1339831961292676, duration: 6547119030439812 },
  },
  rescheduleCounter: 6969331495505796,
  specialRequests: 2043519403069316,
  status: 2465731868135300,
  priority: 7673018937282436,
  requestedOn: 3169419309911940,
};

// ===== Archive sheet column IDs (mapped → tracker IDs on load) =====
const ARCHIVE_TO_TRACKER = {
  3361296839643012: COLUMN_IDS.candidateName,
  7864896467013508: COLUMN_IDS.emailId,
  2235396932800388: COLUMN_IDS.greenhouse,
  6738996560170884: COLUMN_IDS.recruiter,
  4487196746485636: COLUMN_IDS.coordinator,
  8990796373856132: COLUMN_IDS.role,
  9985398181764: COLUMN_IDS.rounds[1].interviewer,
  4513585025552260: COLUMN_IDS.rounds[1].date,
  2261785211867012: COLUMN_IDS.rounds[1].time,
  6765384839237508: COLUMN_IDS.rounds[1].duration,
  1135885305024388: COLUMN_IDS.rounds[2].interviewer,
  5639484932394884: COLUMN_IDS.rounds[2].date,
  3387685118709636: COLUMN_IDS.rounds[2].time,
  7891284746080132: COLUMN_IDS.rounds[2].duration,
  572935351603076: COLUMN_IDS.rounds[3].interviewer,
  5076534978973572: COLUMN_IDS.rounds[3].date,
  2824735165288324: COLUMN_IDS.rounds[3].time,
  7328334792658820: COLUMN_IDS.rounds[3].duration,
  1698835258445700: COLUMN_IDS.rounds[4].interviewer,
  6202434885816196: COLUMN_IDS.rounds[4].date,
  3950635072130948: COLUMN_IDS.rounds[4].time,
  8454234699501444: COLUMN_IDS.rounds[4].duration,
  291460374892420: COLUMN_IDS.rounds[5].interviewer,
  4795060002262916: COLUMN_IDS.rounds[5].date,
  2543260188577668: COLUMN_IDS.rounds[5].time,
  7046859815948164: COLUMN_IDS.rounds[5].duration,
  1417360281735044: COLUMN_IDS.rescheduleCounter,
  5920959909105540: COLUMN_IDS.status,
  3669160095420292: COLUMN_IDS.specialRequests,
  8172759722790788: COLUMN_IDS.priority,
  854410328313732: COLUMN_IDS.requestedOn,
};

function normalizeArchiveRow(row) {
  return {
    ...row,
    isArchived: true,
    cells: (row.cells || []).map(c => ({
      ...c,
      columnId: ARCHIVE_TO_TRACKER[c.columnId] || c.columnId,
    })),
  };
}

// ===== Log sheet column IDs =====
const LOG_COLS = {
  loggedAt: 3072160715018116,
  eventType: 7575760342388612,
  candidate: 1946260808175492,
  panel: 6449860435545988,
  round: 4198060621860740,
  reason: 8701660249231236,
  rescheduledBy: 2371420426112900,
  reportedBy: 538885924622212,
};

export function getCell(row, columnId) {
  const cell = row.cells?.find(c => c.columnId === columnId);
  return cell?.displayValue ?? cell?.value ?? '';
}

const SECTION_NAMES = ['📋 PENDING', '📅 SCHEDULED', '✅ COMPLETED'];
export function isStructuralRow(row) {
  const name = String(getCell(row, COLUMN_IDS.candidateName) || '').trim();
  return !name || SECTION_NAMES.includes(name) || name.startsWith('━');
}

export function parseDate(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (!isNaN(d.getTime())) return d;
  const m = String(dateStr).match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
  if (m) {
    const d2 = new Date(`${m[3].length === 2 ? '20' + m[3] : m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`);
    if (!isNaN(d2.getTime())) return d2;
  }
  return null;
}

function startOfWeekMonday(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay();
  d.setDate(d.getDate() + (day === 0 ? -6 : 1 - day));
  return d;
}

function upcomingWeekLabel(weekStart, today) {
  const thisWeek = startOfWeekMonday(today);
  const diff = Math.round((weekStart - thisWeek) / (7 * 24 * 3600 * 1000));
  if (diff === 0) return 'This Week';
  if (diff === 1) return 'Next Week';
  const end = new Date(weekStart);
  end.setDate(end.getDate() + 6);
  const fmt = (d) => d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  return `${fmt(weekStart)} – ${fmt(end)}`;
}

// ===== Smartsheet logo =====
export function Logo() {
  return (
    <svg viewBox="0 0 100 100" className="logo" xmlns="http://www.w3.org/2000/svg">
      <rect width="100" height="100" fill="#0f2043" rx="8" />
      <path
        d="M30 30 h40 L45 62 c-3 5 -7 4 -9 0 l-6 -12 c4 -3 8 -2 10 1 l3 5 L60 34 H30 c-2 8 0 25 2 33 10 -2 22 -8 30 -16 l4 4 c-9 10 -23 17 -36 19 -4 -10 -5 -30 0 -44z"
        fill="#ffffff"
      />
    </svg>
  );
}

// ===== Autocomplete: type start OR middle of a word, matching options appear =====
export function AutocompleteInput({ options, value, onChange, placeholder }) {
  const [text, setText] = useState('');
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    const onDocClick = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  const filtered = useMemo(() => {
    const q = text.trim().toLowerCase();
    if (!q) return options;
    return options.filter(o => o.toLowerCase().includes(q));
  }, [options, text]);

  // Selecting fills the value AND clears the input — ready for the next search
  const select = (opt) => {
    onChange(opt);
    setText('');
    setOpen(false);
  };

  return (
    <div className="autocomplete" ref={wrapRef}>
      <input
        type="text"
        value={text}
        placeholder={value ? `Selected: ${value} — type to search again` : placeholder}
        onChange={(e) => { setText(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
      />
      {value && (
        <div className="selected-chip">
          {value}
          <button type="button" className="chip-clear" onClick={() => onChange('')}>×</button>
        </div>
      )}
      {open && filtered.length > 0 && (
        <div className="autocomplete-list">
          {filtered.map(opt => (
            <div key={opt} className="autocomplete-item" onMouseDown={() => select(opt)}>
              {opt}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ===== Interactive mini calendar (current month → +2 months) =====
function MiniCalendar() {
  const [offset, setOffset] = useState(0); // 0 = current month, max 2
  const today = new Date();
  const view = new Date(today.getFullYear(), today.getMonth() + offset, 1);
  const daysInMonth = new Date(view.getFullYear(), view.getMonth() + 1, 0).getDate();
  const startOffset = (view.getDay() + 6) % 7;
  const isCurrentMonth = offset === 0;

  const cells = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <div className="mini-calendar">
      <div className="mini-cal-nav">
        <button
          className="mini-cal-btn"
          onClick={() => setOffset(o => Math.max(0, o - 1))}
          disabled={offset === 0}
        >‹</button>
        <div className="mini-cal-title">
          {view.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
        </div>
        <button
          className="mini-cal-btn"
          onClick={() => setOffset(o => Math.min(2, o + 1))}
          disabled={offset === 2}
        >›</button>
      </div>
      <div className="mini-cal-grid">
        {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
          <div key={'h' + i} className="mini-cal-dow">{d}</div>
        ))}
        {cells.map((d, i) => (
          <div
            key={i}
            className={`mini-cal-day${isCurrentMonth && d === today.getDate() ? ' today' : ''}${d === null ? ' empty' : ''}`}
          >
            {d || ''}
          </div>
        ))}
      </div>
    </div>
  );
}

// ===== Reschedule Corner (current month) =====
function RescheduleCorner({ logs }) {
  const stats = useMemo(() => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    const events = logs
      .map(row => ({
        type: getCell(row, LOG_COLS.eventType),
        candidate: getCell(row, LOG_COLS.candidate),
        panel: getCell(row, LOG_COLS.panel),
        reason: getCell(row, LOG_COLS.reason),
        rescheduledBy: getCell(row, LOG_COLS.rescheduledBy) || 'Other',
        loggedAt: parseDate(String(getCell(row, LOG_COLS.loggedAt)).slice(0, 10)),
      }))
      .filter(e => e.type === 'Reschedule' &&
        e.loggedAt && e.loggedAt >= monthStart && e.loggedAt <= monthEnd);

    const byCandidate = {};
    const byPanel = {};
    let candidateCount = 0;
    let panelCount = 0;

    events.forEach(e => {
      if (e.rescheduledBy === 'Candidate') {
        candidateCount++;
        if (e.candidate) byCandidate[e.candidate] = (byCandidate[e.candidate] || 0) + 1;
      } else if (e.rescheduledBy === 'Panel') {
        panelCount++;
        if (e.panel) {
          if (!byPanel[e.panel]) byPanel[e.panel] = [];
          byPanel[e.panel].push(e.reason || '(no reason given)');
        }
      }
    });

    return { total: events.length, candidateCount, panelCount, byCandidate, byPanel };
  }, [logs]);

  return (
    <div className="reschedule-corner">
      <h3>🔄 Reschedule Corner <span className="rc-month">({new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })})</span></h3>

      <div className="rc-totals-row">
        <div className="rc-total">
          <span className="stat-number">{stats.total}</span>
          <span className="stat-desc">Total reschedules</span>
        </div>
        <div className="rc-total">
          <span className="stat-number">{stats.candidateCount}</span>
          <span className="stat-desc">Candidate-initiated</span>
        </div>
        <div className="rc-total">
          <span className="stat-number">{stats.panelCount}</span>
          <span className="stat-desc">Panel-initiated</span>
        </div>
      </div>

      <div className="rc-columns">
        <div className="rc-block">
          <h4>Candidate Reschedules</h4>
          {Object.keys(stats.byCandidate).length === 0 ? (
            <p className="rc-empty">No candidate-initiated reschedules this month</p>
          ) : (
            <ul>
              {Object.entries(stats.byCandidate)
                .sort((a, b) => b[1] - a[1])
                .map(([name, count]) => (
                  <li key={name}><strong>{name}</strong> — {count}</li>
                ))}
            </ul>
          )}
        </div>

        <div className="rc-block">
          <h4>Panel Reschedules (with reasons)</h4>
          {Object.keys(stats.byPanel).length === 0 ? (
            <p className="rc-empty">No panel-initiated reschedules this month</p>
          ) : (
            <ul>
              {Object.entries(stats.byPanel).map(([panel, reasons]) => (
                <li key={panel}>
                  <strong>{panel}</strong> — {reasons.length}
                  <ul className="rc-reasons">
                    {reasons.map((r, i) => <li key={i}>{r}</li>)}
                  </ul>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

// Combine an item's date + time string ("2:00 PM") into a full datetime.
// If no time is given, the interview counts as done only after the whole day passes.
function eventDateTime(item) {
  const dt = new Date(item.date);
  const m = String(item.timeStr || '').match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (m) {
    let h = parseInt(m[1], 10) % 12;
    if (m[3].toUpperCase() === 'PM') h += 12;
    dt.setHours(h, parseInt(m[2], 10), 0, 0);
  } else {
    dt.setHours(23, 59, 59, 999);
  }
  return dt;
}

// ===== Interview Heatmap calendar (month view of an interviewer's schedule) =====
function InterviewCalendar({ items }) {
  const [offset, setOffset] = useState(0); // months from current; -12..+12
  const [now, setNow] = useState(new Date());
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Real-time: re-check every 30 seconds so pills flip orange → green live
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(t);
  }, []);
  const view = new Date(today.getFullYear(), today.getMonth() + offset, 1);
  const daysInMonth = new Date(view.getFullYear(), view.getMonth() + 1, 0).getDate();
  const startOffset = view.getDay(); // Sunday-first, like a classic calendar

  const byDay = useMemo(() => {
    const map = {};
    items.forEach(item => {
      const key = `${item.date.getFullYear()}-${item.date.getMonth()}-${item.date.getDate()}`;
      if (!map[key]) map[key] = [];
      map[key].push(item);
    });
    return map;
  }, [items]);

  const cells = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const isToday = (d) =>
    offset === 0 && d === new Date().getDate();

  return (
    <div className="big-calendar">
      <div className="big-cal-nav">
        <h4>📅 Interview Heatmap</h4>
        <div className="big-cal-controls">
          <button className="mini-cal-btn" onClick={() => setOffset(o => Math.max(-12, o - 1))}>‹</button>
          <span className="big-cal-title">
            {view.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
          </span>
          <button className="mini-cal-btn" onClick={() => setOffset(o => Math.min(12, o + 1))}>›</button>
          {offset !== 0 && (
            <button className="btn-today" onClick={() => setOffset(0)}>Today</button>
          )}
        </div>
      </div>

      <div className="big-cal-grid">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
          <div key={d} className="big-cal-dow">{d}</div>
        ))}
        {cells.map((d, i) => {
          if (d === null) return <div key={i} className="big-cal-cell empty" />;
          const cellDate = new Date(view.getFullYear(), view.getMonth(), d);
          const key = `${cellDate.getFullYear()}-${cellDate.getMonth()}-${cellDate.getDate()}`;
          const dayItems = byDay[key] || [];
          const isPast = cellDate < today;
          return (
            <div key={i} className={`big-cal-cell${isPast ? ' past' : ''}`}>
              <span className={`big-cal-daynum${isToday(d) ? ' today' : ''}`}>{d}</span>
              {dayItems.map((item, ii) => {
                const done = eventDateTime(item) <= now; // real-time: green once date & time have passed
                return (
                  <div
                    key={ii}
                    className={`cal-event${done ? ' done' : ''}`}
                    title={`${item.candidate} · Round ${item.round} · ${item.role || '—'}${item.timeStr ? ` · ${item.timeStr}` : ''} · ${done ? 'Done' : 'Scheduled'}`}
                  >
                    <span className={`cal-event-dot${done ? ' done' : ''}`} />
                    <span className="cal-event-body">
                      <span className="cal-event-name">{item.candidate}</span>
                      <span className="cal-event-meta">R{item.round}{item.role ? ` · ${item.role}` : ''}</span>
                    </span>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ===== Interviewer Heatmap =====
function InterviewHeatmap({ allRows, logs }) {
  const [selected, setSelected] = useState('');

  const interviewers = useMemo(() => {
    const names = new Set();
    allRows.forEach(row => {
      if (isStructuralRow(row)) return;
      for (let r = 1; r <= 5; r++) {
        const name = getCell(row, COLUMN_IDS.rounds[r].interviewer);
        if (name) names.add(name);
      }
    });
    return Array.from(names).sort();
  }, [allRows]);

  const stats = useMemo(() => {
    if (!selected) return null;
    const dayStart = new Date();
    dayStart.setHours(0, 0, 0, 0);
    const monthStart = new Date(dayStart.getFullYear(), dayStart.getMonth(), 1);
    const fourWeeksAgo = new Date(dayStart);
    fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);

    let total = 0;
    let thisMonth = 0;
    let lastFourWeeks = 0;
    const calendarItems = []; // ALL dated interviews for this interviewer — past, today, future

    allRows.forEach(row => {
      if (isStructuralRow(row)) return;
      for (let r = 1; r <= 5; r++) {
        const name = getCell(row, COLUMN_IDS.rounds[r].interviewer);
        if ((name || '').toLowerCase() !== selected.toLowerCase()) continue;
        const date = parseDate(getCell(row, COLUMN_IDS.rounds[r].date));
        if (!date) continue;

        calendarItems.push({
          date,
          timeStr: getCell(row, COLUMN_IDS.rounds[r].time),
          candidate: getCell(row, COLUMN_IDS.candidateName),
          role: getCell(row, COLUMN_IDS.role),
          round: r,
        });

        if (date >= dayStart) continue; // future → calendar only
        total++;
        if (date >= monthStart) thisMonth++;
        if (date >= fourWeeksAgo) lastFourWeeks++;
      }
    });

    calendarItems.sort((a, b) => a.date - b.date);
    const upcomingTotal = calendarItems.filter(i => i.date >= dayStart).length;

    const reschedules = logs
      .map(row => ({
        type: getCell(row, LOG_COLS.eventType),
        panel: getCell(row, LOG_COLS.panel),
        reason: getCell(row, LOG_COLS.reason),
      }))
      .filter(e => e.type === 'Reschedule' &&
        (e.panel || '').toLowerCase() === selected.toLowerCase());

    const reasonCounts = {};
    reschedules.forEach(e => {
      const key = (e.reason || '(no reason given)').trim().toLowerCase();
      reasonCounts[key] = (reasonCounts[key] || 0) + 1;
    });
    const topReason = Object.entries(reasonCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || '—';

    return {
      total,
      thisMonth,
      avgWeekly: (lastFourWeeks / 4).toFixed(1),
      rescheduleCount: reschedules.length,
      topReason,
      upcomingTotal,
      calendarItems,
    };
  }, [allRows, logs, selected]);

  return (
    <div className="heatmap">
      <h3>🔥 Interviewer Heatmap</h3>
      <AutocompleteInput
        options={interviewers}
        value={selected}
        onChange={setSelected}
        placeholder="Type any part of an interviewer's name…"
      />

      {stats && (
        <>
          <div className="heatmap-grid">
            <div className="stat-card">
              <span className="stat-number">{stats.total}</span>
              <span className="stat-desc">Total interviews so far</span>
            </div>
            <div className="stat-card">
              <span className="stat-number">{stats.thisMonth}</span>
              <span className="stat-desc">This month</span>
            </div>
            <div className="stat-card">
              <span className="stat-number">{stats.avgWeekly}</span>
              <span className="stat-desc">Avg weekly (last 4 weeks)</span>
            </div>
            <div className="stat-card">
              <span className="stat-number">{stats.rescheduleCount}</span>
              <span className="stat-desc">Total reschedule requests</span>
            </div>
            <div className="stat-card stat-card-wide">
              <span className="stat-reason">{stats.topReason}</span>
              <span className="stat-desc">Most common reschedule reason</span>
            </div>
          </div>

          <div className="availability-box">
            <h4>🕐 General Availability for Taking Interviews & Special Instructions</h4>
            <p className="rc-empty">Coming soon — availability and special instructions for {selected} will appear here once we set up how to capture them.</p>
          </div>

          <InterviewCalendar items={stats.calendarItems} />
        </>
      )}
    </div>
  );
}

// ===== Role-specific scheduling queue (pending requests for a role) =====
function RoleQueue({ interviews, role }) {
  const [expanded, setExpanded] = useState(false);

  const pendingRows = useMemo(() => {
    if (!role) return [];
    return interviews.filter(row => {
      if (isStructuralRow(row)) return false;
      if ((getCell(row, COLUMN_IDS.role) || '').toLowerCase() !== role.toLowerCase()) return false;
      return (getCell(row, COLUMN_IDS.status) || '').toLowerCase() === 'pending';
    }).map(row => {
      let roundsRequested = 0;
      for (let r = 1; r <= 5; r++) {
        if (getCell(row, COLUMN_IDS.rounds[r].interviewer)) roundsRequested++;
      }
      return {
        candidate: getCell(row, COLUMN_IDS.candidateName),
        role: getCell(row, COLUMN_IDS.role),
        roundsRequested,
        recruiter: getCell(row, COLUMN_IDS.recruiter) || '—',
        priority: getCell(row, COLUMN_IDS.priority) || '—',
      };
    });
  }, [interviews, role]);

  if (!role) return null;

  return (
    <div className="role-queue">
      <button
        className={`role-queue-card${pendingRows.length > 0 ? ' has-items' : ''}`}
        onClick={() => pendingRows.length > 0 && setExpanded(e => !e)}
      >
        <span className="stat-number">{pendingRows.length}</span>
        <span className="stat-desc">Scheduling queue — {role}{pendingRows.length > 0 ? (expanded ? ' ▲' : ' ▼') : ''}</span>
      </button>

      {expanded && pendingRows.length > 0 && (
        <div className="role-queue-list">
          {pendingRows.map((p, i) => (
            <div key={i} className="role-queue-item">
              <strong>{p.candidate}</strong>
              <span>{p.role}</span>
              <span>{p.roundsRequested} round{p.roundsRequested !== 1 ? 's' : ''} requested</span>
              <span>Recruiter: {p.recruiter}</span>
              <span className={`priority-tag priority-${p.priority.toLowerCase().replace(' ', '-')}`}>{p.priority}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ===== Suchi's Corner =====
const COORDINATORS = ['Priti', 'Meghana'];

function SuchisCorner({ mainRows, allRows, logs }) {
  const [period, setPeriod] = useState('overall');
  const [role, setRole] = useState('');

  const candidates = useMemo(() => {
    return allRows.filter(r => !isStructuralRow(r));
  }, [allRows]);

  const rcStats = useMemo(() => {
    const dayStart = new Date();
    dayStart.setHours(0, 0, 0, 0);
    const monthStart = new Date(dayStart.getFullYear(), dayStart.getMonth(), 1);
    const monthEnd = new Date(dayStart.getFullYear(), dayStart.getMonth() + 1, 0, 23, 59, 59);

    return COORDINATORS.map(rc => {
      const rcRows = candidates.filter(r =>
        (getCell(r, COLUMN_IDS.coordinator) || '').toLowerCase() === rc.toLowerCase());

      // Avg time to schedule: Requested On → last filled round date (fully scheduled rows only)
      const durations = [];
      rcRows.forEach(row => {
        const requested = parseDate(getCell(row, COLUMN_IDS.requestedOn));
        if (!requested) return;
        let lastDate = null;
        for (let r = 1; r <= 5; r++) {
          const d = parseDate(getCell(row, COLUMN_IDS.rounds[r].date));
          if (d && (!lastDate || d > lastDate)) lastDate = d;
        }
        if (lastDate) durations.push((lastDate - requested) / (24 * 3600 * 1000));
      });
      const avgDays = durations.length
        ? (durations.reduce((a, b) => a + b, 0) / durations.length).toFixed(1)
        : null;

      const pending = rcRows.filter(r => (getCell(r, COLUMN_IDS.status) || '').toLowerCase() === 'pending').length;
      const scheduled = rcRows.filter(r => (getCell(r, COLUMN_IDS.status) || '').toLowerCase() === 'scheduled').length;

      let thisMonth = 0;
      rcRows.forEach(row => {
        for (let r = 1; r <= 5; r++) {
          const d = parseDate(getCell(row, COLUMN_IDS.rounds[r].date));
          if (d && d >= monthStart && d <= monthEnd) thisMonth++;
        }
      });

      return { rc, avgDays, pending, scheduled, thisMonth };
    });
  }, [candidates]);

  // Priority spread per recruiter
  const prioritySpread = useMemo(() => {
    const dayStart = new Date();
    dayStart.setHours(0, 0, 0, 0);
    const weekStart = startOfWeekMonday(dayStart);
    const monthStart = new Date(dayStart.getFullYear(), dayStart.getMonth(), 1);

    const spread = {};
    candidates.forEach(row => {
      const recruiter = getCell(row, COLUMN_IDS.recruiter);
      const priority = getCell(row, COLUMN_IDS.priority);
      if (!recruiter || !priority) return;

      if (period !== 'overall') {
        const requested = parseDate(getCell(row, COLUMN_IDS.requestedOn));
        if (!requested) return;
        if (period === 'week' && requested < weekStart) return;
        if (period === 'month' && requested < monthStart) return;
      }

      if (!spread[recruiter]) spread[recruiter] = { 'High Priority': 0, 'Regular': 0, 'Low': 0 };
      if (spread[recruiter][priority] !== undefined) spread[recruiter][priority]++;
    });
    return spread;
  }, [candidates, period]);

  // Role snapshot: completed interviews weekly / monthly / annual + reschedules for the role
  const roleStats = useMemo(() => {
    if (!role) return null;
    const dayStart = new Date();
    dayStart.setHours(23, 59, 59, 999);
    const weekStart = startOfWeekMonday(new Date());
    const monthStart = new Date(dayStart.getFullYear(), dayStart.getMonth(), 1);
    const yearStart = new Date(dayStart.getFullYear(), 0, 1);

    let weekly = 0, monthly = 0, annual = 0;
    let pendingCount = 0, scheduledCount = 0;
    const roleCandidates = new Set();

    candidates.forEach(row => {
      if ((getCell(row, COLUMN_IDS.role) || '').toLowerCase() !== role.toLowerCase()) return;
      roleCandidates.add((getCell(row, COLUMN_IDS.candidateName) || '').toLowerCase());

      const status = (getCell(row, COLUMN_IDS.status) || '').toLowerCase();
      if (status === 'pending') pendingCount++;
      if (status === 'scheduled') scheduledCount++;

      for (let r = 1; r <= 5; r++) {
        const d = parseDate(getCell(row, COLUMN_IDS.rounds[r].date));
        if (!d || d > dayStart) continue; // completed = interview date is past
        if (d >= yearStart) annual++;
        if (d >= monthStart) monthly++;
        if (d >= weekStart) weekly++;
      }
    });

    // Reschedule corner details for this role (match log candidates to role candidates)
    const roleReschedules = logs
      .map(row => ({
        type: getCell(row, LOG_COLS.eventType),
        candidate: getCell(row, LOG_COLS.candidate),
        panel: getCell(row, LOG_COLS.panel),
        reason: getCell(row, LOG_COLS.reason),
        rescheduledBy: getCell(row, LOG_COLS.rescheduledBy) || 'Other',
      }))
      .filter(e => e.type === 'Reschedule' &&
        roleCandidates.has((e.candidate || '').toLowerCase()));

    return { weekly, monthly, annual, pendingCount, scheduledCount, reschedules: roleReschedules };
  }, [candidates, logs, role]);

  return (
    <div className="suchi-corner">
      <h3>💜 Suchi's Corner — Recruitment Coordination Stats</h3>

      <div className="rc-cards">
        {rcStats.map(s => (
          <div key={s.rc} className="rc-card">
            <div className="rc-card-name">{s.rc}</div>
            <div className="rc-card-grid">
              <div className="stat-card">
                <span className="stat-number">{s.avgDays !== null ? `${s.avgDays}d` : '—'}</span>
                <span className="stat-desc">Avg time to schedule</span>
              </div>
              <div className="stat-card">
                <span className="stat-number">{s.pending}</span>
                <span className="stat-desc">Current pending cases</span>
              </div>
              <div className="stat-card">
                <span className="stat-number">{s.scheduled}</span>
                <span className="stat-desc">Currently scheduled</span>
              </div>
              <div className="stat-card">
                <span className="stat-number">{s.thisMonth}</span>
                <span className="stat-desc">Interviews scheduled this month</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="priority-spread">
        <div className="ps-header">
          <h4>Recruiter Priority Spread</h4>
          <select value={period} onChange={(e) => setPeriod(e.target.value)}>
            <option value="overall">Overall</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
          </select>
        </div>
        {Object.keys(prioritySpread).length === 0 ? (
          <p className="rc-empty">No priority-tagged requests in this period yet. (New form submissions carry a Priority.)</p>
        ) : (
          <table className="ps-table">
            <thead>
              <tr><th>Recruiter</th><th>High Priority</th><th>Regular</th><th>Low</th><th>Total</th></tr>
            </thead>
            <tbody>
              {Object.entries(prioritySpread).map(([rec, counts]) => (
                <tr key={rec}>
                  <td>{rec}</td>
                  <td>{counts['High Priority']}</td>
                  <td>{counts['Regular']}</td>
                  <td>{counts['Low']}</td>
                  <td><strong>{counts['High Priority'] + counts['Regular'] + counts['Low']}</strong></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="role-snapshot">
        <h4>Role Snapshot</h4>
        <AutocompleteInput
          options={ROLES}
          value={role}
          onChange={setRole}
          placeholder="Type any part of a role…"
        />
        {roleStats && (
          <>
            <div className="heatmap-grid rs-grid">
              <div className="stat-card">
                <span className="stat-number">{roleStats.pendingCount}</span>
                <span className="stat-desc">Pending (fresh requests)</span>
              </div>
              <div className="stat-card">
                <span className="stat-number">{roleStats.scheduledCount}</span>
                <span className="stat-desc">Currently scheduled</span>
              </div>
              <div className="stat-card">
                <span className="stat-number">{roleStats.weekly}</span>
                <span className="stat-desc">Completed this week</span>
              </div>
              <div className="stat-card">
                <span className="stat-number">{roleStats.monthly}</span>
                <span className="stat-desc">Completed this month</span>
              </div>
              <div className="stat-card">
                <span className="stat-number">{roleStats.annual}</span>
                <span className="stat-desc">Completed this year</span>
              </div>
              <div className="stat-card">
                <span className="stat-number">{roleStats.reschedules.length}</span>
                <span className="stat-desc">Reschedules (all time)</span>
              </div>
            </div>
            {roleStats.reschedules.length > 0 && (
              <div className="rc-block rs-reschedules">
                <h4>Reschedule details — {role}</h4>
                <ul>
                  {roleStats.reschedules.map((e, i) => (
                    <li key={i}>
                      <strong>{e.candidate}</strong> ↔ {e.panel} · {e.rescheduledBy}-initiated
                      <ul className="rc-reasons"><li>{e.reason || '(no reason given)'}</li></ul>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ===== App =====
const TABS = ['Main', 'Reschedule Corner', 'Interviewer Heatmap', "Suchi's Corner"];

function App() {
  const [view, setView] = useState('home'); // 'home' or 'form'
  const [tab, setTab] = useState('Main');
  const [interviews, setInterviews] = useState([]);
  const [archive, setArchive] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [homeRole, setHomeRole] = useState('');

  const allRows = useMemo(() => [...interviews, ...archive], [interviews, archive]);

  useEffect(() => { fetchAll(); }, []);

  const callApi = async (action) => {
    const response = await fetch('/api/smartsheet', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    });
    if (!response.ok) throw new Error(`${action} failed`);
    return response.json();
  };

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [main, logsData, archiveData] = await Promise.all([
        callApi('getSheet'),
        callApi('getLogs'),
        callApi('getArchive'),
      ]);
      setInterviews(main.rows || []);
      setLogs(logsData.rows || []);
      setArchive((archiveData.rows || []).map(normalizeArchiveRow));
      setError(null);
    } catch (err) {
      setError('Failed to load data. Please refresh.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (formData) => {
    setLoading(true);
    try {
      const todayStr = new Date().toISOString().slice(0, 10);
      const cells = [
        { columnId: COLUMN_IDS.candidateName, value: formData.candidateName },
        { columnId: COLUMN_IDS.emailId, value: formData.emailId },
        { columnId: COLUMN_IDS.greenhouse, value: formData.greenhouse },
        { columnId: COLUMN_IDS.recruiter, value: formData.recruiterName },
        { columnId: COLUMN_IDS.coordinator, value: formData.coordinator },
        { columnId: COLUMN_IDS.role, value: formData.role },
        { columnId: COLUMN_IDS.priority, value: formData.priority },
        { columnId: COLUMN_IDS.requestedOn, value: todayStr },
        { columnId: COLUMN_IDS.status, value: 'pending' },
      ];

      if (formData.specialRequests) {
        cells.push({ columnId: COLUMN_IDS.specialRequests, value: formData.specialRequests });
      }

      formData.rounds.forEach((round, i) => {
        const ids = COLUMN_IDS.rounds[i + 1];
        if (round.interviewer) cells.push({ columnId: ids.interviewer, value: round.interviewer });
        if (round.duration) cells.push({ columnId: ids.duration, value: round.duration });
      });

      const response = await fetch('/api/smartsheet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'addRow', data: { cells } }),
      });

      if (!response.ok) {
        let detail = '';
        try { detail = (await response.json()).error || ''; } catch { /* ignore */ }
        throw new Error(detail || `Server error ${response.status}`);
      }

      setSuccessMessage(`Interview request for ${formData.candidateName} submitted successfully!`);
      setTimeout(() => setSuccessMessage(''), 5000);
      setView('home');
      await fetchAll();
    } catch (err) {
      setError(`Failed to submit: ${err.message}`);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container">
      <header className="header">
        <Logo />
        <h1>Interview Scheduling - Smartsheet India</h1>
      </header>

      {error && <div className="error-message">{error}</div>}
      {successMessage && <div className="success-message">{successMessage}</div>}

      {view === 'home' ? (
        <div className="home">
          <div className="tab-bar">
            {TABS.map(t => (
              <button
                key={t}
                className={`tab-btn${tab === t ? ' active' : ''}`}
                onClick={() => setTab(t)}
              >
                {t}
              </button>
            ))}
          </div>

          {tab === 'Main' && (
            <>
              <div className="hero-row">
                <button className="btn btn-hero" onClick={() => { setError(null); setView('form'); }}>
                  ＋ Schedule Fresh Interview
                </button>
                <MiniCalendar />
              </div>

              <div className="role-explorer">
                <h3>🔍 Browse Upcoming Interviews</h3>
                <AutocompleteInput
                  options={ROLES}
                  value={homeRole}
                  onChange={setHomeRole}
                  placeholder="Type any part of a role…"
                />
                <RoleQueue interviews={interviews} role={homeRole} />
                <UpcomingPanel interviews={allRows} role={homeRole} />
              </div>
            </>
          )}

          {tab === 'Reschedule Corner' && <RescheduleCorner logs={logs} />}

          {tab === 'Interviewer Heatmap' && <InterviewHeatmap allRows={allRows} logs={logs} />}

          {tab === "Suchi's Corner" && <SuchisCorner mainRows={interviews} allRows={allRows} logs={logs} />}

          <div className="home-footer">
            <button onClick={fetchAll} className="btn btn-secondary" disabled={loading}>
              {loading ? '⟳ Refreshing…' : '⟳ Refresh Data'}
            </button>
          </div>
        </div>
      ) : (
        <SchedulingForm
          onSubmit={handleSubmit}
          onCancel={() => setView('home')}
          isLoading={loading}
          interviews={allRows}
        />
      )}
    </div>
  );
}

export default App;
