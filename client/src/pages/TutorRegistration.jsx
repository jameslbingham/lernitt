// client/src/pages/TutorRegistration.jsx
/**
 * LERNITT ACADEMY - TUTOR ONBOARDING INTERFACE
 * ----------------------------------------------------------------------------
 * VERSION: 1.0.0 (MERGED)
 * FEATURES: 
 * - Two-step navigation logic (Basic Info -> Video Upload)
 * - Enterprise-grade styling to match the Lernitt 960px container
 * - Global Auth integration for session persistence
 * ----------------------------------------------------------------------------
 */

import React, { useState } from 'react';
import axios from 'axios';
import { useAuth } from "../hooks/useAuth.jsx"; // Accessing global auth

export default function TutorRegistration() {
  const { user } = useAuth(); // Connects to the logged-in user session
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  
  const [formData, setFormData] = useState({
    full_name: user?.name || "", // Pre-fills if user is logged in
    email: user?.email || "",    // Pre-fills if user is logged in
    bio: "",
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
      // Points to the backend route to handle Supabase storage
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
    <div style={{ 
      maxWidth: '600px', 
      margin: '40px auto', 
      padding: '30px', 
      border: '1px solid #e2e8f0', 
      borderRadius: '16px', 
      backgroundColor: '#fff',
      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
    }}>
      <h2 style={{ textAlign: 'center', fontSize: '24px', fontWeight: '700', color: '#0f172a' }}>
        Tutor Application
      </h2>
      <p style={{ textAlign: 'center', color: '#64748b', marginBottom: '24px' }}>
        Step {step} of 2
      </p>
      
      {error && (
        <div style={{ 
          color: '#b91c1c', 
          backgroundColor: '#fef2f2', 
          padding: '12px', 
          marginBottom: '20px', 
          textAlign: 'center', 
          borderRadius: '8px',
          fontSize: '14px',
          fontWeight: '600' 
        }}>
          {error}
        </div>
      )}

      {step === 1 && (
        <div>
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontWeight: '600', fontSize: '14px', color: '#334155' }}>Full Name</label>
            <input 
              name="full_name" 
              value={formData.full_name} 
              onChange={handleChange} 
              style={{ width: '100%', padding: '12px', marginTop: '8px', borderRadius: '8px', border: '1px solid #cbd5e1' }} 
              placeholder="John Doe" 
            />
          </div>
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontWeight: '600', fontSize: '14px', color: '#334155' }}>Email</label>
            <input 
              name="email" 
              type="email" 
              value={formData.email} 
              onChange={handleChange} 
              style={{ width: '100%', padding: '12px', marginTop: '8px', borderRadius: '8px', border: '1px solid #cbd5e1' }} 
              placeholder="john@example.com" 
            />
          </div>
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontWeight: '600', fontSize: '14px', color: '#334155' }}>Professional Bio</label>
            <textarea 
              name="bio" 
              value={formData.bio} 
              onChange={handleChange} 
              style={{ width: '100%', padding: '12px', marginTop: '8px', borderRadius: '8px', border: '1px solid #cbd5e1' }} 
              rows="4" 
              placeholder="Describe your teaching experience..." 
            />
          </div>
          <button 
            onClick={goToNextStep} 
            style={{ width: '100%', padding: '14px', backgroundColor: '#0f172a', color: '#fff', border: 'none', borderRadius: '24px', cursor: 'pointer', fontSize: '16px', fontWeight: '600' }}
          >
            Next: Media Upload
          </button>
        </div>
      )}

      {step === 2 && (
        <div>
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontWeight: '600', fontSize: '14px', color: '#334155' }}>Subjects</label>
            <input 
              name="subjects" 
              value={formData.subjects} 
              onChange={handleChange} 
              style={{ width: '100%', padding: '12px', marginTop: '8px', borderRadius: '8px', border: '1px solid #cbd5e1' }} 
              placeholder="Math, English, Science" 
            />
          </div>
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontWeight: '600', fontSize: '14px', color: '#334155' }}>Hourly Rate (€)</label>
            <input 
              name="hourly_rate" 
              type="number" 
              value={formData.hourly_rate} 
              onChange={handleChange} 
              style={{ width: '100%', padding: '12px', marginTop: '8px', borderRadius: '8px', border: '1px solid #cbd5e1' }} 
              placeholder="25" 
            />
          </div>
          <div style={{ marginBottom: '24px', padding: '20px', border: '2px dashed #e2e8f0', borderRadius: '12px', textAlign: 'center' }}>
            <label style={{ display: 'block', fontWeight: '600', marginBottom: '10px' }}>Introduction Video</label>
            <input type="file" accept="video/*" onChange={handleFileChange} style={{ fontSize: '13px' }} />
            <p style={{ fontSize: '12px', color: '#64748b', marginTop: '10px' }}>Upload a short intro video so Bob and students can see your style.</p>
          </div>
          
          <div style={{ display: 'flex', gap: '12px' }}>
            <button 
              onClick={() => setStep(1)} 
              style={{ flex: 1, padding: '14px', backgroundColor: '#f1f5f9', color: '#0f172a', border: 'none', borderRadius: '24px', cursor: 'pointer', fontWeight: '600' }}
            >
              Back
            </button>
            <button 
              onClick={handleSubmit} 
              disabled={loading} 
              style={{ flex: 2, padding: '14px', backgroundColor: '#2563eb', color: '#fff', border: 'none', borderRadius: '24px', cursor: 'pointer', fontSize: '16px', fontWeight: '600' }}
            >
              {loading ? "Uploading..." : "Submit Application"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
