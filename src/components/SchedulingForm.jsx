import { useState, useMemo } from 'react';
import { COLUMN_IDS, AutocompleteInput } from '../App';
import './SchedulingForm.css';

const COORDINATORS = ['Priti', 'Meghana'];
const DURATIONS = ['30 minutes', '45 minutes', '60 minutes', '90 minutes'];
const PRIORITIES = ['High Priority', 'Regular', 'Low'];

// Must match the Role dropdown options in Smartsheet
export const ROLES = [
  'Senior Software Engineer',
  'Software Engineer II',
  'Product Manager',
  'UX Designer',
  'Data Analyst',
  'QA Engineer',
  'DevOps Engineer',
  'Engineering Manager',
  'Technical Writer',
  'Customer Success Manager',
  'AI/ML Engineer',
];

function getCell(row, columnId) {
  const cell = row.cells?.find(c => c.columnId === columnId);
  return cell?.displayValue ?? cell?.value ?? '';
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

function formatDay(date) {
  return date.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
}

// Upcoming interviews panel — total candidates, then grouped by round
export function UpcomingPanel({ interviews, role }) {
  const data = useMemo(() => {
    if (!role) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const roleQuery = role.toLowerCase();
    const items = [];
    const candidates = new Set();

    interviews.forEach(row => {
      const rowRole = (getCell(row, COLUMN_IDS.role) || '').toLowerCase();
      if (rowRole !== roleQuery) return;

      const candidate = getCell(row, COLUMN_IDS.candidateName);
      if (!candidate || candidate === 'Candidate Name') return;

      const recruiter = getCell(row, COLUMN_IDS.recruiter);
      const priority = getCell(row, COLUMN_IDS.priority);

      for (let r = 1; r <= 5; r++) {
        const ids = COLUMN_IDS.rounds[r];
        const date = parseDate(getCell(row, ids.date));
        const timeStr = getCell(row, ids.time);
        const panel = getCell(row, ids.interviewer);
        if (date && date >= today && panel) {
          items.push({ date, timeStr, panel, candidate, round: r, recruiter, priority });
          candidates.add(candidate);
        }
      }
    });

    const rounds = [];
    for (let r = 1; r <= 5; r++) {
      const roundItems = items
        .filter(i => i.round === r)
        .sort((a, b) => a.date - b.date || String(a.timeStr).localeCompare(String(b.timeStr)));
      if (roundItems.length > 0) rounds.push({ round: r, items: roundItems });
    }

    return { totalCandidates: candidates.size, rounds };
  }, [interviews, role]);

  return (
    <div className="upcoming-panel">
      <h3>📅 Upcoming Interviews{role ? ` — ${role}` : ''}</h3>
      {!role ? (
        <p className="upcoming-hint">Select a role to see upcoming interviews for it.</p>
      ) : data.rounds.length === 0 ? (
        <p className="upcoming-hint">No upcoming interviews found for this role.</p>
      ) : (
        <div className="calendar-view">
          <div className="total-candidates">
            <span className="total-candidates-number">{data.totalCandidates}</span>
            <span className="total-candidates-label">Total candidates scheduled</span>
          </div>

          {data.rounds.map(({ round, items }) => (
            <div key={round} className="round-group">
              <div className="round-group-header">
                <span>Round {round}</span>
                <span className="day-count">{items.length}</span>
              </div>
              <div className={`round-group-items${items.length > 3 ? ' scrollable' : ''}`}>
                {items.map((item, ii) => (
                  <div key={ii} className="calendar-item">
                    <span className="item-time">
                      {formatDay(item.date)}
                      <br />
                      {item.timeStr || 'Time TBD'}
                    </span>
                    <span className="item-detail">
                      <strong>{item.candidate}</strong>
                      <br />
                      Panel: {item.panel}
                      {item.recruiter && (
                        <>
                          <br />
                          <span className="item-recruiter">
                            Recruiter: {item.recruiter}{item.priority ? ` (${item.priority})` : ''}
                          </span>
                        </>
                      )}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SchedulingForm({ onSubmit, onCancel, isLoading, interviews = [] }) {
  const [coordinator, setCoordinator] = useState('');
  const [recruiterName, setRecruiterName] = useState('');
  const [candidateName, setCandidateName] = useState('');
  const [greenhouse, setGreenhouse] = useState('');
  const [emailId, setEmailId] = useState('');
  const [role, setRole] = useState('');
  const [priority, setPriority] = useState('Regular');
  const [numInterviews, setNumInterviews] = useState(1);
  const [rounds, setRounds] = useState([{ interviewer: '', duration: '' }]);
  const [specialRequests, setSpecialRequests] = useState('');

  const handleNumInterviewsChange = (e) => {
    const n = parseInt(e.target.value, 10);
    setNumInterviews(n);
    setRounds(prev => {
      const next = [...prev];
      while (next.length < n) next.push({ interviewer: '', duration: '' });
      return next.slice(0, n);
    });
  };

  const updateRound = (index, field, value) => {
    setRounds(prev => prev.map((r, i) => (i === index ? { ...r, [field]: value } : r)));
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!coordinator) return alert('Please select a Recruitment Coordinator');
    if (!recruiterName.trim()) return alert('Please enter the Recruiter Name');
    if (!candidateName.trim()) return alert('Please enter the Candidate Name');
    if (!emailId.trim()) return alert('Please enter the Email ID');
    if (!role) return alert('Please select the Role');
    if (!priority) return alert('Please select the Priority');
    for (let i = 0; i < rounds.length; i++) {
      if (!rounds[i].interviewer.trim()) return alert(`Please enter the interviewer for Round ${i + 1}`);
      if (!rounds[i].duration) return alert(`Please select the duration for Round ${i + 1}`);
    }

    onSubmit({
      coordinator,
      recruiterName: recruiterName.trim(),
      candidateName: candidateName.trim(),
      greenhouse: greenhouse.trim(),
      emailId: emailId.trim(),
      role,
      priority,
      rounds,
      specialRequests: specialRequests.trim(),
    });
  };

  return (
    <div className="form-card">
      <div className="form-card-header">
        <h2>Schedule Fresh Interview</h2>
        <button type="button" className="btn btn-back" onClick={onCancel} disabled={isLoading}>
          ← Back
        </button>
      </div>

      <div className="form-layout">
        <form onSubmit={handleSubmit} className="scheduling-form">
          <div className="form-group">
            <label>Recruitment Coordinator *</label>
            <select value={coordinator} onChange={(e) => setCoordinator(e.target.value)} disabled={isLoading}>
              <option value="">— Select coordinator —</option>
              {COORDINATORS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div className="form-group">
            <label>Recruiter Name *</label>
            <input
              type="text"
              value={recruiterName}
              onChange={(e) => setRecruiterName(e.target.value)}
              placeholder="Enter recruiter name"
              disabled={isLoading}
            />
          </div>

          <div className="form-group">
            <label>Candidate Name *</label>
            <input
              type="text"
              value={candidateName}
              onChange={(e) => setCandidateName(e.target.value)}
              placeholder="Enter candidate name"
              disabled={isLoading}
            />
          </div>

          <div className="form-group">
            <label>Greenhouse</label>
            <textarea
              value={greenhouse}
              onChange={(e) => setGreenhouse(e.target.value)}
              placeholder="Paste the candidate's Greenhouse (ATS) URL"
              rows={2}
              disabled={isLoading}
            />
          </div>

          <div className="form-group">
            <label>Email ID *</label>
            <input
              type="email"
              value={emailId}
              onChange={(e) => setEmailId(e.target.value)}
              placeholder="candidate@email.com"
              disabled={isLoading}
            />
          </div>

          <div className="form-group">
            <label>Role *</label>
            <AutocompleteInput
              options={ROLES}
              value={role}
              onChange={setRole}
              placeholder="Type any part of a role…"
            />
          </div>

          <div className="form-group">
            <label>Priority *</label>
            <select value={priority} onChange={(e) => setPriority(e.target.value)} disabled={isLoading}>
              {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>

          <div className="form-group">
            <label>Number of Interviews *</label>
            <select value={numInterviews} onChange={handleNumInterviewsChange} disabled={isLoading}>
              {[1, 2, 3, 4, 5].map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>

          {rounds.map((round, i) => (
            <div key={i} className="round-section">
              <h3>Round {i + 1}</h3>
              <div className="form-group">
                <label>Round {i + 1} Interviewer *</label>
                <input
                  type="text"
                  value={round.interviewer}
                  onChange={(e) => updateRound(i, 'interviewer', e.target.value)}
                  placeholder="Interviewer name"
                  disabled={isLoading}
                />
              </div>
              <div className="form-group">
                <label>Round {i + 1} Duration *</label>
                <select
                  value={round.duration}
                  onChange={(e) => updateRound(i, 'duration', e.target.value)}
                  disabled={isLoading}
                >
                  <option value="">— Select duration —</option>
                  {DURATIONS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
            </div>
          ))}

          <div className="form-group">
            <label>Special Requests</label>
            <textarea
              value={specialRequests}
              onChange={(e) => setSpecialRequests(e.target.value)}
              placeholder="Any special requests (timezone constraints, panel preferences, etc.)"
              rows={3}
              disabled={isLoading}
            />
          </div>

          <div className="form-actions">
            <button type="button" className="btn btn-secondary" onClick={onCancel} disabled={isLoading}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={isLoading}>
              {isLoading ? 'Submitting…' : 'Submit'}
            </button>
          </div>
        </form>

        <UpcomingPanel interviews={interviews} role={role} />
      </div>
    </div>
  );
}

export default SchedulingForm;
