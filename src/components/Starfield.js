/**
 * STARFIELD ANIMATION
 * Classic FF-style animated starfield background
 */

export class Starfield {
    constructor(canvasId = 'starfield') {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas ? this.canvas.getContext('2d') : null;
        this.stars = [];
        this.numStars = 200;
        this.animationId = null;
        this.isRunning = false;
        
        if (this.canvas && this.ctx) {
            this.initialize();
        } else {
            console.warn('⭐ Starfield: Canvas element not found');
        }
    }
    
    initialize() {
        console.log('⭐ Initializing starfield animation...');
        
        // Set up canvas
        this.resizeCanvas();
        this.initStars();
        
        // Set up event listeners
        window.addEventListener('resize', () => this.resizeCanvas());
        
        // Start animation
        this.start();
        
        console.log('✅ Starfield animation initialized');
    }
    
    resizeCanvas() {
        if (!this.canvas) return;
        
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        
        // Reinitialize stars when canvas size changes
        if (this.stars.length > 0) {
            this.initStars();
        }
    }
    
    initStars() {
        this.stars = [];
        
        for (let i = 0; i < this.numStars; i++) {
            this.stars.push({
                x: (Math.random() - 0.5) * this.canvas.width,
                y: (Math.random() - 0.5) * this.canvas.height,
                z: Math.random() * this.canvas.width
            });
        }
    }
    
    drawStars() {
        if (!this.ctx || !this.canvas) return;
        
        // Clear canvas with black background
        this.ctx.fillStyle = 'black';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw stars
        this.ctx.fillStyle = 'white';
        
        for (let i = 0; i < this.numStars; i++) {
            let star = this.stars[i];
            
            // Move star towards camera
            star.z -= 2;
            
            // Reset star when it goes past camera
            if (star.z <= 0) {
                star.x = (Math.random() - 0.5) * this.canvas.width;
                star.y = (Math.random() - 0.5) * this.canvas.height;
                star.z = this.canvas.width;
            }
            
            // Calculate 3D projection
            let k = 128.0 / star.z;
            let sx = star.x * k + this.canvas.width / 2;
            let sy = star.y * k + this.canvas.height / 2;
            
            // Skip stars outside canvas bounds
            if (sx < 0 || sx >= this.canvas.width || sy < 0 || sy >= this.canvas.height) {
                continue;
            }
            
            // Calculate star size based on distance
            let size = (1 - star.z / this.canvas.width) * 3;
            let opacity = (1 - star.z / this.canvas.width);
            
            // Draw star with varying opacity
            this.ctx.globalAlpha = Math.max(0.1, opacity);
            this.ctx.fillRect(sx, sy, size, size);
        }
        
        // Reset alpha
        this.ctx.globalAlpha = 1.0;
        
        // Continue animation
        if (this.isRunning) {
            this.animationId = requestAnimationFrame(() => this.drawStars());
        }
    }
    
    start() {
        if (!this.isRunning) {
            this.isRunning = true;
            this.drawStars();
            console.log('⭐ Starfield animation started');
        }
    }
    
    stop() {
        if (this.isRunning) {
            this.isRunning = false;
            if (this.animationId) {
                cancelAnimationFrame(this.animationId);
                this.animationId = null;
            }
            console.log('⭐ Starfield animation stopped');
        }
    }
    
    // Method to pause/resume based on menu visibility
    setActive(active) {
        if (active) {
            this.start();
        } else {
            this.stop();
        }
    }
    
    // Clean up resources
    destroy() {
        this.stop();
        if (this.canvas) {
            window.removeEventListener('resize', () => this.resizeCanvas());
        }
    }
}

// Auto-initialize when DOM is ready
let starfield = null;

function initializeStarfield() {
    const homeView = document.getElementById('homeView');
    const canvas = document.getElementById('starfield');
    
    if (canvas && homeView) {
        starfield = new Starfield('starfield');
        
        // Monitor home view visibility
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                    const isActive = homeView.classList.contains('active');
                    if (starfield) {
                        starfield.setActive(isActive);
                    }
                }
            });
        });
        
        observer.observe(homeView, { attributes: true });
        
        // Set initial state
        const isActive = homeView.classList.contains('active');
        starfield.setActive(isActive);
    }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeStarfield);
} else {
    initializeStarfield();
}

export default starfield;