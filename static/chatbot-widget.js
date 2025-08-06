/**
 * IRIS Chatbot Widget - Pure JavaScript Implementation
 * No dependencies required - can be embedded anywhere
 */

(function() {
    'use strict';
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
        { id: '1', question: 'Can I redeem my FB before the original term?' },
        { id: '2', question: 'How do I pay my Credit card bill?' },
        { id: '3', question: 'How can I get my Account Statement?' },
        { id: '4', question: 'What is the tenure of Fixed Deposit?' }
    ];

    class IRISChatbot {
        constructor(options = {}) {
            this.config = { ...WIDGET_CONFIG, ...options };
            this.messages = [];
            this.isExpanded = false;
            this.isListening = false;
            this.container = null;
            this.widget = null;
            
            this.init();
        }

        init() {
            this.injectStyles();
            this.createWidget();
            this.bindEvents();
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
                    transform: scale(0.8) translateY(20px);
                    opacity: 0;
                    pointer-events: none;
                    transition: all 0.3s ease;
                }

                .iris-widget-container.expanded {
                    transform: scale(1) translateY(0);
                    opacity: 1;
                    pointer-events: all;
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
                    padding: 24px;
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-start;
                }

                .iris-header h1 {
                    font-size: 24px;
                    font-weight: bold;
                    margin: 0 0 16px 0;
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
                    font-size: 14px;
                    opacity: 0.9;
                    margin: 4px 0;
                }

                .iris-close-btn {
                    background: none;
                    border: none;
                    color: white;
                    cursor: pointer;
                    padding: 4px;
                    border-radius: 4px;
                    transition: background-color 0.2s;
                }

                .iris-close-btn:hover {
                    background-color: rgba(255, 255, 255, 0.1);
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

                .iris-input-section {
                    padding: 16px;
                    border-top: 1px solid #e5e7eb;
                    background: white;
                }

                .iris-input-container {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    background: #f9fafb;
                    border-radius: 24px;
                    padding: 8px;
                }

                .iris-input {
                    flex: 1;
                    border: none;
                    background: transparent;
                    outline: none;
                    padding: 8px 12px;
                    font-size: 14px;
                    color: #374151;
                }

                .iris-input::placeholder {
                    color: #9ca3af;
                }

                .iris-input-btn {
                    width: 32px;
                    height: 32px;
                    border: none;
                    border-radius: 50%;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: all 0.2s;
                }

                .iris-mic-btn {
                    background: transparent;
                    color: #6b7280;
                }

                .iris-mic-btn:hover {
                    background: #e5e7eb;
                }

                .iris-mic-btn.listening {
                    color: #dc2626;
                }

                .iris-send-btn {
                    background: ${WIDGET_CONFIG.theme.primaryColor};
                    color: white;
                }

                .iris-send-btn:hover {
                    background: #ea580c;
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
                }
            `;
            document.head.appendChild(style);
        }

        createWidget() {
            const container = document.createElement('div');
            container.className = `iris-chatbot-widget position-${this.config.position}`;
            container.innerHTML = `
                <button class="iris-toggle-button" id="iris-toggle">
                    <svg class="iris-chat-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path>
                    </svg>
                    <svg class="iris-close-icon" style="display: none;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                    </svg>
                </button>
                
                <div class="iris-widget-container ${this.config.position === 'inline' ? 'position-inline expanded' : ''}" id="iris-widget">
                    <div class="iris-header">
                        <div>
                            <h1>PARI</h1>
                            <div class="greeting">Hello &#x1F44B;</div>
                            <div class="description">I am Pari, a Virtual Assistant</div>
                            <div class="description">How may I help you?</div>
                        </div>
                        ${this.config.position !== 'inline' ? `
                        <button class="iris-close-btn" id="iris-close">
                            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                            </svg>
                        </button>
                        ` : ''}
                    </div>
                    
                    <div class="iris-messages" id="iris-messages">
                        <div class="iris-faq-section">
                            <div class="iris-faq-header">
                                <span>&#x1F4AC;</span>
                                <span>Frequently Asked Questions</span>
                                <span>?</span>
                            </div>
                            <div class="iris-faq-list" id="iris-faq-list">
                                ${FAQ_DATA.map(faq => `
                                    <button class="iris-faq-item" data-question="${faq.question}">
                                        <div class="iris-faq-dot"></div>
                                        <span class="iris-faq-text">${faq.question}</span>
                                    </button>
                                `).join('')}
                            </div>
                        </div>
                    </div>
                    
                    <div class="iris-input-section">
                        <div class="iris-input-container">
                            <input type="text" class="iris-input" placeholder="Type your message here..." id="iris-input">
                            <button class="iris-input-btn iris-mic-btn" id="iris-mic">
                                <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"></path>
                                </svg>
                            </button>
                            <button class="iris-input-btn iris-send-btn" id="iris-send">
                                <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

            // Send button
            const sendBtn = this.container.querySelector('#iris-send');
            sendBtn.addEventListener('click', () => this.sendMessage());

            // Input field
            const input = this.container.querySelector('#iris-input');
            input.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.sendMessage();
                }
            });

            // Mic button
            const micBtn = this.container.querySelector('#iris-mic');
            micBtn.addEventListener('click', () => this.toggleVoice());

            // FAQ items
            const faqItems = this.container.querySelectorAll('.iris-faq-item');
            faqItems.forEach(item => {
                item.addEventListener('click', () => {
                    const question = item.getAttribute('data-question');
                    this.selectFAQ(question);
                });
            });
        }

        toggleWidget() {
            this.isExpanded = !this.isExpanded;
            const chatIcon = this.container.querySelector('.iris-chat-icon');
            const closeIcon = this.container.querySelector('.iris-close-icon');
            
            if (this.isExpanded) {
                this.widget.classList.add('expanded');
                chatIcon.style.display = 'none';
                closeIcon.style.display = 'block';
            } else {
                this.widget.classList.remove('expanded');
                chatIcon.style.display = 'block';
                closeIcon.style.display = 'none';
            }
        }

        closeWidget() {
            this.isExpanded = false;
            this.widget.classList.remove('expanded');
            const chatIcon = this.container.querySelector('.iris-chat-icon');
            const closeIcon = this.container.querySelector('.iris-close-icon');
            chatIcon.style.display = 'block';
            closeIcon.style.display = 'none';
        }

        selectFAQ(question) {
            const input = this.container.querySelector('#iris-input');
            input.value = question;
            input.focus();
        }

        sendMessage() {
            const input = this.container.querySelector('#iris-input');
            const message = input.value.trim();

            if (!message) return;

            this.addMessage(message, 'user');
            input.value = '';


            fetch(API_ENDPOINT, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    question: message
                }),
            })
            .then(response => response.json())
            .then(data => {
                const output = data.result;

                if (!output || (Array.isArray(output) && output.length === 0)) {
                    this.addMessage('Sorry, no results were found for your query.', 'bot');
                } else {
                    if (typeof output === 'string' || typeof output === 'number') {
                        this.addMessage(output, 'bot');
                    } else if (Array.isArray(output)) {
                        this.addTableMessage(output);
                    }
                    this.saveQA?.(message, output); // Call saveQA if it exists
                }
            })
             .catch(error => {
            console.error('Error communicating with the bot API:', error);
                this.addMessage("Oops! Something went wrong. Please try again later.", 'bot');
            });
        }
        addTableMessage(tableData) {
            const headers = Object.keys(tableData[0]);
            let table = '<table border="1" cellpadding="5" cellspacing="0" style="border-collapse: collapse; width: 100%;">';
            table += '<thead><tr>' + headers.map(h => `<th style="padding: 8px; border: 1px solid #ddd; text-align: left; background-color: #f2f2f2;">${h}</th>`).join('') + '</tr></thead>';
            table += '<tbody>' + tableData.map(row =>
                '<tr>' + headers.map(h => `<td style="padding: 8px; border: 1px solid #ddd; text-align: left;">${row[h]}</td>`).join('') + '</tr>'
            ).join('') + '</tbody></table>';

            this.messages.push({ text: table, sender: 'bot', isHTML: true, timestamp: new Date() });
            this.renderMessages();
        }

        addMessage(text, sender) {
            this.messages.push({ text, sender, timestamp: new Date() });
            this.renderMessages();
        }
        saveQA(question, answer) {
            const history = JSON.parse(localStorage.getItem(COOKIE_KEY) || '[]');
            history.unshift({ question, answer });
            if (history.length > MAX_HISTORY) history.length = MAX_HISTORY;
            localStorage.setItem(COOKIE_KEY, JSON.stringify(history));
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
                                <button class="iris-faq-item" data-question="${faq.question}">
                                    <div class="iris-faq-dot"></div>
                                    <span class="iris-faq-text">${faq.question}</span>
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
                                <div class="iris-message-bubble">${msg.isHTML ? msg.text : this.escapeHTML(msg.text)}</div>
                            </div>
                        `).join('')}
                    </div>
                `;
            }

            // Scroll to bottom
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }
        escapeHTML(text) {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        }

        toggleVoice() {
            this.isListening = !this.isListening;
            const micBtn = this.container.querySelector('#iris-mic');
            
            if (this.isListening) {
                micBtn.classList.add('listening');
                // Voice recognition would be implemented here
                console.log('Voice listening started...');
            } else {
                micBtn.classList.remove('listening');
                console.log('Voice listening stopped...');
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
            input.value = message;
            this.sendMessage();
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