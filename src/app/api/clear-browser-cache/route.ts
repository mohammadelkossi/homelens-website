import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    console.log('🧹 Browser cache clearing instructions generated');
    
    // Generate JavaScript code to clear browser caches
    const clearBrowserCacheScript = `
      // Clear localStorage
      localStorage.clear();
      console.log('🧹 localStorage cleared');
      
      // Clear sessionStorage
      sessionStorage.clear();
      console.log('🧹 sessionStorage cleared');
      
      // Clear IndexedDB (if used)
      if ('indexedDB' in window) {
        indexedDB.databases().then(databases => {
          databases.forEach(db => {
            indexedDB.deleteDatabase(db.name);
          });
        });
        console.log('🧹 IndexedDB cleared');
      }
      
      // Clear cookies (only application cookies, not all cookies)
      document.cookie.split(";").forEach(cookie => {
        const eqPos = cookie.indexOf("=");
        const name = eqPos > -1 ? cookie.substr(0, eqPos) : cookie;
        document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/";
      });
      console.log('🧹 Application cookies cleared');
      
      alert('Browser cache cleared successfully!');
    `;
    
    return NextResponse.json({
      success: true,
      message: 'Browser cache clearing script generated',
      script: clearBrowserCacheScript,
      instructions: [
        'Open browser developer tools (F12)',
        'Go to Console tab',
        'Paste and run the provided script',
        'Or manually clear: localStorage.clear(); sessionStorage.clear();'
      ]
    });
    
  } catch (error) {
    console.error('❌ Error generating browser cache clear script:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to generate browser cache clear script',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
