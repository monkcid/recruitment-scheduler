import { useState, useMemo } from 'react';
import { COLUMN_IDS } from '../App';
import './SchedulingForm.css';

const COORDINATORS = ['Priti', 'Meghana'];
const DURATIONS = ['30 minutes', '45 minutes', '60 minutes', '90 minutes'];

function getCell(row, columnId) {
  const cell = row.cells?.find(c => c.columnId === columnId);
  return cell?.displayValue ?? cell?.value ?? '';
}

// Best-effort date parser for free-text date cells
function parseDate(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (!isNaN(d.getTime())) return d;
  // Try DD/MM/YYYY or DD-MM-YYYY
  const m = String(dateStr).match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
  if (m) {
    const d2 = new Date(`${m[3].length === 2 ? '20' + m[3] : m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`);
    if (!isNaN(d2.getTime())) return d2;
  }
  return null;
}

// Upcoming interviews panel — filters sheet rows by role, from today onward
function UpcomingPanel({ interviews, role }) {
  const upcoming = useMemo(() => {
    if (!role.trim()) return [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const roleQuery = role.trim().toLowerCase();
    const items = [];

    interviews.forEach(row => {
      const rowRole = (getCell(row, COLUMN_IDS.role) || '').toLowerCase();
      if (!rowRole || !rowRole.includes(roleQuery)) return;

      const candidate = getCell(row, COLUMN_IDS.candidateName);
      if (!candidate || candidate === 'Candidate Name') return;

      for (let r = 1; r <= 5; r++) {
        const ids = COLUMN_IDS.rounds[r];
        const dateStr = getCell(row, ids.date);
        const timeStr = getCell(row, ids.time);
        const panel = getCell(row, ids.interviewer);
        const date = parseDate(dateStr);
        if (date && date >= today && panel) {
          items.push({ date, dateStr, timeStr, panel, candidate, round: r });
        }
      }
    });

    items.sort((a, b) => a.date - b.date);
    return items;
  }, [interviews, role]);

  if (!role.trim()) {
    return (
      <div className="upcoming-panel">
        <h3>Upcoming Interviews</h3>
        <p className="upcoming-hint">Type a role to see upcoming interviews scheduled for it.</p>
      </div>
    );
  }

  return (
    <div className="upcoming-panel">
      <h3>Upcoming Interviews — {role}</h3>
      {upcoming.length === 0 ? (
        <p className="upcoming-hint">No upcoming interviews found for this role.</p>
      ) : (
        <ul className="upcoming-list">
          {upcoming.map((item, idx) => (
            <li key={idx} className="upcoming-item">
              <span className="upcoming-datetime">
                {item.dateStr}{item.timeStr ? ` ${item.timeStr}` : ''}
              </span>
              {' — '}
              <span className="upcoming-panel-name">{item.panel}</span>
              {' : '}
              <span className="upcoming-candidate">{item.candidate}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function SchedulingForm({ onSubmit, onCancel, isLoading, interviews = [] }) {
  const [coordinator, setCoordinator] = useState('');
  const [candidateName, setCandidateName] = useState('');
  const [greenhouse, setGreenhouse] = useState('');
  const [emailId, setEmailId] = useState('');
  const [role, setRole] = useState('');
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
    if (!candidateName.trim()) return alert('Please enter the Candidate Name');
    if (!emailId.trim()) return alert('Please enter the Email ID');
    if (!role.trim()) return alert('Please enter the Role');
    for (let i = 0; i < rounds.length; i++) {
      if (!rounds[i].interviewer.trim()) return alert(`Please enter the interviewer for Round ${i + 1}`);
      if (!rounds[i].duration) return alert(`Please select the duration for Round ${i + 1}`);
    }

    onSubmit({
      coordinator,
      candidateName: candidateName.trim(),
      greenhouse: greenhouse.trim(),
      emailId: emailId.trim(),
      role: role.trim(),
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
            <input
              type="text"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              placeholder="e.g. Senior Software Engineer"
              disabled={isLoading}
            />
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
