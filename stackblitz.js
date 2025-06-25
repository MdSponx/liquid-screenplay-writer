// This file is used by StackBlitz to initialize the project
// It's automatically executed when the project is opened in StackBlitz

// Log a welcome message
console.log('Welcome to LiQid Screenplay Writer on StackBlitz!');

// You can add any StackBlitz-specific initialization code here
// For example, you might want to disable certain features that don't work well in StackBlitz

// Check if we're running in StackBlitz
const isStackBlitz = window.location.host.includes('stackblitz.io');

if (isStackBlitz) {
  console.log('Running in StackBlitz environment');
  
  // Add any StackBlitz-specific configuration here
  // For example, you might want to add a message to the console
  // or modify the DOM to show a StackBlitz-specific message
  
  // Add a message to the DOM when the app is loaded
  window.addEventListener('load', () => {
    // Wait for the app to initialize
    setTimeout(() => {
      // Create a banner element
      const banner = document.createElement('div');
      banner.style.position = 'fixed';
      banner.style.bottom = '10px';
      banner.style.right = '10px';
      banner.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
      banner.style.color = 'white';
      banner.style.padding = '10px';
      banner.style.borderRadius = '5px';
      banner.style.zIndex = '9999';
      banner.style.fontSize = '12px';
      banner.textContent = 'Running on StackBlitz';
      
      // Add the banner to the DOM
      document.body.appendChild(banner);
      
      // Remove the banner after 5 seconds
      setTimeout(() => {
        banner.style.opacity = '0';
        banner.style.transition = 'opacity 1s';
        setTimeout(() => {
          document.body.removeChild(banner);
        }, 1000);
      }, 5000);
    }, 2000);
  });
}
