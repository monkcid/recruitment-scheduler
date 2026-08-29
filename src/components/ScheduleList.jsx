import './ScheduleList.css';

function ScheduleList({ interviews, isLoading, onRefresh, columnIndices, filterStatus, setFilterStatus }) {
  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  const getCellValue = (row, columnIndex) => {
    return row.cells?.find(c => c.columnIndex === columnIndex)?.value || '';
  };

  const getRoundInfo = (row) => {
    for (let round = 1; round <= 5; round++) {
      const roundMap = {
        1: { interviewer: columnIndices.round1Interviewer, date: columnIndices.round1Date, time: columnIndices.round1Time },
        2: { interviewer: columnIndices.round2Interviewer, date: columnIndices.round2Date, time: columnIndices.round2Time },
        3: { interviewer: columnIndices.round3Interviewer, date: columnIndices.round3Date, time: columnIndices.round3Time },
        4: { interviewer: columnIndices.round4Interviewer, date: columnIndices.round4Date, time: columnIndices.round4Time },
        5: { interviewer: columnIndices.round5Interviewer, date: columnIndices.round5Date, time: columnIndices.round5Time },
      };

      const cols = roundMap[round];
      const interviewer = getCellValue(row, cols.interviewer);
      const date = getCellValue(row, cols.date);
      const time = getCellValue(row, cols.time);

      if (interviewer || date || time) {
        return {
          round,
          interviewer,
          date,
          time,
        };
      }
    }
    return null;
  };

  const filteredInterviews = filterStatus === 'all'
    ? interviews
    : interviews.filter(row => {
        const statusValue = getCellValue(row, columnIndices.status);
        return statusValue?.toLowerCase() === filterStatus.toLowerCase();
      });

  const statusOptions = ['all', 'scheduled', 'in progress'];

  return (
    <div className="schedule-list-container">
      <div className="schedule-list-header">
        <h2>Scheduled Interviews</h2>
        <button onClick={onRefresh} className="btn btn-refresh" disabled={isLoading}>
          {isLoading ? '⟳ Loading...' : '⟳ Refresh'}
        </button>
      </div>

      <div className="filter-controls">
        <label>Filter:</label>
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
          {statusOptions.map(status => (
            <option key={status} value={status}>
              {status === 'all' ? 'All Interviews' : status.charAt(0).toUpperCase() + status.slice(1)}
            </option>
          ))}
        </select>
      </div>

      <div className="interview-list">
        {isLoading ? (
          <div className="loading">Loading interviews...</div>
        ) : filteredInterviews.length === 0 ? (
          <div className="empty-state">
            <p>No interviews scheduled yet</p>
          </div>
        ) : (
          <div className="interview-items">
            {filteredInterviews.map((interview, idx) => {
              const roundInfo = getRoundInfo(interview);
              const candidateName = getCellValue(interview, columnIndices.candidateName);
              const recruiter = getCellValue(interview, columnIndices.recruiter);
              const role = getCellValue(interview, columnIndices.role);
              const status = getCellValue(interview, columnIndices.status);

              return (
                <div key={interview.rowId || idx} className="interview-card">
                  <div className="card-header">
                    <div className="candidate-info">
                      <h3>{candidateName || 'Candidate'}</h3>
                      <p className="recruiter">Recruiter: {recruiter || 'N/A'}</p>
                      <p className="role">Role: {role || 'N/A'}</p>
                    </div>
                    <div className={`badge badge-${status?.toLowerCase() || 'unknown'}`}>
                      {status || 'Unknown'}
                    </div>
                  </div>

                  {roundInfo && (
                    <div className="card-details">
                      <div className="detail-item">
                        <span className="label">Round {roundInfo.round}</span>
                        <span className="value">{roundInfo.interviewer}</span>
                      </div>
                      <div className="detail-item">
                        <span className="label">Date & Time</span>
                        <span className="value">
                          {formatDate(roundInfo.date)} at {roundInfo.time || 'TBD'}
                        </span>
                      </div>
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
          <span className="stat-value">{interviews.length}</span>
        </div>
        <div className="stat">
          <span className="stat-label">Scheduled</span>
          <span className="stat-value">
            {interviews.filter(r => getCellValue(r, columnIndices.status)?.toLowerCase() === 'scheduled').length}
          </span>
        </div>
        <div className="stat">
          <span className="stat-label">In Progress</span>
          <span className="stat-value">
            {interviews.filter(r => getCellValue(r, columnIndices.status)?.toLowerCase() === 'in progress').length}
          </span>
        </div>
      </div>
    </div>
  );
}

export default ScheduleList;
