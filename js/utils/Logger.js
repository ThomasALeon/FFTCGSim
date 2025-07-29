/**
 * LOGGER - Comprehensive Logging and Debugging System
 * 
 * Provides real-time logging, error tracking, and debugging capabilities
 * for the FFTCG Simulator with different log levels and output formats
 */

export class Logger {
    constructor() {
        this.LOG_LEVELS = {
            ERROR: 0,
            WARN: 1,
            INFO: 2,
            DEBUG: 3,
            TRACE: 4
        };

        // Configuration
        this.config = {
            level: this.LOG_LEVELS.DEBUG,
            enableConsole: true,
            enableStorage: true,
            enableUI: true,
            maxStoredLogs: 1000,
            showTimestamp: true,
            showCaller: true,
            colorize: true
        };

        // Log storage
        this.logs = [];
        this.errorLogs = [];

        // Performance tracking
        this.timers = new Map();
        this.counters = new Map();

        // UI elements
        this.logContainer = null;
        this.setupUI();

        // Colors for different log levels
        this.colors = {
            ERROR: '#ff4444',
            WARN: '#ffaa44',
            INFO: '#4488ff', 
            DEBUG: '#44ff44',
            TRACE: '#aaaaaa'
        };

        // Initialize
        this.info('🔧 Logger initialized');
    }

    /**
     * Set up debug UI overlay
     */
    setupUI() {
        // Create debug overlay
        const debugOverlay = document.createElement('div');
        debugOverlay.id = 'debug-overlay';
        debugOverlay.innerHTML = `
            <div id="debug-header">
                <span>🐛 Debug Console</span>
                <div id="debug-controls">
                    <button id="debug-clear">Clear</button>
                    <button id="debug-export">Export</button>
                    <button id="debug-toggle">Hide</button>
                </div>
            </div>
            <div id="debug-content">
                <div id="debug-logs"></div>
            </div>
        `;
        
        // Add CSS
        const style = document.createElement('style');
        style.textContent = `
            #debug-overlay {
                position: fixed;
                top: 10px;
                right: 10px;
                width: 400px;
                max-height: 300px;
                background: rgba(0, 0, 0, 0.9);
                border: 1px solid #444;
                border-radius: 5px;
                font-family: 'Courier New', monospace;
                font-size: 11px;
                z-index: 10000;
                display: none;
            }
            
            #debug-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 5px 10px;
                background: #333;
                color: white;
                border-radius: 5px 5px 0 0;
            }
            
            #debug-controls button {
                margin-left: 5px;
                padding: 2px 8px;
                font-size: 10px;
                background: #555;
                color: white;
                border: none;
                border-radius: 3px;
                cursor: pointer;
            }
            
            #debug-controls button:hover {
                background: #666;
            }
            
            #debug-content {
                overflow-y: auto;
                max-height: 250px;
            }
            
            #debug-logs {
                padding: 5px;
            }
            
            .debug-log-entry {
                margin: 2px 0;
                padding: 2px 5px;
                border-radius: 2px;
                word-wrap: break-word;
                font-size: 10px;
                line-height: 1.2;
            }
            
            .debug-log-timestamp {
                color: #888;
                font-size: 9px;
            }
            
            .debug-log-level {
                font-weight: bold;
                margin-right: 5px;
            }
            
            .debug-log-caller {
                color: #aaa;
                font-size: 9px;
                font-style: italic;
            }
        `;
        
        document.head.appendChild(style);
        document.body.appendChild(debugOverlay);
        
        this.logContainer = document.getElementById('debug-logs');
        
        // Set up event listeners
        document.getElementById('debug-clear')?.addEventListener('click', () => this.clearLogs());
        document.getElementById('debug-export')?.addEventListener('click', () => this.exportLogs());
        document.getElementById('debug-toggle')?.addEventListener('click', () => this.hideUI());
        
        // Show debug overlay in development
        if (window.location.hostname === 'localhost') {
            this.showUI();
        }
    }

    /**
     * Show debug UI
     */
    showUI() {
        const overlay = document.getElementById('debug-overlay');
        if (overlay) {
            overlay.style.display = 'block';
        }
    }

    /**
     * Hide debug UI
     */
    hideUI() {
        const overlay = document.getElementById('debug-overlay');
        if (overlay) {
            overlay.style.display = 'none';
        }
    }

