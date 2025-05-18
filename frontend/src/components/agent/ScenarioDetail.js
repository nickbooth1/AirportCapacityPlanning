import React, { useState, useEffect } from 'react';
import axios from 'axios';

const ScenarioDetail = ({ scenarioId, showCalculations = false }) => {
  const [scenario, setScenario] = useState(null);
  const [calculations, setCalculations] = useState([]);
  const [calculationResults, setCalculationResults] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchScenarioData = async () => {
      try {
        setLoading(true);
        const scenarioResponse = await axios.get(`/api/agent/scenarios/${scenarioId}`);
        setScenario(scenarioResponse.data);

        if (showCalculations) {
          const calculationsResponse = await axios.get(`/api/agent/scenarios/${scenarioId}/calculations`);
          setCalculations(calculationsResponse.data);

          if (calculationsResponse.data.length > 0) {
            const latestCalculation = calculationsResponse.data[0];
            const resultsResponse = await axios.get(
              `/api/agent/scenarios/${scenarioId}/calculations/${latestCalculation.id}`
            );
            setCalculationResults(resultsResponse.data);
          }
        }

        setLoading(false);
      } catch (err) {
        setError(err.response?.data?.error || 'Error loading scenario');
        setLoading(false);
      }
    };

    fetchScenarioData();
  }, [scenarioId, showCalculations]);

  if (loading) return <div>Loading scenario details...</div>;
  if (error) return <div>{error}</div>;
  if (!scenario) return <div>Scenario not found</div>;

  return (
    <div>
      <h2>{scenario.title}</h2>
      <p>{scenario.description}</p>
      
      <h3>Parameters</h3>
      <ul>
        {Object.entries(scenario.parameters || {}).map(([key, value]) => (
          <li key={key}>
            <strong>{key}:</strong> {value}
          </li>
        ))}
      </ul>

      {showCalculations && calculationResults && (
        <div>
          <h3>Calculation Results</h3>
          <div>
            <h4>Capacity</h4>
            <p>Total: {calculationResults.results.capacity.total}</p>
            
            <h4>Utilization</h4>
            <p>{(calculationResults.results.utilization.overall * 100).toFixed(0)}%</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default ScenarioDetail;