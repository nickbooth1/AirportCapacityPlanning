import React, { useState, useEffect } from 'react';
import axios from 'axios';

const ScenarioList = () => {
  const [scenarios, setScenarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchScenarios = async () => {
      try {
        setLoading(true);
        const response = await axios.get('/api/agent/scenarios');
        setScenarios(response.data.scenarios);
        setLoading(false);
      } catch (err) {
        setError('Error loading scenarios: ' + (err.response?.data?.error || err.message));
        setLoading(false);
      }
    };

    fetchScenarios();
  }, []);

  if (loading) return <div>Loading scenarios...</div>;
  if (error) return <div>{error}</div>;

  return (
    <div>
      <h2>Scenarios</h2>
      <ul>
        {scenarios.map(scenario => (
          <li key={scenario.id}>
            <strong>{scenario.title}</strong> - <span>{scenario.type}</span>
            <p>{scenario.description}</p>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default ScenarioList;