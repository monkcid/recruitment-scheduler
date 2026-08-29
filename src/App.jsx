import { useState, useEffect } from 'react';
import SchedulingForm from './components/SchedulingForm';
import ScheduleList from './components/ScheduleList';
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
    1: { interviewer: 495407031160708, duration: 4717531681820548 },
    2: { interviewer: 4154581728399236, duration: 213932054450052 },
    3: { interviewer: 1902781914713988, duration: 8798918844125060 },
    4: { interviewer: 5280481635241860, duration: 4295319216754564 },
    5: { interviewer: 3591631774977924, duration: 6547119030439812 },
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

function App() {
  const [view, setView] = useState('home'); // 'home' or 'form'
  const [interviews, setInterviews] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');

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

  const handleSubmit = async (formData) => {
    setLoading(true);
    try {
      const cells = [
        { columnId: COLUMN_IDS.candidateName, value: formData.candidateName },
        { columnId: COLUMN_IDS.emailId, value: formData.emailId },
        { columnId: COLUMN_IDS.greenhouse, value: formData.greenhouse },
        { columnId: COLUMN_IDS.coordinator, value: formData.coordinator },
        { columnId: COLUMN_IDS.status, value: 'in progress' },
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
          <button className="btn btn-hero" onClick={() => { setError(null); setView('form'); }}>
            ＋ Schedule Fresh Interview
          </button>

          <ScheduleList
            interviews={interviews}
            isLoading={loading}
            onRefresh={fetchInterviews}
          />
        </div>
      ) : (
        <SchedulingForm
          onSubmit={handleSubmit}
          onCancel={() => setView('home')}
          isLoading={loading}
        />
      )}
    </div>
  );
}

export default App;
