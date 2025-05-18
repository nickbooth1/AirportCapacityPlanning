import React, { useState } from 'react';
import axios from 'axios';

const CreateScenarioForm = ({ baselineId, onSuccess, autoCalculate = false, onCalculationStarted }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [parameters, setParameters] = useState({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);
  const [calculationStarted, setCalculationStarted] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      setError(null);
      
      const payload = {
        title,
        description,
        baselineId,
        parameters
      };
      
      const response = await axios.post('/api/agent/scenarios', payload);
      setSuccess(true);
      
      if (onSuccess) {
        onSuccess(response.data);
      }
      
      // Auto-calculate if enabled
      if (autoCalculate) {
        const calculationResponse = await axios.post(
          `/api/agent/scenarios/${response.data.scenarioId}/calculate`
        );
        
        setCalculationStarted(true);
        
        if (onCalculationStarted) {
          onCalculationStarted(calculationResponse.data);
        }
      }
      
      setLoading(false);
    } catch (err) {
      setError('Error creating scenario: ' + (err.response?.data?.error || err.message));
      setLoading(false);
    }
  };

  return (
    <div>
      <h2>Create New Scenario</h2>
      
      {success && <div>Scenario created successfully!</div>}
      {calculationStarted && <div>Calculation started!</div>}
      {error && <div>{error}</div>}
      
      <form onSubmit={handleSubmit}>
        <div>
          <label htmlFor="scenario-title">Scenario Title</label>
          <input
            id="scenario-title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
        </div>
        
        <div>
          <label htmlFor="scenario-description">Description</label>
          <textarea
            id="scenario-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
        
        <button type="submit" disabled={loading}>
          {loading ? 'Creating...' : 'Create Scenario'}
        </button>
      </form>
    </div>
  );
};

export default CreateScenarioForm;