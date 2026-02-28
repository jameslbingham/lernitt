import React, { useState } from 'react';
import axios from 'axios';

export default function TutorRegistration() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  
  const [formData, setFormData] = useState({
    full_name: "",
    bio: "",
    email: "",
    subjects: "",
    hourly_rate: "",
    video: null
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e) => {
    setFormData(prev => ({ ...prev, video: e.target.files[0] }));
  };

  // Logic: Allow moving to Screen 2 only if Screen 1 fields are filled
  const goToNextStep = () => {
    if (formData.full_name && formData.bio && formData.email) {
      setStep(2);
      setError("");
    } else {
      setError("Please fill in your Name, Email, and Bio before proceeding.");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.video) {
      setError("Please select an introduction video.");
      return;
    }

    setLoading(true);
    const data = new FormData();
    data.append('full_name', formData.full_name);
    data.append('bio', formData.bio);
    data.append('email', formData.email);
    data.append('subjects', formData.subjects);
    data.append('hourly_rate', formData.hourly_rate);
    data.append('video', formData.video);

    try {
      // Points to the backend route we discussed
      await axios.post('/api/tutors/register', data, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      alert("Application Submitted Successfully!");
      window.location.href = "/tutors"; // Redirect to marketplace
    } catch (err) {
      setError("Upload failed. Please check your connection and try again.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '500px', margin: '50px auto', padding: '20px', border: '1px solid #ddd', borderRadius: '12px', backgroundColor: '#fff' }}>
      <h2 style={{ textAlign: 'center' }}>Tutor Application</h2>
      <p style={{ textAlign: 'center', color: '#666' }}>Step {step} of 2</p>
      
      {error && <div style={{ color: 'red', marginBottom: '15px', textAlign: 'center', fontWeight: 'bold' }}>{error}</div>}

      {step === 1 && (
        <div>
          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', fontWeight: 'bold' }}>Full Name</label>
            <input name="full_name" value={formData.full_name} onChange={handleChange} style={{ width: '100%', padding: '10px', marginTop: '5px', borderRadius: '6px', border: '1px solid #ccc' }} placeholder="John Doe" />
          </div>
          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', fontWeight: 'bold' }}>Email</label>
            <input name="email" type="email" value={formData.email} onChange={handleChange} style={{ width: '100%', padding: '10px', marginTop: '5px', borderRadius: '6px', border: '1px solid #ccc' }} placeholder="john@example.com" />
          </div>
          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', fontWeight: 'bold' }}>Bio</label>
            <textarea name="bio" value={formData.bio} onChange={handleChange} style={{ width: '100%', padding: '10px', marginTop: '5px', borderRadius: '6px', border: '1px solid #ccc' }} rows="4" placeholder="Tell us about your experience..." />
          </div>
          <button onClick={goToNextStep} style={{ width: '100%', padding: '12px', backgroundColor: '#007bff', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '16px' }}>
            Next: Upload Video
          </button>
        </div>
      )}

      {step === 2 && (
        <div>
          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', fontWeight: 'bold' }}>Subjects</label>
            <input name="subjects" value={formData.subjects} onChange={handleChange} style={{ width: '100%', padding: '10px', marginTop: '5px', borderRadius: '6px', border: '1px solid #ccc' }} placeholder="Math, English, etc." />
          </div>
          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', fontWeight: 'bold' }}>Hourly Rate (€)</label>
            <input name="hourly_rate" type="number" value={formData.hourly_rate} onChange={handleChange} style={{ width: '100%', padding: '10px', marginTop: '5px', borderRadius: '6px', border: '1px solid #ccc' }} placeholder="20" />
          </div>
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontWeight: 'bold' }}>Introduction Video</label>
            <input type="file" accept="video/*" onChange={handleFileChange} style={{ marginTop: '10px' }} />
            <p style={{ fontSize: '12px', color: '#888' }}>Upload a short video (max 2 minutes) introduced yourself.</p>
          </div>
          
          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={() => setStep(1)} style={{ flex: 1, padding: '12px', backgroundColor: '#eee', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Back</button>
            <button onClick={handleSubmit} disabled={loading} style={{ flex: 2, padding: '12px', backgroundColor: '#28a745', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '16px' }}>
              {loading ? "Uploading..." : "Finish & Submit"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
