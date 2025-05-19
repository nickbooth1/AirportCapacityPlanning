import Head from 'next/head';

// Define this as a standalone page that doesn't use the _app.js wrapper
export const config = {
  unstable_noApp: true,
};

// Simple standalone page for testing
export default function StandalonePage() {
  return (
    <>
      <Head>
        <title>Airport Capacity Planner - Standalone Test</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
        <h1>Airport Capacity Planner - Standalone Test Page</h1>
        <p>This is a simple page that bypasses _app.js to avoid MUI errors.</p>
        
        <div style={{ marginTop: '20px' }}>
          <h2>Backend Status</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <button 
              style={{ padding: '8px 16px', cursor: 'pointer' }}
              onClick={() => {
                const statusDiv = document.getElementById('backend-status');
                statusDiv.textContent = 'Connecting to backend...';
                
                fetch('http://localhost:3001/health')
                  .then(res => res.json())
                  .then(data => {
                    statusDiv.textContent = `Backend is healthy: ${JSON.stringify(data)}`;
                  })
                  .catch(err => {
                    statusDiv.textContent = `Error connecting to backend: ${err.message}`;
                  });
              }}
            >
              Test Backend Connection
            </button>
            <div 
              id="backend-status" 
              style={{ 
                marginTop: '10px', 
                padding: '10px', 
                border: '1px solid #ccc',
                minHeight: '50px'
              }}
            >
              Click the button to test the backend connection
            </div>
          </div>
        </div>

        <div style={{ marginTop: '30px' }}>
          <h2>Backend API Tests</h2>
          <button 
            style={{ padding: '8px 16px', cursor: 'pointer', marginRight: '10px' }}
            onClick={() => {
              const apiResultDiv = document.getElementById('api-result');
              apiResultDiv.textContent = 'Requesting data...';
              
              fetch('http://localhost:3001/api/airports')
                .then(res => res.json())
                .then(data => {
                  apiResultDiv.textContent = `Got airports data: ${JSON.stringify(data).substring(0, 200)}...`;
                })
                .catch(err => {
                  apiResultDiv.textContent = `Error: ${err.message}`;
                });
            }}
          >
            Test Airports API
          </button>
          
          <button 
            style={{ padding: '8px 16px', cursor: 'pointer' }}
            onClick={() => {
              const apiResultDiv = document.getElementById('api-result');
              apiResultDiv.textContent = 'Requesting data...';
              
              fetch('http://localhost:3001/api/capacity')
                .then(res => res.json())
                .then(data => {
                  apiResultDiv.textContent = `Got capacity data: ${JSON.stringify(data).substring(0, 200)}...`;
                })
                .catch(err => {
                  apiResultDiv.textContent = `Error: ${err.message}`;
                });
            }}
          >
            Test Capacity API
          </button>
          
          <div 
            id="api-result" 
            style={{ 
              marginTop: '10px', 
              padding: '10px', 
              border: '1px solid #ccc',
              minHeight: '50px'
            }}
          >
            Click a button to test an API endpoint
          </div>
        </div>
      </div>
    </>
  );
}