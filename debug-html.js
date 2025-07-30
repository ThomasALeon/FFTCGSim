// HTML Debug Script - Run in browser console to check for missing elements
console.log('🔍 Checking HTML structure...');

const requiredElements = [
    'loadingScreen',
    'loadingProgress', 
    'app',
    'profileName',
    'profileAvatar',
    'profileStats',
    'deckCount'
];

requiredElements.forEach(id => {
    const element = document.getElementById(id);
    if (element) {
        console.log(`✅ Found element: ${id}`);
    } else {
        console.log(`❌ Missing element: ${id}`);
    }
});

// Check navigation buttons
const navBtns = document.querySelectorAll('.nav-btn');
console.log(`Found ${navBtns.length} navigation buttons`);

// Check views
const views = document.querySelectorAll('.view');
console.log(`Found ${views.length} view sections`);

console.log('🔍 HTML structure check complete');