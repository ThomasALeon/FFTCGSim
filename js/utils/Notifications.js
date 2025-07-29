/**
 * NOTIFICATIONS - User Notification System
 * 
 * Provides toast notifications, alerts, and user feedback
 * with different types, animations, and persistence options
 */

import { logger } from './Logger.js';

export class Notifications {
    constructor() {
        this.container = null;
        this.notifications = new Map();
        this.config = {
            position: 'top-right', // top-right, top-left, bottom-right, bottom-left, center
            defaultDuration: 4000,
            maxNotifications: 5,
            enableSounds: false,
            enableAnimations: true
        };

        this.notificationTypes = {
            success: {
                icon: '✅',
                color: '#4CAF50',
                duration: 3000
            },
            error: {
                icon: '❌',
                color: '#f44336',
                duration: 6000
            },
            warning: {
                icon: '⚠️',
                color: '#ff9800',
                duration: 4000
            },
            info: {
                icon: 'ℹ️',
                color: '#2196F3',
                duration: 4000
            },
            loading: {
                icon: '⏳',
                color: '#607D8B',
                duration: 0 // Persistent until dismissed
            }
        };

        this.initialize();
        logger.debug('🔔 Notifications system initialized');
    }

    /**
     * Initialize notification system
     */
    initialize() {
        this.createContainer();
        this.injectStyles();
        this.setupEventListeners();
    }

    /**
     * Create notification container
     */
    createContainer() {
        // Remove existing container if present
        const existing = document.getElementById('notification-container');
        if (existing) {
            existing.remove();
        }

        this.container = document.createElement('div');
        this.container.id = 'notification-container';
        this.container.className = `notification-container position-${this.config.position}`;
        
        document.body.appendChild(this.container);
    }

    /**
     * Inject CSS styles
     */
    injectStyles() {
        const existingStyle = document.getElementById('notification-styles');
        if (existingStyle) {
            existingStyle.remove();
        }

        const style = document.createElement('style');
        style.id = 'notification-styles';
        style.textContent = `
            .notification-container {
                position: fixed;
                z-index: 10000;
                pointer-events: none;
                max-width: 400px;
            }

            .notification-container.position-top-right {
                top: 20px;
                right: 20px;
            }

            .notification-container.position-top-left {
                top: 20px;
                left: 20px;
            }

            .notification-container.position-bottom-right {
                bottom: 20px;
                right: 20px;
            }

            .notification-container.position-bottom-left {
                bottom: 20px;
                left: 20px;
            }

            .notification-container.position-center {
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
            }

            .notification {
                display: flex;
                align-items: center;
                padding: 12px 16px;
                margin-bottom: 8px;
                background: rgba(0, 0, 0, 0.9);
                color: white;
                border-radius: 8px;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
                pointer-events: auto;
                cursor: pointer;
                max-width: 100%;
                word-wrap: break-word;
                backdrop-filter: blur(10px);
                border-left: 4px solid;
                transition: all 0.3s ease;
            }

            .notification:hover {
                transform: translateX(-4px);
                box-shadow: 0 6px 16px rgba(0, 0, 0, 0.4);
            }

            .notification.type-success {
                border-left-color: #4CAF50;
                background: rgba(76, 175, 80, 0.1);
            }

            .notification.type-error {
                border-left-color: #f44336;
                background: rgba(244, 67, 54, 0.1);
            }

            .notification.type-warning {
                border-left-color: #ff9800;
                background: rgba(255, 152, 0, 0.1);
            }

            .notification.type-info {
                border-left-color: #2196F3;
                background: rgba(33, 150, 243, 0.1);
            }

            .notification.type-loading {
                border-left-color: #607D8B;
                background: rgba(96, 125, 139, 0.1);
            }

            .notification-icon {
                margin-right: 12px;
                font-size: 18px;
                min-width: 20px;
            }

            .notification-content {
                flex: 1;
            }

            .notification-title {
                font-weight: bold;
                margin-bottom: 4px;
                font-size: 14px;
            }

            .notification-message {
                font-size: 13px;
                opacity: 0.9;
                line-height: 1.4;
            }

            .notification-close {
                margin-left: 12px;
                cursor: pointer;
                opacity: 0.7;
                font-size: 16px;
                width: 20px;
                height: 20px;
                display: flex;
                align-items: center;
                justify-content: center;
                border-radius: 50%;
                transition: all 0.2s ease;
            }

            .notification-close:hover {
                opacity: 1;
                background: rgba(255, 255, 255, 0.1);
            }

            .notification-progress {
                position: absolute;
                bottom: 0;
                left: 0;
                height: 2px;
                background: currentColor;
                opacity: 0.5;
                transition: width linear;
            }

            .notification.entering {
                animation: notificationEnter 0.3s ease-out;
            }

            .notification.leaving {
                animation: notificationLeave 0.3s ease-in forwards;
            }

            @keyframes notificationEnter {
                from {
                    opacity: 0;
                    transform: translateX(100%);
                }
                to {
                    opacity: 1;
                    transform: translateX(0);
                }
            }

            @keyframes notificationLeave {
                from {
                    opacity: 1;
                    transform: translateX(0);
                    max-height: 100px;
                    margin-bottom: 8px;
                }
                to {
                    opacity: 0;
                    transform: translateX(100%);
                    max-height: 0;
                    margin-bottom: 0;
                    padding-top: 0;
                    padding-bottom: 0;
                }
            }

            .notification-loading-spinner {
                animation: spin 1s linear infinite;
            }

            @keyframes spin {
                from { transform: rotate(0deg); }
                to { transform: rotate(360deg); }
            }
        `;

        document.head.appendChild(style);
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Listen for keyboard shortcuts
        document.addEventListener('keydown', (event) => {
            // Escape key closes all notifications
            if (event.key === 'Escape') {
                this.clearAll();
            }
        });
    }

