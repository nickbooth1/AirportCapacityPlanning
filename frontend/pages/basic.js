import React from 'react';

export default function BasicPage() {
  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px' }}>
      <h1>Airport Capacity Planner - Basic Test Page</h1>
      <p>This is a simple page to verify that the Next.js server is working properly.</p>
      
      <div style={{ marginTop: '20px' }}>
        <h2>Backend Status</h2>
        <div>
          <button onClick={() => {
            fetch('http://localhost:3001/health')
              .then(res => res.json())
              .then(data => {
                document.getElementById('backend-status').textContent = 
                  `Backend is healthy: ${JSON.stringify(data)}`;
              })
              .catch(err => {
                document.getElementById('backend-status').textContent = 
                  `Error connecting to backend: ${err.message}`;
              });
          }}>
            Test Backend Connection
          </button>
          <div id="backend-status" style={{ marginTop: '10px', padding: '10px', border: '1px solid #ccc' }}>
            Click the button to test the backend connection
          </div>
        </div>
      </div>

      <div style={{ marginTop: '30px' }}>
        <h2>Available Pages</h2>
        <ul>
          <li><a href="/">Home Page</a></li>
          <li><a href="/terminals">Terminals</a></li>
          <li><a href="/piers">Piers</a></li>
          <li><a href="/stands">Stands</a></li>
        </ul>
      </div>
    </div>
  );
}