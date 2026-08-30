import { useState, useEffect, useMemo } from 'react';
import SchedulingForm, { UpcomingPanel, ROLES } from './components/SchedulingForm';
import './App.css';

// Real Smartsheet column IDs for "Advanced scheduling" sheet
export const COLUMN_IDS = {
  candidateName: 1319526027005828,
  emailId: 5823125654376324,
  greenhouse: 3571325840691076,
  recruiter: 8074925468061572,
  coordinator: 2747206844845956, // RC column
  role: 4999006658531204,
  rounds: {
    1: { interviewer: 495407031160708, date: 8658181355769732, time: 829701515677572, duration: 4717531681820548 },
    2: { interviewer: 4154581728399236, date: 6406381542084484, time: 5333301143048068, duration: 213932054450052 },
    3: { interviewer: 1902781914713988, date: 7532281448927108, time: 3028681821556612, duration: 8798918844125060 },
    4: { interviewer: 5280481635241860, date: 776882007871364, time: 8095231402348420, duration: 4295319216754564 },
    5: { interviewer: 3591631774977924, date: 5843431588663172, time: 1339831961292676, duration: 6547119030439812 },
  },
  specialRequests: 2043519403069316,
  status: 2465731868135300,
};

// Smartsheet logo (inline SVG)
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

function getCell(row, columnId) {
  const cell = row.cells?.find(c => c.columnId === columnId);
  return cell?.displayValue ?? cell?.value ?? '';
}

// Section parent rows in the sheet — never treat these as candidates
const SECTION_NAMES = ['📋 PENDING', '📅 SCHEDULED', '✅ COMPLETED'];
export function isSectionRow(row) {
  const name = getCell(row, COLUMN_IDS.candidateName);
  return SECTION_NAMES.includes(name);
}

function parseDate(dateStr) {
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

// Mini month calendar with today highlighted
function MiniCalendar() {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();
  const firstDay = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  // Monday-first offset
  const startOffset = (firstDay.getDay() + 6) % 7;

  const cells = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <div className="mini-calendar">
      <div className="mini-cal-title">
        {today.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
      </div>
      <div className="mini-cal-grid">
        {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
          <div key={'h' + i} className="mini-cal-dow">{d}</div>
        ))}
        {cells.map((d, i) => (
          <div
            key={i}
            className={`mini-cal-day${d === today.getDate() ? ' today' : ''}${d === null ? ' empty' : ''}`}
          >
            {d || ''}
          </div>
        ))}
      </div>
    </div>
  );
}

// Log sheet column IDs (Scheduling Logs)
const LOG_COLS = {
  loggedAt: 3072160715018116,
  eventType: 7575760342388612,
  candidate: 1946260808175492,
  panel: 6449860435545988,
  round: 4198060621860740,
  reason: 8701660249231236,
  rescheduledBy: 2371420426112900, // Candidate / Panel / Other
  reportedBy: 538885924622212,
};

// Reschedule Corner — stats from the Scheduling Logs sheet (current month only)
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

    // Candidate-initiated reschedules, counted per candidate
    const byCandidate = {};
    // Panel-initiated reschedules, reasons listed per panel
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