    /**
     * Show a notification
     */
    show(message, type = 'info', options = {}) {
        logger.debug(`🔔 Showing ${type} notification: ${message}`);

        const id = this.generateId();
        const typeConfig = this.notificationTypes[type] || this.notificationTypes.info;
        
        const notification = {
            id,
            message,
            type,
            title: options.title || null,
            duration: options.duration !== undefined ? options.duration : typeConfig.duration,
            persistent: options.persistent || false,
            actions: options.actions || [],
            createdAt: new Date(),
            element: null,
            timeoutId: null,
            progressInterval: null
        };

        // Create DOM element
        notification.element = this.createNotificationElement(notification, typeConfig);
        
        // Add to container with animation
        if (this.config.enableAnimations) {
            notification.element.classList.add('entering');
        }
        
        this.container.appendChild(notification.element);
        
        // Store notification
        this.notifications.set(id, notification);
        
        // Auto-dismiss if duration is set
        if (notification.duration > 0 && !notification.persistent) {
            this.scheduleAutoDismiss(notification);
        }
        
        // Limit number of notifications
        this.enforceMaxNotifications();
        
        // Play sound if enabled
        if (this.config.enableSounds) {
            this.playNotificationSound(type);
        }

        return id;
    }

    /**
     * Create notification DOM element
     */
    createNotificationElement(notification, typeConfig) {
        const element = document.createElement('div');
        element.className = `notification type-${notification.type}`;
        element.style.borderLeftColor = typeConfig.color;
        
        // Icon
        let icon = typeConfig.icon;
        if (notification.type === 'loading') {
            icon = '<div class="notification-loading-spinner">⏳</div>';
        }

        // Content
        let content = `
            <div class="notification-icon">${icon}</div>
            <div class="notification-content">
                ${notification.title ? `<div class="notification-title">${this.escapeHtml(notification.title)}</div>` : ''}
                <div class="notification-message">${this.escapeHtml(notification.message)}</div>
            </div>
        `;

        // Actions
        if (notification.actions.length > 0) {
            content += '<div class="notification-actions">';
            notification.actions.forEach(action => {
                content += `<button class="notification-action" data-action="${action.id}">${this.escapeHtml(action.label)}</button>`;
            });
            content += '</div>';
        }

        // Close button
        if (!notification.persistent) {
            content += '<div class="notification-close" title="Close">×</div>';
        }

        element.innerHTML = content;

        // Progress bar for timed notifications
        if (notification.duration > 0 && !notification.persistent) {
            const progressBar = document.createElement('div');
            progressBar.className = 'notification-progress';
            progressBar.style.width = '100%';
            element.appendChild(progressBar);
        }

        // Event listeners
        this.attachNotificationListeners(element, notification);

        return element;
    }

