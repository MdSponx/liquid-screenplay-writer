// This file serves as an alternative entry point for StackBlitz
// It imports the main application entry point and adds StackBlitz-specific code

// Import the main application entry point
import './src/main.tsx';

// Log a message to the console
console.log('StackBlitz entry point loaded');

// Add StackBlitz-specific code here
// For example, you might want to add a global variable to indicate that we're running in StackBlitz
window.STACKBLITZ = true;

// You can also add StackBlitz-specific event listeners or other initialization code here
document.addEventListener('DOMContentLoaded', () => {
  console.log('StackBlitz application loaded');
  
  // You can add StackBlitz-specific DOM manipulations here
  // For example, you might want to add a StackBlitz badge to the application
  
  // Check if we're actually running in StackBlitz
  if (window.location.host.includes('stackblitz.io')) {
    console.log('Confirmed running in StackBlitz environment');
  }
});
