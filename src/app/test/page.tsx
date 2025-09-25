export default function TestPage() {
  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1>HomeLens Test Page</h1>
      <p>If you can see this, the basic Next.js app is working!</p>
      <p>Environment: {process.env.NODE_ENV}</p>
      <p>Timestamp: {new Date().toISOString()}</p>
      
      <div style={{ marginTop: '20px' }}>
        <h2>Test API Endpoint:</h2>
        <button 
          onClick={async () => {
            try {
              const response = await fetch('/api/analyze');
              const data = await response.json();
              alert(JSON.stringify(data, null, 2));
            } catch (error) {
              alert('API Error: ' + error.message);
            }
          }}
          style={{ 
            padding: '10px 20px', 
            backgroundColor: '#368F8B', 
            color: 'white', 
            border: 'none', 
            borderRadius: '5px',
            cursor: 'pointer'
          }}
        >
          Test API
        </button>
      </div>
    </div>
  );
}