    /**
     * Get caller information for debugging
     */
    getCaller() {
        if (!this.config.showCaller) return '';
        
        try {
            const stack = new Error().stack;
            const lines = stack.split('\n');
            // Skip Logger methods to get actual caller
            for (let i = 3; i < lines.length; i++) {
                const line = lines[i];
                if (line && !line.includes('Logger.js')) {
                    const match = line.match(/at (.+?) \(/);
                    return match ? `[${match[1]}]` : '';
                }
            }
        } catch (e) {
            // Ignore errors in caller detection
        }
        return '';
    }

    /**
     * Format log message
     */
    formatMessage(level, message, data = null) {
        const timestamp = this.config.showTimestamp ? 
            new Date().toLocaleTimeString() : '';
        const caller = this.getCaller();
        
        return {
            timestamp,
            level,
            caller,
            message: typeof message === 'object' ? JSON.stringify(message, null, 2) : message,
            data: data ? (typeof data === 'object' ? JSON.stringify(data, null, 2) : data) : null
        };
    }

    /**
     * Add log entry to storage and UI
     */
    addLogEntry(level, message, data = null) {
        const entry = this.formatMessage(level, message, data);
        
        // Add to storage
        this.logs.push(entry);
        if (level === 'ERROR') {
            this.errorLogs.push(entry);
        }
        
        // Limit stored logs
        if (this.logs.length > this.config.maxStoredLogs) {
            this.logs.shift();
        }
        
        // Add to UI
        if (this.config.enableUI && this.logContainer) {
            this.addUILogEntry(entry);
        }
        
        // Console output
        if (this.config.enableConsole) {
            this.outputToConsole(entry);
        }
    }

    /**
     * Add log entry to UI
     */
    addUILogEntry(entry) {
        const logElement = document.createElement('div');
        logElement.className = 'debug-log-entry';
        
        const color = this.colors[entry.level] || '#ffffff';
        
        logElement.innerHTML = `
            ${entry.timestamp ? `<span class="debug-log-timestamp">${entry.timestamp}</span> ` : ''}
            <span class="debug-log-level" style="color: ${color}">${entry.level}</span>
            ${entry.caller ? `<span class="debug-log-caller">${entry.caller}</span> ` : ''}
            <span>${entry.message}</span>
            ${entry.data ? `<pre style="margin: 2px 0; font-size: 9px; color: #ccc;">${entry.data}</pre>` : ''}
        `;
        
        this.logContainer.appendChild(logElement);
        
        // Auto-scroll to bottom
        this.logContainer.scrollTop = this.logContainer.scrollHeight;
        
        // Limit UI log entries
        while (this.logContainer.children.length > 100) {
            this.logContainer.removeChild(this.logContainer.firstChild);
        }
    }

    /**
     * Output to console with styling
     */
    outputToConsole(entry) {
        const style = this.config.colorize ? `color: ${this.colors[entry.level]}; font-weight: bold;` : '';
        const prefix = `${entry.timestamp ? `[${entry.timestamp}] ` : ''}${entry.level}${entry.caller ? ` ${entry.caller}` : ''}:`;
        
        switch (entry.level) {
            case 'ERROR':
                console.error(`%c${prefix}`, style, entry.message, entry.data || '');
                break;
            case 'WARN':
                console.warn(`%c${prefix}`, style, entry.message, entry.data || '');
                break;
            case 'INFO':
                console.info(`%c${prefix}`, style, entry.message, entry.data || '');
                break;
            case 'DEBUG':
                console.log(`%c${prefix}`, style, entry.message, entry.data || '');
                break;
            case 'TRACE':
                console.trace(`%c${prefix}`, style, entry.message, entry.data || '');
                break;
        }
    }

    /**
     * Log error message
     */
    error(message, data = null) {
        if (this.config.level >= this.LOG_LEVELS.ERROR) {
            this.addLogEntry('ERROR', message, data);
        }
    }

    /**
     * Log warning message
     */
    warn(message, data = null) {
        if (this.config.level >= this.LOG_LEVELS.WARN) {
            this.addLogEntry('WARN', message, data);
        }
    }

    /**
     * Log info message
     */
    info(message, data = null) {
        if (this.config.level >= this.LOG_LEVELS.INFO) {
            this.addLogEntry('INFO', message, data);
        }
    }

    /**
     * Log debug message
     */
    debug(message, data = null) {
        if (this.config.level >= this.LOG_LEVELS.DEBUG) {
            this.addLogEntry('DEBUG', message, data);
        }
    }

    /**
     * Log trace message
     */
    trace(message, data = null) {
        if (this.config.level >= this.LOG_LEVELS.TRACE) {
            this.addLogEntry('TRACE', message, data);
        }
    }

    /**
     * Start performance timer
     */
    time(label) {
        this.timers.set(label, performance.now());
        this.debug(`⏱️ Timer started: ${label}`);
    }

    /**
     * End performance timer and log duration
     */
    timeEnd(label) {
        const startTime = this.timers.get(label);
        if (startTime) {
            const duration = performance.now() - startTime;
            this.timers.delete(label);
            this.info(`⏱️ ${label}: ${duration.toFixed(2)}ms`);
            return duration;
        } else {
            this.warn(`⏱️ Timer not found: ${label}`);
            return null;
        }
    }

    /**
     * Increment counter
     */
    count(label) {
        const current = this.counters.get(label) || 0;
        const newCount = current + 1;
        this.counters.set(label, newCount);
        this.debug(`📊 ${label}: ${newCount}`);
        return newCount;
    }

    /**
     * Get counter value
     */
    getCount(label) {
        return this.counters.get(label) || 0;
    }

    /**
     * Log object/state inspection
     */
    inspect(obj, label = 'Object') {
        this.debug(`🔍 ${label}:`, obj);
    }

    /**
     * Log assertion
     */
    assert(condition, message) {
        if (!condition) {
            this.error(`❌ Assertion failed: ${message}`);
            console.assert(condition, message);
        } else {
            this.trace(`✅ Assertion passed: ${message}`);
        }
    }

    /**
     * Log function entry/exit
     */
    funcEntry(funcName, args = null) {
        this.trace(`🔵 Entering ${funcName}`, args);
    }

    funcExit(funcName, result = null) {
        this.trace(`🔴 Exiting ${funcName}`, result);
    }

    /**
     * Clear all logs
     */
    clearLogs() {
        this.logs = [];
        this.errorLogs = [];
        if (this.logContainer) {
            this.logContainer.innerHTML = '';
        }
        console.clear();
        this.info('🧹 Logs cleared');
    }

    /**
     * Export logs as text
     */
    exportLogs() {
        const logText = this.logs.map(entry => {
            return `${entry.timestamp} [${entry.level}] ${entry.caller} ${entry.message}${entry.data ? `\n${entry.data}` : ''}`;
        }).join('\n');
        
        const blob = new Blob([logText], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `fftcg_logs_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        this.info('📁 Logs exported');
    }

    /**
     * Get system information
     */
    getSystemInfo() {
        return {
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent,
            url: window.location.href,
            viewport: {
                width: window.innerWidth,
                height: window.innerHeight
            },
            memory: performance.memory ? {
                used: Math.round(performance.memory.usedJSHeapSize / 1024 / 1024),
                total: Math.round(performance.memory.totalJSHeapSize / 1024 / 1024),
                limit: Math.round(performance.memory.jsHeapSizeLimit / 1024 / 1024)
            } : null,
            connection: navigator.connection ? {
                type: navigator.connection.effectiveType,
                downlink: navigator.connection.downlink,
                rtt: navigator.connection.rtt
            } : null
        };
    }

    /**
     * Log system information
     */
    logSystemInfo() {
        this.info('💻 System Info:', this.getSystemInfo());
    }

    /**
     * Set log level
     */
    setLevel(level) {
        if (typeof level === 'string') {
            level = this.LOG_LEVELS[level.toUpperCase()];
        }
        this.config.level = level;
        this.info(`📋 Log level set to: ${Object.keys(this.LOG_LEVELS)[level]}`);
    }

    /**
     * Configure logger
     */
    configure(options) {
        Object.assign(this.config, options);
        this.info('⚙️ Logger configured:', options);
    }

    /**
     * Get current statistics
     */
    getStats() {
        return {
            totalLogs: this.logs.length,
            errorCount: this.errorLogs.length,
            activeTimers: this.timers.size,
            counters: Object.fromEntries(this.counters),
            config: this.config
        };
    }
}

// Create global logger instance
export const logger = new Logger();

// Add global shortcuts for convenience
if (typeof window !== 'undefined') {
    window.log = logger;
    window.logger = logger;
}