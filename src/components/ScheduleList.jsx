import { useState } from 'react';
import { COLUMN_IDS } from '../App';
import './ScheduleList.css';

function ScheduleList({ interviews, isLoading, onRefresh }) {
  const [filterStatus, setFilterStatus] = useState('all');

  const getCell = (row, columnId) =>
    row.cells?.find(c => c.columnId === columnId)?.displayValue ??
    row.cells?.find(c => c.columnId === columnId)?.value ?? '';

  // Only rows with a candidate name are real records
  const records = interviews.filter(row => getCell(row, COLUMN_IDS.candidateName) &&
    getCell(row, COLUMN_IDS.candidateName) !== 'Candidate Name');

  const filtered = filterStatus === 'all'
    ? records
    : records.filter(row => (getCell(row, COLUMN_IDS.status) || '').toLowerCase() === filterStatus);

  const roundSummary = (row) => {
    const parts = [];
    for (let r = 1; r <= 5; r++) {
      const interviewer = getCell(row, COLUMN_IDS.rounds[r].interviewer);
      const duration = getCell(row, COLUMN_IDS.rounds[r].duration);
      if (interviewer) parts.push({ r, interviewer, duration });
    }
    return parts;
  };

  return (
    <div className="schedule-list-container">
      <div className="schedule-list-header">
        <h2>Interview Pipeline</h2>
        <button onClick={onRefresh} className="btn btn-refresh" disabled={isLoading}>
          {isLoading ? '⟳ Loading…' : '⟳ Refresh'}
        </button>
      </div>

      <div className="filter-controls">
        <label>Filter:</label>
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
          <option value="all">All</option>
          <option value="in progress">In Progress</option>
          <option value="scheduled">Scheduled</option>
        </select>
      </div>

      <div className="interview-list">
        {isLoading ? (
          <div className="loading">Loading interviews…</div>
        ) : filtered.length === 0 ? (
          <div className="empty-state"><p>No interviews yet. Click "Schedule Fresh Interview" to add one.</p></div>
        ) : (
          <div className="interview-items">
            {filtered.map((row, idx) => {
              const status = getCell(row, COLUMN_IDS.status);
              const rounds = roundSummary(row);
              return (
                <div key={row.id || idx} className="interview-card">
                  <div className="card-header">
                    <div className="candidate-info">
                      <h3>{getCell(row, COLUMN_IDS.candidateName)}</h3>
                      <p className="recruiter">RC: {getCell(row, COLUMN_IDS.coordinator) || 'N/A'}</p>
                      {getCell(row, COLUMN_IDS.role) && <p className="role">Role: {getCell(row, COLUMN_IDS.role)}</p>}
                    </div>
                    <div className={`badge badge-${(status || 'unknown').replace(' ', '-')}`}>
                      {status || 'Unknown'}
                    </div>
                  </div>

                  {rounds.length > 0 && (
                    <div className="rounds-summary">
                      {rounds.map(({ r, interviewer, duration }) => (
                        <div key={r} className="round-chip">
                          <strong>R{r}:</strong> {interviewer}{duration ? ` · ${duration}` : ''}
                        </div>
                      ))}
                    </div>
                  )}

                  {getCell(row, COLUMN_IDS.specialRequests) && (
                    <div className="card-notes">
                      <strong>Special Requests:</strong> {getCell(row, COLUMN_IDS.specialRequests)}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="schedule-stats">
        <div className="stat">
          <span className="stat-label">Total</span>
          <span className="stat-value">{records.length}</span>
        </div>
        <div className="stat">
          <span className="stat-label">In Progress</span>
          <span className="stat-value">
            {records.filter(r => (getCell(r, COLUMN_IDS.status) || '').toLowerCase() === 'in progress').length}
          </span>
        </div>
        <div className="stat">
          <span className="stat-label">Scheduled</span>
          <span className="stat-value">
            {records.filter(r => (getCell(r, COLUMN_IDS.status) || '').toLowerCase() === 'scheduled').length}
          </span>
        </div>
      </div>
    </div>
  );
}

export default ScheduleList;
