/**
 * Vercel Speed Insights Integration
 * This script initializes Vercel Speed Insights for tracking web vitals
 * 
 * Speed Insights automatically tracks Core Web Vitals:
 * - CLS (Cumulative Layout Shift)
 * - FID (First Input Delay) / INP (Interaction to Next Paint)
 * - FCP (First Contentful Paint)
 * - LCP (Largest Contentful Paint)
 * - TTFB (Time to First Byte)
 * 
 * Documentation: https://vercel.com/docs/speed-insights/quickstart
 */

// Dynamically import and initialize Speed Insights from CDN
(async () => {
  try {
    // Import the injectSpeedInsights function from jsDelivr CDN
    const { injectSpeedInsights } = await import('https://cdn.jsdelivr.net/npm/@vercel/speed-insights@2.0.0/dist/index.js');
    
    // Initialize Speed Insights with configuration
    injectSpeedInsights({
      // Debug mode: enabled for localhost/development environments
      debug: window.location.hostname === 'localhost' || 
             window.location.hostname === '127.0.0.1',
      
      // Sample rate: 1.0 means track 100% of page views
      // Reduce this value (e.g., 0.5 for 50%) to lower data collection costs
      sampleRate: 1.0,
      
      // Optional: beforeSend callback to filter or modify events
      // beforeSend: (data) => {
      //   // Example: filter out sensitive paths
      //   if (data.url.includes('/admin')) return null;
      //   return data;
      // },
    });
    
    console.log('✓ Vercel Speed Insights initialized');
  } catch (error) {
    // Fail silently in production, log in development
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      console.warn('Speed Insights initialization failed:', error);
    }
  }
})();
