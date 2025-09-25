export default function SimplePage() {
  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1>HomeLens - Simple Version</h1>
      <p>This is a simplified version to test Vercel deployment.</p>
      <p>If you can see this, the deployment is working!</p>
      
      <div style={{ marginTop: '20px' }}>
        <a 
          href="/" 
          style={{ 
            padding: '10px 20px', 
            backgroundColor: '#368F8B', 
            color: 'white', 
            textDecoration: 'none', 
            borderRadius: '5px',
            display: 'inline-block'
          }}
        >
          Go to Full Homepage
        </a>
      </div>
    </div>
  );
}