    /**
     * Attach event listeners to notification element
     */
    attachNotificationListeners(element, notification) {
        // Close button
        const closeBtn = element.querySelector('.notification-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.dismiss(notification.id);
            });
        }

        // Action buttons
        const actionBtns = element.querySelectorAll('.notification-action');
        actionBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const actionId = btn.dataset.action;
                const action = notification.actions.find(a => a.id === actionId);
                if (action && action.handler) {
                    action.handler(notification);
                }
                if (action && action.dismissOnClick !== false) {
                    this.dismiss(notification.id);
                }
            });
        });

        // Click to dismiss (unless persistent)
        if (!notification.persistent) {
            element.addEventListener('click', () => {
                this.dismiss(notification.id);
            });
        }
    }

    /**
     * Schedule auto-dismiss for notification
     */
    scheduleAutoDismiss(notification) {
        if (notification.timeoutId) {
            clearTimeout(notification.timeoutId);
        }

        notification.timeoutId = setTimeout(() => {
            this.dismiss(notification.id);
        }, notification.duration);

        // Progress bar animation
        const progressBar = notification.element?.querySelector('.notification-progress');
        if (progressBar) {
            progressBar.style.transition = `width ${notification.duration}ms linear`;
            setTimeout(() => {
                progressBar.style.width = '0%';
            }, 10);
        }
    }

    /**
     * Dismiss a notification
     */
    dismiss(id) {
        const notification = this.notifications.get(id);
        if (!notification) {
            return false;
        }

        logger.trace(`🔔 Dismissing notification: ${id}`);

        // Clear timeout
        if (notification.timeoutId) {
            clearTimeout(notification.timeoutId);
        }

        // Remove with animation
        if (this.config.enableAnimations && notification.element) {
            notification.element.classList.add('leaving');
            setTimeout(() => {
                this.removeNotificationElement(notification);
            }, 300);
        } else {
            this.removeNotificationElement(notification);
        }

        return true;
    }

    /**
     * Remove notification element and clean up
     */
    removeNotificationElement(notification) {
        if (notification.element && notification.element.parentNode) {
            notification.element.parentNode.removeChild(notification.element);
        }
        this.notifications.delete(notification.id);
    }

    /**
     * Update an existing notification
     */
    update(id, message, options = {}) {
        const notification = this.notifications.get(id);
        if (!notification) {
            return false;
        }

        logger.trace(`🔔 Updating notification: ${id}`);

        // Update properties
        notification.message = message;
        if (options.title !== undefined) notification.title = options.title;
        if (options.type !== undefined) notification.type = options.type;

        // Update DOM
        const messageEl = notification.element?.querySelector('.notification-message');
        if (messageEl) {
            messageEl.textContent = message;
        }

        const titleEl = notification.element?.querySelector('.notification-title');
        if (titleEl && notification.title) {
            titleEl.textContent = notification.title;
        }

        // Reschedule auto-dismiss if duration changed
        if (options.duration !== undefined) {
            notification.duration = options.duration;
            if (notification.duration > 0 && !notification.persistent) {
                this.scheduleAutoDismiss(notification);
            }
        }

        return true;
    }

    /**
     * Clear all notifications
     */
    clearAll() {
        logger.debug('🔔 Clearing all notifications');
        
        const ids = Array.from(this.notifications.keys());
        ids.forEach(id => this.dismiss(id));
    }

    /**
     * Enforce maximum number of notifications
     */
    enforceMaxNotifications() {
        const notifications = Array.from(this.notifications.values())
            .sort((a, b) => a.createdAt - b.createdAt);

        while (notifications.length > this.config.maxNotifications) {
            const oldest = notifications.shift();
            this.dismiss(oldest.id);
        }
    }

    /**
     * Convenience methods for different notification types
     */
    success(message, options = {}) {
        return this.show(message, 'success', options);
    }

    error(message, options = {}) {
        return this.show(message, 'error', options);
    }

    warning(message, options = {}) {
        return this.show(message, 'warning', options);
    }

    info(message, options = {}) {
        return this.show(message, 'info', options);
    }

    loading(message, options = {}) {
        return this.show(message, 'loading', { ...options, persistent: true });
    }

    /**
     * Show confirmation dialog
     */
    confirm(message, options = {}) {
        return new Promise((resolve) => {
            const actions = [
                {
                    id: 'confirm',
                    label: options.confirmLabel || 'Confirm',
                    handler: () => resolve(true)
                },
                {
                    id: 'cancel',
                    label: options.cancelLabel || 'Cancel',
                    handler: () => resolve(false)
                }
            ];

            this.show(message, 'warning', {
                ...options,
                persistent: true,
                actions
            });
        });
    }

    /**
     * Utility methods
     */
    generateId() {
        return 'notification_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    playNotificationSound(type) {
        // Simple sound implementation
        try {
            const context = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = context.createOscillator();
            const gainNode = context.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(context.destination);
            
            // Different frequencies for different types
            const frequencies = {
                success: 800,
                error: 400,
                warning: 600,
                info: 500,
                loading: 450
            };
            
            oscillator.frequency.setValueAtTime(frequencies[type] || 500, context.currentTime);
            gainNode.gain.setValueAtTime(0.1, context.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, context.currentTime + 0.1);
            
            oscillator.start(context.currentTime);
            oscillator.stop(context.currentTime + 0.1);
        } catch (error) {
            // Sound not supported, ignore
        }
    }

    /**
     * Configure notification system
     */
    configure(options) {
        Object.assign(this.config, options);
        
        // Recreate container if position changed
        if (options.position) {
            this.createContainer();
        }
        
        logger.debug('🔔 Notifications configured:', options);
    }

    /**
     * Get current notifications
     */
    getAll() {
        return Array.from(this.notifications.values());
    }

    /**
     * Get notification by ID
     */
    get(id) {
        return this.notifications.get(id);
    }
}

// Create global instance
export const notifications = new Notifications();