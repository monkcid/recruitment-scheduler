import { useState } from 'react';
import './SchedulingForm.css';

function SchedulingForm({ onSubmit, isLoading }) {
  const [formData, setFormData] = useState({
    candidateName: '',
    round: '1',
    recruiterName: '',
    interviewerName: '',
    date: '',
    time: '',
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!formData.candidateName || !formData.recruiterName || !formData.interviewerName || !formData.date || !formData.time) {
      alert('Please fill in all fields');
      return;
    }

    onSubmit(formData);
    setFormData({
      candidateName: '',
      round: '1',
      recruiterName: '',
      interviewerName: '',
      date: '',
      time: '',
    });
  };

  return (
    <div className="scheduling-form-container">
      <h2>Schedule Interview</h2>

      <form onSubmit={handleSubmit} className="scheduling-form">
        <div className="form-group">
          <label htmlFor="candidateName">Candidate Name *</label>
          <input
            type="text"
            id="candidateName"
            name="candidateName"
            value={formData.candidateName}
            onChange={handleChange}
            placeholder="Enter candidate name"
            disabled={isLoading}
          />
        </div>

        <div className="form-group">
          <label htmlFor="round">Interview Round *</label>
          <select
            id="round"
            name="round"
            value={formData.round}
            onChange={handleChange}
            disabled={isLoading}
          >
            <option value="1">Round 1</option>
            <option value="2">Round 2</option>
            <option value="3">Round 3</option>
            <option value="4">Round 4</option>
            <option value="5">Round 5</option>
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="recruiterName">Recruiter Name *</label>
          <input
            type="text"
            id="recruiterName"
            name="recruiterName"
            value={formData.recruiterName}
            onChange={handleChange}
            placeholder="Enter recruiter name"
            disabled={isLoading}
          />
        </div>

        <div className="form-group">
          <label htmlFor="interviewerName">Interviewer Name *</label>
          <input
            type="text"
            id="interviewerName"
            name="interviewerName"
            value={formData.interviewerName}
            onChange={handleChange}
            placeholder="Enter interviewer name"
            disabled={isLoading}
          />
        </div>

        <div className="form-group">
          <label htmlFor="date">Interview Date *</label>
          <input
            type="date"
            id="date"
            name="date"
            value={formData.date}
            onChange={handleChange}
            disabled={isLoading}
          />
        </div>

        <div className="form-group">
          <label htmlFor="time">Interview Time *</label>
          <input
            type="time"
            id="time"
            name="time"
            value={formData.time}
            onChange={handleChange}
            disabled={isLoading}
          />
        </div>

        <button type="submit" className="btn btn-primary" disabled={isLoading}>
          {isLoading ? 'Scheduling...' : 'Schedule Interview'}
        </button>
      </form>

      <div className="form-info">
        <h3>Quick Tips</h3>
        <ul>
          <li>Select which round of interviews this is</li>
          <li>All fields are required</li>
          <li>Data saves directly to Smartsheet</li>
          <li>You can reschedule anytime</li>
        </ul>
      </div>
    </div>
  );
}

export default SchedulingForm;