// Interview Heatmap — per-interviewer workload stats
function InterviewHeatmap({ interviews, logs }) {
  const [selected, setSelected] = useState('');

  // Unique interviewer names across all rounds
  const interviewers = useMemo(() => {
    const names = new Set();
    interviews.forEach(row => {
      for (let r = 1; r <= 5; r++) {
        const name = getCell(row, COLUMN_IDS.rounds[r].interviewer);
        if (name && name !== `Round ${r} - Interviewer`) names.add(name);
      }
    });
    return Array.from(names).sort();
  }, [interviews]);

  const stats = useMemo(() => {
    if (!selected) return null;
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const fourWeeksAgo = new Date(today);
    fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);

    let total = 0;
    let thisMonth = 0;
    let lastFourWeeks = 0;
    const upcomingItems = [];

    interviews.forEach(row => {
      for (let r = 1; r <= 5; r++) {
        const name = getCell(row, COLUMN_IDS.rounds[r].interviewer);
        if ((name || '').toLowerCase() !== selected.toLowerCase()) continue;
        const date = parseDate(getCell(row, COLUMN_IDS.rounds[r].date));
        if (!date) continue;
        const dayStart = new Date();
        dayStart.setHours(0, 0, 0, 0);
        if (date >= dayStart) {
          // Future interview → goes to the upcoming section
          upcomingItems.push({
            date,
            timeStr: getCell(row, COLUMN_IDS.rounds[r].time),
            candidate: getCell(row, COLUMN_IDS.candidateName),
            round: r,
          });
          continue;
        }
        total++;
        if (date >= monthStart) thisMonth++;
        if (date >= fourWeeksAgo) lastFourWeeks++;
      }
    });

    // Group upcoming by week
    upcomingItems.sort((a, b) => a.date - b.date);
    const startToday = new Date();
    startToday.setHours(0, 0, 0, 0);
    const weekMap = new Map();
    upcomingItems.forEach(item => {
      const ws = startOfWeekMonday(item.date).getTime();
      if (!weekMap.has(ws)) weekMap.set(ws, []);
      weekMap.get(ws).push(item);
    });
    const upcomingWeeks = Array.from(weekMap.entries()).map(([ws, items]) => ({
      label: upcomingWeekLabel(new Date(ws), startToday),
      items,
    }));

    // Reschedules for this panel from logs
    const reschedules = logs
      .map(row => ({
        type: getCell(row, LOG_COLS.eventType),
        panel: getCell(row, LOG_COLS.panel),
        reason: getCell(row, LOG_COLS.reason),
      }))
      .filter(e => e.type === 'Reschedule' &&
        (e.panel || '').toLowerCase() === selected.toLowerCase());

    // Most common reschedule reason
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
      upcomingTotal: upcomingItems.length,
      upcomingWeeks,
    };
  }, [interviews, logs, selected]);

  return (
    <div className="heatmap">
      <h3>🔥 Interview Heatmap</h3>
      <select className="role-select" value={selected} onChange={(e) => setSelected(e.target.value)}>
        <option value="">— Select interviewer —</option>
        {interviewers.map(name => <option key={name} value={name}>{name}</option>)}
      </select>

      {stats && (
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
            <span className="stat-desc">Avg weekly interviews (last 4 weeks)</span>
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
      )}

      {stats && (
        <div className="heatmap-upcoming">
          <div className="hu-header">
            <h4>Upcoming Interviews — Week-wise Focus</h4>
            <span className="hu-total">{stats.upcomingTotal} total</span>
          </div>
          {stats.upcomingWeeks.length === 0 ? (
            <p className="rc-empty">No upcoming interviews for this panel.</p>
          ) : (
            <div className="hu-weeks">
              {stats.upcomingWeeks.map((week, wi) => (
                <div key={wi} className="hu-week">
                  <div className="hu-week-header">
                    <span>{week.label}</span>
                    <span className="day-count-blue">{week.items.length}</span>
                  </div>
                  {week.items.map((item, ii) => (
                    <div key={ii} className="hu-item">
                      <span className="hu-date">
                        {item.date.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}
                        {item.timeStr ? ` · ${item.timeStr}` : ''}
                      </span>
                      <span className="hu-candidate">{item.candidate} <span className="item-round">· R{item.round}</span></span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Quick stats panel
function QuickStats({ interviews }) {
  const stats = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59);

    let thisMonth = 0;
    let upcoming = 0;
    let queue = 0;

    interviews.forEach(row => {
      const candidate = getCell(row, COLUMN_IDS.candidateName);
      if (!candidate || candidate === 'Candidate Name' || isSectionRow(row)) return;

      const status = (getCell(row, COLUMN_IDS.status) || '').toLowerCase();
      if (status === 'pending') queue++;

      for (let r = 1; r <= 5; r++) {
        const date = parseDate(getCell(row, COLUMN_IDS.rounds[r].date));
        if (!date) continue;
        if (date >= monthStart && date <= monthEnd) thisMonth++;
        if (date >= today) upcoming++;
      }
    });

    return { thisMonth, upcoming, queue };
  }, [interviews]);

  return (
    <div className="quick-stats">
      <h3>⚡ Quick Stats</h3>
      <div className="stat-card">
        <span className="stat-number">{stats.thisMonth}</span>
        <span className="stat-desc">Interviews scheduled this month</span>
      </div>
      <div className="stat-card">
        <span className="stat-number">{stats.upcoming}</span>
        <span className="stat-desc">Upcoming interviews</span>
      </div>
      <div className="stat-card">
        <span className="stat-number">{stats.queue}</span>
        <span className="stat-desc">Current scheduling queue</span>
      </div>
    </div>
  );
}

function App() {
  const [view, setView] = useState('home'); // 'home' or 'form'
  const [interviews, setInterviews] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [homeRole, setHomeRole] = useState('');
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    fetchInterviews();
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    try {
      const response = await fetch('/api/smartsheet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'getLogs' }),
      });
      if (!response.ok) return;
      const data = await response.json();
      setLogs(data.rows || []);
    } catch (err) {
      console.error('Failed to load logs:', err);
    }
  };

  const fetchInterviews = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/smartsheet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'getSheet' }),
      });
      if (!response.ok) throw new Error('Failed to fetch data');
      const data = await response.json();
      setInterviews(data.rows || []);
      setError(null);
    } catch (err) {
      setError('Failed to load interviews. Please refresh.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (formData) => {
    setLoading(true);
    try {
      const cells = [
        { columnId: COLUMN_IDS.candidateName, value: formData.candidateName },
        { columnId: COLUMN_IDS.emailId, value: formData.emailId },
        { columnId: COLUMN_IDS.greenhouse, value: formData.greenhouse },
        { columnId: COLUMN_IDS.recruiter, value: formData.recruiterName },
        { columnId: COLUMN_IDS.coordinator, value: formData.coordinator },
        { columnId: COLUMN_IDS.role, value: formData.role },
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
      await fetchInterviews();
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
          <div className="hero-row">
            <button className="btn btn-hero" onClick={() => { setError(null); setView('form'); }}>
              ＋ Schedule Fresh Interview
            </button>
            <MiniCalendar />
          </div>

          <div className="home-panels">
            <div className="role-explorer">
              <h3>🔍 Browse Upcoming Interviews</h3>
              <select
                className="role-select"
                value={homeRole}
                onChange={(e) => setHomeRole(e.target.value)}
              >
                <option value="">— Select role —</option>
                {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
              <UpcomingPanel interviews={interviews} role={homeRole} />
            </div>

            <QuickStats interviews={interviews} />
          </div>

          <RescheduleCorner logs={logs} />

          <InterviewHeatmap interviews={interviews} logs={logs} />

          <div className="home-footer">
            <button onClick={() => { fetchInterviews(); fetchLogs(); }} className="btn btn-secondary" disabled={loading}>
              {loading ? '⟳ Refreshing…' : '⟳ Refresh Data'}
            </button>
          </div>
        </div>
      ) : (
        <SchedulingForm
          onSubmit={handleSubmit}
          onCancel={() => setView('home')}
          isLoading={loading}
          interviews={interviews}
        />
      )}
    </div>
  );
}

export default App;
