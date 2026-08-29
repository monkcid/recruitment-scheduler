import { useState, useEffect } from 'react';
import SchedulingForm from './components/SchedulingForm';
import ScheduleList from './components/ScheduleList';
import './App.css';

// Column index mapping for your "Advanced scheduling" sheet
const COLUMNS = {
  candidateName: 0,
  emailId: 1,
  greenhouse: 2,
  recruiter: 3,
  coordinator: 4,
  role: 5,
  // Rounds (6-20 for Round 1-5: interviewer, date, time each)
  round1Interviewer: 6,
  round1Date: 7,
  round1Time: 8,
  round2Interviewer: 9,
  round2Date: 10,
  round2Time: 11,
  round3Interviewer: 12,
  round3Date: 13,
  round3Time: 14,
  round4Interviewer: 15,
  round4Date: 16,
  round4Time: 17,
  round5Interviewer: 18,
  round5Date: 19,
  round5Time: 20,
  rescheduleCounter: 21,
  status: 22,
};

function App() {
  const [interviews, setInterviews] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [successMessage, setSuccessMessage] = useState('');

  // Fetch sheet data on mount
  useEffect(() => {
    fetchInterviews();
  }, []);

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

  const handleScheduleInterview = async (formData) => {
    setLoading(true);
    try {
      const { candidateName, round, recruiterName, interviewerName, date, time } = formData;

      // Map round to correct column indices
      const roundMap = {
        1: { interviewer: COLUMNS.round1Interviewer, date: COLUMNS.round1Date, time: COLUMNS.round1Time },
        2: { interviewer: COLUMNS.round2Interviewer, date: COLUMNS.round2Date, time: COLUMNS.round2Time },
        3: { interviewer: COLUMNS.round3Interviewer, date: COLUMNS.round3Date, time: COLUMNS.round3Time },
        4: { interviewer: COLUMNS.round4Interviewer, date: COLUMNS.round4Date, time: COLUMNS.round4Time },
        5: { interviewer: COLUMNS.round5Interviewer, date: COLUMNS.round5Date, time: COLUMNS.round5Time },
      };

      const cols = roundMap[round];

      // Create cells array
      const cells = [
        { columnIndex: COLUMNS.candidateName, value: candidateName },
        { columnIndex: COLUMNS.recruiter, value: recruiterName },
        { columnIndex: cols.interviewer, value: interviewerName },
        { columnIndex: cols.date, value: date },
        { columnIndex: cols.time, value: time },
        { columnIndex: COLUMNS.status, value: 'scheduled' },
      ];

      // Add row via backend
      const response = await fetch('/api/smartsheet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'addRow',
          data: { cells },
        }),
      });

      if (!response.ok) throw new Error('Failed to schedule');

      setSuccessMessage('Interview scheduled successfully!');
      setTimeout(() => setSuccessMessage(''), 3000);

      // Refresh list
      await fetchInterviews();
    } catch (err) {
      setError('Failed to schedule interview');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filteredInterviews = filterStatus === 'all'
    ? interviews
    : interviews.filter(row => {
        const statusCell = row.cells?.[COLUMNS.status];
        return statusCell?.value === filterStatus;
      });

  return (
    <div className="container">
      <div className="header">
        <div>
          <h1>Recruitment Scheduler</h1>
          <p>Advanced Scheduling Tracker</p>
        </div>
      </div>

      <div className="content">
        <div className="form-section">
          {error && <div className="error-message">{error}</div>}
          {successMessage && <div className="success-message">{successMessage}</div>}

          <SchedulingForm
            onSubmit={handleScheduleInterview}
            isLoading={loading}
          />
        </div>

        <div className="list-section">
          <ScheduleList
            interviews={filteredInterviews}
            isLoading={loading}
            onRefresh={fetchInterviews}
            columnIndices={COLUMNS}
            filterStatus={filterStatus}
            setFilterStatus={setFilterStatus}
          />
        </div>
      </div>
    </div>
  );
}

export default App;
