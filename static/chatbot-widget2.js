/**
 * IRIS Chatbot Widget - Complete Standalone Implementation
 * Enhanced with Voice Recording, Waveform Visualization & Modern Design
 * Version: 2.0.0
 * No dependencies required - can be embedded anywhere
 */

(function() {
    'use strict';

    // Configuration
    const API_ENDPOINT = "https://samvaadneu.techvedconsulting.com/tvd-bot/query";
    const COOKIE_KEY = "tvd_bot_history";
    const MAX_HISTORY = 10;

    // Widget configuration
    const WIDGET_CONFIG = {
        containerId: 'iris-chatbot-container',
        position: 'bottom-right', // 'bottom-right', 'bottom-left', 'inline'
        theme: {
            primaryColor: '#ea580c',
            secondaryColor: '#dc2626',
            textColor: '#374151',
            backgroundColor: '#ffffff',
            borderRadius: '16px'
        }
    };

    // FAQ data
    const FAQ_DATA = [
        { id: '1', question: 'Which CRs/NRs should I prioritize this week?' },
        { id: '2', question: 'Which CR/NR is pending for approval greater then 15 days?' },
        { id: '3', question: 'Show me all NRs from SOL?' },
        { id: '4', question: 'How many CRs were delivered last quarter?' }
    ];

    class IRISChatbot {
        constructor(options = {}) {
            this.config = { ...WIDGET_CONFIG, ...options };
            this.messages = [];
            this.isExpanded = false;
            this.isListening = false;
            this.isFullExpanded = false;
            this.isLoading = false;
            this.container = null;
            this.widget = null;
            this.recognition = null;

            this.init();
        }

        init() {
            this.injectStyles();
            this.createWidget();
            this.bindEvents();
            this.initializeWebSpeechAPI();
        }

        injectStyles() {
            if (document.getElementById('iris-chatbot-styles')) return;

            const style = document.createElement('style');
            style.id = 'iris-chatbot-styles';
            style.textContent = `
                .iris-chatbot-widget {
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                    position: fixed;
                    z-index: 10000;
                    transition: all 0.3s ease;
                }

                .iris-chatbot-widget.position-bottom-right {
                    bottom: 20px;
                    right: 20px;
                }

                .iris-chatbot-widget.position-bottom-left {
                    bottom: 20px;
                    left: 20px;
                }

                .iris-chatbot-widget.position-inline {
                    position: relative;
                    bottom: auto;
                    right: auto;
                }

                .iris-toggle-button {
                    width: 56px;
                    height: 56px;
                    background: linear-gradient(135deg, ${WIDGET_CONFIG.theme.primaryColor}, ${WIDGET_CONFIG.theme.secondaryColor});
                    border: none;
                    border-radius: 50%;
                    color: white;
                    cursor: pointer;
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: all 0.3s ease;
                }

                .iris-toggle-button:hover {
                    transform: scale(1.1);
                    box-shadow: 0 6px 20px rgba(0, 0, 0, 0.2);
                }

                .iris-toggle-button svg {
                    width: 24px;
                    height: 24px;
                }

                .iris-widget-container {
                    width: 384px;
                    max-width: calc(100vw - 40px);
                    height: 600px;
                    max-height: calc(100vh - 120px);
                    background: white;
                    border-radius: 16px;
                    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
                    overflow: hidden;
                    display: flex;
                    flex-direction: column;
                    position: absolute;
                    bottom: 70px;
                    right: 0;
                    transform: scale(0.75) translateY(20px);
                    opacity: 0;
                    pointer-events: none;
                    transition: all 0.3s ease;
                }

                .iris-widget-container.expanded {
                    transform: scale(1) translateY(0);
                    opacity: 1;
                    pointer-events: all;
                }

                .iris-widget-container.fullscreen-mode {
                    width: 100vw !important;
                    height: 100vh !important;
                    max-width: 100vw !important;
                    max-height: 100vh !important;
                    border-radius: 0 !important;
                    bottom: 0 !important;
                    right: 0 !important;
                    left: 0 !important;
                    top: 0 !important;
                    position: fixed !important;
                }

                .iris-widget-container.position-inline {
                    position: relative;
                    bottom: auto;
                    right: auto;
                    transform: none;
                    opacity: 1;
                    pointer-events: all;
                }

                .iris-header {
                    background: linear-gradient(135deg, ${WIDGET_CONFIG.theme.primaryColor}, ${WIDGET_CONFIG.theme.secondaryColor});
                    color: white;
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-start;
                    transition: all 0.3s ease;
                }

                .iris-header.full-header {
                    padding: 24px;
                }

                .iris-header.compact-header {
                    padding: 12px 16px;
                }

                .iris-header h1 {
                    font-size: 24px;
                    font-weight: bold;
                    margin: 0 0 16px 0;
                }

                .iris-header.compact-header h1 {
                    font-size: 18px;
                    margin: 0;
                }

                .iris-header .greeting {
                    font-size: 18px;
                    font-weight: 500;
                    margin: 8px 0;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }

                .iris-header .description {
                    font-size: 16px;
                    opacity: 0.9;
                    margin: 4px 0;
                }

                .iris-compact-info {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                }

                .iris-header-controls {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    margin-left: 16px;
                }

                .iris-header-btn {
                    background: none;
                    border: none;
                    color: white;
                    cursor: pointer;
                    padding: 8px;
                    border-radius: 6px;
                    transition: background-color 0.2s;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }

                .iris-header-btn:hover {
                    background-color: rgba(255, 255, 255, 0.1);
                }

                .iris-header-btn svg {
                    width: 16px;
                    height: 16px;
                }

                .iris-home-btn svg {
                    width: 20px;
                    height: 20px;
                }

                .iris-messages {
                    flex: 1;
                    padding: 16px;
                    overflow-y: auto;
                    background: white;
                }

                .iris-faq-section {
                    margin-bottom: 16px;
                }

                .iris-faq-header {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    margin-bottom: 12px;
                    font-weight: 500;
                    color: #374151;
                }

                .iris-faq-list {
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                }

                .iris-faq-item {
                    width: 100%;
                    text-align: left;
                    padding: 12px;
                    background: #f9fafb;
                    border: 1px solid #e5e7eb;
                    border-radius: 8px;
                    cursor: pointer;
                    transition: all 0.2s;
                    display: flex;
                    align-items: center;
                    gap: 12px;
                }

                .iris-faq-item:hover {
                    background: #f3f4f6;
                    border-color: #d1d5db;
                }

                .iris-faq-dot {
                    width: 8px;
                    height: 8px;
                    background: ${WIDGET_CONFIG.theme.primaryColor};
                    border-radius: 50%;
                    flex-shrink: 0;
                }

                .iris-faq-text {
                    font-size: 14px;
                    color: #374151;
                }

                .iris-message-list {
                    display: flex;
                    flex-direction: column;
                    gap: 12px;
                }

                .iris-message {
                    display: flex;
                    max-width: 80%;
                }

                .iris-message.user {
                    align-self: flex-end;
                    justify-content: flex-end;
                }

                .iris-message.bot {
                    align-self: flex-start;
                    justify-content: flex-start;
                }

                .iris-message-bubble {
                    padding: 12px;
                    border-radius: 16px;
                    font-size: 14px;
                    line-height: 1.4;
                }

                .iris-message.user .iris-message-bubble {
                    background: ${WIDGET_CONFIG.theme.primaryColor};
                    color: white;
                    border-bottom-right-radius: 4px;
                }

                .iris-message.bot .iris-message-bubble {
                    background: #f3f4f6;
                    color: #374151;
                    border-bottom-left-radius: 4px;
                }

                .iris-loading-indicator {
                    display: flex;
                    gap: 4px;
                    padding: 12px;
                    background: #f3f4f6;
                    border-radius: 16px;
                    border-bottom-left-radius: 4px;
                    align-items: center;
                }

                .iris-loading-dot {
                    width: 8px;
                    height: 8px;
                    background: #9ca3af;
                    border-radius: 50%;
                    animation: iris-bounce 1.4s ease-in-out infinite both;
                }

                .iris-loading-dot:nth-child(1) { animation-delay: -0.32s; }
                .iris-loading-dot:nth-child(2) { animation-delay: -0.16s; }

                @keyframes iris-bounce {
                    0%, 80%, 100% { transform: scale(0); }
                    40% { transform: scale(1); }
                }

                .iris-input-section {
                    padding: 16px;
                    border-top: 1px solid #e5e7eb;
                    background: white;
                    position: relative;
                }

                .iris-input-container {
                    display: flex;
                    align-items: center;
                    background: #f9fafb;
                    border: 2px solid #e5e7eb;
                    border-radius: 50px;
                    padding: 12px 16px;
                    gap: 12px;
                    transition: all 0.3s ease;
                    position: relative;
                }

                .iris-input-container.recording {
                    border-color: #ef4444;
                    background: #fef2f2;
                    box-shadow: 0 0 0 4px rgba(239, 68, 68, 0.1);
                }

                .iris-recording-overlay {
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: linear-gradient(90deg, transparent 0%, rgba(239, 68, 68, 0.1) 50%, transparent 100%);
                    border-radius: 50px;
                    opacity: 0;
                    animation: iris-recording-pulse 1.5s ease-in-out infinite;
                }

                .iris-input-container.recording .iris-recording-overlay {
                    opacity: 1;
                }

                .iris-waveform {
                    display: none;
                    align-items: center;
                    gap: 2px;
                    margin-right: 8px;
                }

                .iris-input-container.recording .iris-waveform {
                    display: flex;
                }

                .iris-wave-bar {
                    width: 3px;
                    background: #ef4444;
                    border-radius: 2px;
                    animation: iris-wave-animation 1.2s ease-in-out infinite;
                }

                .iris-wave-bar:nth-child(1) { height: 8px; animation-delay: 0s; }
                .iris-wave-bar:nth-child(2) { height: 12px; animation-delay: 0.1s; }
                .iris-wave-bar:nth-child(3) { height: 16px; animation-delay: 0.2s; }
                .iris-wave-bar:nth-child(4) { height: 20px; animation-delay: 0.3s; }
                .iris-wave-bar:nth-child(5) { height: 16px; animation-delay: 0.4s; }
                .iris-wave-bar:nth-child(6) { height: 12px; animation-delay: 0.5s; }
                .iris-wave-bar:nth-child(7) { height: 8px; animation-delay: 0.6s; }
                .iris-wave-bar:nth-child(8) { height: 14px; animation-delay: 0.7s; }
                .iris-wave-bar:nth-child(9) { height: 18px; animation-delay: 0.8s; }
                .iris-wave-bar:nth-child(10) { height: 10px; animation-delay: 0.9s; }

                @keyframes iris-wave-animation {
                    0%, 100% { 
                        transform: scaleY(0.3);
                        opacity: 0.5;
                    }
                    50% { 
                        transform: scaleY(1);
                        opacity: 1;
                    }
                }

                @keyframes iris-recording-pulse {
                    0%, 100% { 
                        transform: translateX(-100%);
                        opacity: 0;
                    }
                    50% { 
                        transform: translateX(100%);
                        opacity: 1;
                    }
                }

                .iris-input {
                    flex: 1;
                    border: none;
                    background: transparent;
                    outline: none;
                    padding: 8px 4px;
                    font-size: 15px;
                    color: #374151;
                    min-height: 20px;
                }

                .iris-input::placeholder {
                    color: #9ca3af;
                }

                .iris-input:disabled {
                    opacity: 0.6;
                    cursor: not-allowed;
                }

                .iris-input-btn {
                    width: 40px;
                    height: 40px;
                    border: none;
                    border-radius: 50%;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: all 0.3s ease;
                    position: relative;
                    flex-shrink: 0;
                }

                .iris-input-btn:disabled {
                    opacity: 0.5;
                    cursor: not-allowed;
                }

                .iris-mic-btn {
                    background: white;
                    color: #6b7280;
                    border: 2px solid #e5e7eb;
                    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
                }

                .iris-mic-btn:hover:not(:disabled) {
                    background: #f9fafb;
                    border-color: #d1d5db;
                    transform: scale(1.05);
                }

                .iris-mic-btn.listening {
                    color: white;
                    background: #ef4444;
                    border-color: #ef4444;
                    box-shadow: 0 0 0 4px rgba(239, 68, 68, 0.2);
                    animation: iris-mic-pulse 1.5s ease-in-out infinite;
                }

                @keyframes iris-mic-pulse {
                    0%, 100% { 
                        transform: scale(1);
                        box-shadow: 0 0 0 4px rgba(239, 68, 68, 0.2);
                    }
                    50% { 
                        transform: scale(1.05);
                        box-shadow: 0 0 0 8px rgba(239, 68, 68, 0.1);
                    }
                }

                .iris-send-btn {
                    background: ${WIDGET_CONFIG.theme.primaryColor};
                    color: white;
                    border: 2px solid ${WIDGET_CONFIG.theme.primaryColor};
                    box-shadow: 0 2px 4px rgba(234, 88, 12, 0.3);
                }

                .iris-send-btn:hover:not(:disabled) {
                    background: #ea580c;
                    border-color: #ea580c;
                    transform: scale(1.05);
                    box-shadow: 0 4px 8px rgba(234, 88, 12, 0.4);
                }

                .iris-powered-by {
                    text-align: center;
                    margin-top: 8px;
                    font-size: 12px;
                    color: #6b7280;
                }

                .iris-powered-by .brand {
                    color: ${WIDGET_CONFIG.theme.primaryColor};
                    font-weight: 500;
                }

                /* Scrollbar styling */
                .iris-messages::-webkit-scrollbar {
                    width: 4px;
                }

                .iris-messages::-webkit-scrollbar-track {
                    background: #f1f1f1;
                    border-radius: 2px;
                }

                .iris-messages::-webkit-scrollbar-thumb {
                    background: #c1c1c1;
                    border-radius: 2px;
                }

                .iris-messages::-webkit-scrollbar-thumb:hover {
                    background: #a8a8a8;
                }

                /* Table styling for bot responses */
                .iris-message-bubble table {
                    border-collapse: collapse;
                    width: 100%;
                    font-size: 12px;
                    margin: 8px 0;
                }

                .iris-message-bubble table th,
                .iris-message-bubble table td {
                    padding: 8px;
                    border: 1px solid #ddd;
                    text-align: left;
                }

                .iris-message-bubble table th {
                    background-color: #f8f9fa;
                    font-weight: 600;
                }

                /* Mobile responsiveness */
                @media (max-width: 480px) {
                    .iris-widget-container {
                        width: calc(100vw - 20px);
                        height: calc(100vh - 100px);
                        bottom: 10px;
                        right: 10px;
                        left: 10px;
                    }

                    .iris-header {
                        padding: 16px;
                    }

                    .iris-header h1 {
                        font-size: 20px;
                        margin-bottom: 12px;
                    }

                    .iris-input-container {
                        padding: 10px 14px;
                        gap: 10px;
                    }

                    .iris-input-btn {
                        width: 36px;
                        height: 36px;
                    }

                    .iris-waveform {
                        margin-right: 4px;
                    }

                    .iris-wave-bar {
                        width: 2px;
                    }
                }
            `;
            document.head.appendChild(style);
        }

        createWidget() {
            const container = document.createElement('div');
            container.className = `iris-chatbot-widget position-${this.config.position}`;
            container.innerHTML = this.getWidgetHTML();

            // Add to page
            if (this.config.position === 'inline') {
                const targetElement = document.getElementById(this.config.containerId);
                if (targetElement) {
                    targetElement.appendChild(container);
                } else {
                    document.body.appendChild(container);
                }
            } else {
                document.body.appendChild(container);
            }

            this.container = container;
            this.widget = container.querySelector('#iris-widget');
            this.isExpanded = this.config.position === 'inline';

            this.renderMessages();
        }

        getWidgetHTML() {
            return `
                <button class="iris-toggle-button" id="iris-toggle" ${this.config.position === 'inline' ? 'style="display: none;"' : ''}>
                    <svg class="iris-chat-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path>
                    </svg>
                </button>
                
                <div class="iris-widget-container ${this.config.position === 'inline' ? 'position-inline expanded' : ''}" id="iris-widget">
                    <div class="iris-header full-header" id="iris-header">
                        <div id="iris-header-content">
                            <h1>PARI</h1>
                            <div class="greeting">Hello 👋</div>
                            <div class="description">I am Pari, a Virtual Assistant</div>
                            <div class="description">How may I help you?</div>
                        </div>
                        ${this.config.position !== 'inline' ? `
                        <div class="iris-header-controls">
                            <button class="iris-header-btn" id="iris-expand" title="Toggle Fullscreen">
                                <svg class="iris-expand-icon" width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                        d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                                </svg>
                                <svg class="iris-minimize-icon" style="display: none;" width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                        d="M9 9h6m-6 0v6m6-6v6m-6-6h6" />
                                </svg>
                            </button>
                            <button class="iris-header-btn" id="iris-close">
                                <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                                </svg>
                            </button>
                        </div>
                        ` : ''}
                    </div>
                    
                    <div class="iris-messages" id="iris-messages"></div>
                    
                    <div class="iris-input-section">
                        <div class="iris-input-container" id="iris-input-container">
                            <div class="iris-recording-overlay"></div>
                            <div class="iris-waveform" id="iris-waveform">
                                <div class="iris-wave-bar"></div>
                                <div class="iris-wave-bar"></div>
                                <div class="iris-wave-bar"></div>
                                <div class="iris-wave-bar"></div>
                                <div class="iris-wave-bar"></div>
                                <div class="iris-wave-bar"></div>
                                <div class="iris-wave-bar"></div>
                                <div class="iris-wave-bar"></div>
                                <div class="iris-wave-bar"></div>
                                <div class="iris-wave-bar"></div>
                            </div>
                            <input type="text" class="iris-input" placeholder="Type your message here..." id="iris-input">
                            <button class="iris-input-btn iris-mic-btn" id="iris-mic" title="Voice Input">
                                <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"></path>
                                </svg>
                            </button>
                            <button class="iris-input-btn iris-send-btn" id="iris-send" title="Send Message">
                                <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path>
                                </svg>
                            </button>
                        </div>
                        <div class="iris-powered-by">
                            Powered by <span class="brand">HOLA.AI</span>
                        </div>
                    </div>
                </div>
            `;
        }

        bindEvents() {
            // Toggle button
            const toggleBtn = this.container.querySelector('#iris-toggle');
            if (toggleBtn && this.config.position !== 'inline') {
                toggleBtn.addEventListener('click', () => this.toggleWidget());
            }

            // Close button
            const closeBtn = this.container.querySelector('#iris-close');
            if (closeBtn) {
                closeBtn.addEventListener('click', () => this.closeWidget());
            }

            // Expand/Fullscreen button
            const expandBtn = this.container.querySelector('#iris-expand');
            if (expandBtn) {
                expandBtn.addEventListener('click', () => this.toggleExpand());
            }

            // Send button
            const sendBtn = this.container.querySelector('#iris-send');
            sendBtn.addEventListener('click', () => this.sendMessage());

            // Input field
            const input = this.container.querySelector('#iris-input');
            input.addEventListener('keypress', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    this.sendMessage();
                }
            });

            // Mic button
            const micBtn = this.container.querySelector('#iris-mic');
            micBtn.addEventListener('click', () => {
                if (this.recognition && !this.isListening) {
                    this.recognition.start();
                } else if (this.recognition && this.isListening) {
                    this.recognition.stop();
                }
                this.toggleVoice();
            });
        }

        updateHeader() {
            const header = this.container.querySelector('#iris-header');
            const headerContent = this.container.querySelector('#iris-header-content');
            const hasMessages = this.messages.length > 0;

            if (hasMessages) {
                // Compact header with home button
                header.className = 'iris-header compact-header';
                headerContent.innerHTML = `
                    <div class="iris-compact-info">
                        <button class="iris-header-btn iris-home-btn" id="iris-home" title="Go Home">
                            <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                                <polyline points="9,22 9,12 15,12 15,22"></polyline>
                            </svg>
                        </button>
                        <div>
                            <h1>PARI</h1>
                            <div style="font-size: 14px; opacity: 0.9;">Virtual Assistant</div>
                        </div>
                    </div>
                `;

                // Bind home button event
                const homeBtn = this.container.querySelector('#iris-home');
                if (homeBtn) {
                    homeBtn.addEventListener('click', () => this.goHome());
                }
            } else {
                // Full header
                header.className = 'iris-header full-header';
                headerContent.innerHTML = `
                    <h1>PARI</h1>
                    <div class="greeting">Hello 👋</div>
                    <div class="description">I am Pari, a Virtual Assistant</div>
                    <div class="description">How may I help you?</div>
                `;
            }
        }

        toggleWidget() {
            this.isExpanded = !this.isExpanded;

            if (this.isExpanded) {
                this.widget.classList.add('expanded');
            } else {
                this.widget.classList.remove('expanded');
                // Also exit fullscreen if toggling closed
                if (this.isFullExpanded) {
                    this.isFullExpanded = false;
                    this.widget.classList.remove('fullscreen-mode');
                    this.updateExpandIcon();
                }
            }
        }

        closeWidget() {
            this.isExpanded = false;
            this.widget.classList.remove('expanded');
            if (this.isFullExpanded) {
                this.isFullExpanded = false;
                this.widget.classList.remove('fullscreen-mode');
                this.updateExpandIcon();
            }
        }

        toggleExpand() {
            this.isFullExpanded = !this.isFullExpanded;

            if (this.isFullExpanded) {
                this.widget.classList.add('fullscreen-mode');
            } else {
                this.widget.classList.remove('fullscreen-mode');
            }

            this.updateExpandIcon();
        }

        updateExpandIcon() {
            const expandIcon = this.container.querySelector('.iris-expand-icon');
            const minimizeIcon = this.container.querySelector('.iris-minimize-icon');

            if (expandIcon && minimizeIcon) {
                if (this.isFullExpanded) {
                    expandIcon.style.display = 'none';
                    minimizeIcon.style.display = 'block';
                } else {
                    expandIcon.style.display = 'block';
                    minimizeIcon.style.display = 'none';
                }
            }
        }

        goHome() {
            this.messages = [];
            this.clearInput();
            this.renderMessages();
            this.updateHeader();
        }

        clearInput() {
            const input = this.container.querySelector('#iris-input');
            if (input) {
                input.value = '';
            }
        }

        selectFAQ(question) {
            const input = this.container.querySelector('#iris-input');
            if (input) {
                input.value = question;
                input.focus();
            }
        }

        addMessage(text, sender, isHTML = false) {
            this.messages.push({
                text,
                sender,
                timestamp: new Date(),
                isHTML
            });
            this.renderMessages();
            this.updateHeader();
        }

        addTableMessage(tableData) {
            if (!tableData || tableData.length === 0) return;

            const headers = Object.keys(tableData[0]);
            let table = '<table style="border-collapse: collapse; width: 100%; font-size: 12px; margin: 8px 0;">';
            table += '<thead><tr>' + headers.map(h =>
                `<th style="padding: 8px; border: 1px solid #ddd; text-align: left; background-color: #f8f9fa; font-weight: 600;">${this.escapeHTML(h)}</th>`
            ).join('') + '</tr></thead>';
            table += '<tbody>' + tableData.map(row =>
                '<tr>' + headers.map(h =>
                    `<td style="padding: 8px; border: 1px solid #ddd; text-align: left;">${this.escapeHTML(row[h] || '')}</td>`
                ).join('') + '</tr>'
            ).join('') + '</tbody></table>';

            this.addMessage(table, 'bot', true);
        }

        escapeHTML(text) {
            const div = document.createElement('div');
            div.textContent = String(text);
            return div.innerHTML;
        }

        renderMessages() {
            const messagesContainer = this.container.querySelector('#iris-messages');

            if (this.messages.length === 0) {
                // Show FAQ section
                messagesContainer.innerHTML = `
                    <div class="iris-faq-section">
                        <div class="iris-faq-header">
                            <span>💬</span>
                            <span>Frequently Asked Questions</span>
                            <span>?</span>
                        </div>
                        <div class="iris-faq-list">
                            ${FAQ_DATA.map(faq => `
                                <button class="iris-faq-item" data-question="${this.escapeHTML(faq.question)}">
                                    <div class="iris-faq-dot"></div>
                                    <span class="iris-faq-text">${this.escapeHTML(faq.question)}</span>
                                </button>
                            `).join('')}
                        </div>
                    </div>
                `;

                // Re-bind FAQ events
                const faqItems = messagesContainer.querySelectorAll('.iris-faq-item');
                faqItems.forEach(item => {
                    item.addEventListener('click', () => {
                        const question = item.getAttribute('data-question');
                        this.selectFAQ(question);
                    });
                });
            } else {
                // Show messages
                messagesContainer.innerHTML = `
                    <div class="iris-message-list">
                        ${this.messages.map(msg => `
                            <div class="iris-message ${msg.sender}">
                                <div class="iris-message-bubble">${
                                    msg.isHTML ? msg.text : this.escapeHTML(msg.text)
                                }</div>
                            </div>
                        `).join('')}
                        ${this.isLoading ? `
                            <div class="iris-message bot">
                                <div class="iris-loading-indicator">
                                    <div class="iris-loading-dot"></div>
                                    <div class="iris-loading-dot"></div>
                                    <div class="iris-loading-dot"></div>
                                </div>
                            </div>
                        ` : ''}
                    </div>
                `;
            }

            // Scroll to bottom
            setTimeout(() => {
                messagesContainer.scrollTop = messagesContainer.scrollHeight;
            }, 100);
        }

        setLoading(loading) {
            this.isLoading = loading;
            const input = this.container.querySelector('#iris-input');
            const sendBtn = this.container.querySelector('#iris-send');
            const micBtn = this.container.querySelector('#iris-mic');

            if (input) input.disabled = loading;
            if (sendBtn) sendBtn.disabled = loading;
            if (micBtn) micBtn.disabled = loading;

            this.renderMessages();
        }

        async sendMessage() {
            const input = this.container.querySelector('#iris-input');
            const message = input ? input.value.trim() : '';

            if (!message || this.isLoading) return;

            this.addMessage(message, 'user');
            this.clearInput();
            this.setLoading(true);

            try {
                const response = await fetch(API_ENDPOINT, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        question: message
                    }),
                });

                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }

                const data = await response.json();
                const output = data.result;

                if (!output || (Array.isArray(output) && output.length === 0)) {
                    this.addMessage('Sorry, no results were found for your query.', 'bot');
                } else {
                    if (typeof output === 'string' || typeof output === 'number') {
                        this.addMessage(String(output), 'bot');
                    } else if (Array.isArray(output)) {
                        this.addTableMessage(output);
                    } else {
                        this.addMessage(JSON.stringify(output, null, 2), 'bot');
                    }
                    this.saveQA(message, output);
                }
            } catch (error) {
                console.error('Error communicating with the bot API:', error);
                this.addMessage("Oops! Something went wrong. Please try again later.", 'bot');
            } finally {
                this.setLoading(false);
            }
        }

        saveQA(question, answer) {
            try {
                const history = JSON.parse(localStorage.getItem(COOKIE_KEY) || '[]');
                history.unshift({ question, answer });
                if (history.length > MAX_HISTORY) history.length = MAX_HISTORY;
                localStorage.setItem(COOKIE_KEY, JSON.stringify(history));
            } catch (error) {
                console.error('Error saving to localStorage:', error);
            }
        }

        toggleVoice() {
            this.isListening = !this.isListening;
            const micBtn = this.container.querySelector('#iris-mic');
            const inputContainer = this.container.querySelector('#iris-input-container');
            const input = this.container.querySelector('#iris-input');

            if (micBtn && inputContainer) {
                if (this.isListening) {
                    micBtn.classList.add('listening');
                    inputContainer.classList.add('recording');
                    if (input) {
                        input.placeholder = 'Listening... Speak now';
                        input.disabled = true;
                    }
                    console.log('Voice listening started...');

                    // Simulate voice recognition for demo purposes if Web Speech API is not available
                    if (!this.recognition) {
                        this.simulateVoiceRecognition();
                    }
                } else {
                    micBtn.classList.remove('listening');
                    inputContainer.classList.remove('recording');
                    if (input) {
                        input.placeholder = 'Type your message here...';
                        input.disabled = this.isLoading;
                    }
                    console.log('Voice listening stopped...');
                }
            }
        }

        simulateVoiceRecognition() {
            // This is a demo simulation - replace with actual Web Speech API integration
            if (this.isListening) {
                setTimeout(() => {
                    if (this.isListening) {
                        // Auto-stop after 5 seconds for demo
                        this.toggleVoice();

                        // Simulate recognized text
                        const input = this.container.querySelector('#iris-input');
                        if (input) {
                            input.value = 'Hello, this is a voice input demo!';
                            input.focus();
                        }
                    }
                }, 5000);
            }
        }

        // Method to integrate with Web Speech API (for real implementation)
        initializeWebSpeechAPI() {
            if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
                const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
                this.recognition = new SpeechRecognition();
                this.recognition.continuous = false;
                this.recognition.interimResults = false;
                this.recognition.lang = 'en-US';

                this.recognition.onstart = () => {
                    console.log('Speech recognition started');
                };

                this.recognition.onresult = (event) => {
                    const transcript = event.results[0][0].transcript;
                    const input = this.container.querySelector('#iris-input');
                    if (input) {
                        input.value = transcript;
                    }
                    this.toggleVoice(); // Stop recording
                };

                this.recognition.onerror = (event) => {
                    console.error('Speech recognition error:', event.error);
                    this.toggleVoice(); // Stop recording on error
                };

                this.recognition.onend = () => {
                    if (this.isListening) {
                        this.toggleVoice(); // Stop recording
                    }
                };
            } else {
                console.log('Speech Recognition API not supported. Using demo mode.');
            }
        }

        // Public API methods
        open() {
            if (!this.isExpanded) {
                this.toggleWidget();
            }
        }

        close() {
            if (this.isExpanded) {
                this.toggleWidget();
            }
        }

        sendCustomMessage(message) {
            const input = this.container.querySelector('#iris-input');
            if (input) {
                input.value = message;
                this.sendMessage();
            }
        }

        destroy() {
            if (this.container && this.container.parentNode) {
                this.container.parentNode.removeChild(this.container);
            }
        }
    }

    // Global API
    window.IRISChatbot = IRISChatbot;

    // Auto-initialize if data attributes are present
    document.addEventListener('DOMContentLoaded', function() {
        const autoInit = document.querySelector('[data-iris-chatbot]');
        if (autoInit) {
            const options = {
                position: autoInit.getAttribute('data-position') || 'bottom-right',
                containerId: autoInit.getAttribute('data-container') || 'iris-chatbot-container'
            };
            window.irisWidget = new IRISChatbot(options);
        }
    });

    // Convenience function for quick initialization
    window.initIRISChatbot = function(options = {}) {
        return new IRISChatbot(options);
    };

})();