/**
 * Main entry point for Typography Layout Calculator
 */
import { initializeCalculator } from './ui.js';
// Initialize calculator when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeCalculator);
}
else {
    initializeCalculator();
}
