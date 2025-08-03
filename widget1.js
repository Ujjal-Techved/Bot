(function () {
  const faLink = document.createElement("link");
  faLink.rel = "stylesheet";
  faLink.href = "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css";
  document.head.appendChild(faLink);

  // Create floating button
  const widgetBtn = document.createElement('button');
  widgetBtn.innerHTML = '<i class="fas fa-microphone"></i>';
  widgetBtn.style.position = 'fixed';
  widgetBtn.style.bottom = '20px';
  widgetBtn.style.right = '20px';
  widgetBtn.style.zIndex = '9999';
  widgetBtn.style.padding = '15px';
  widgetBtn.style.borderRadius = '50%';
  widgetBtn.style.border = 'none';
  widgetBtn.style.backgroundColor = '#42b883';
  widgetBtn.style.color = 'white';
  widgetBtn.style.fontSize = '20px';
  widgetBtn.style.cursor = 'pointer';
  document.body.appendChild(widgetBtn);

  // Create popup container
  const popup = document.createElement('div');
  popup.style.position = 'fixed';
  popup.style.bottom = '80px';
  popup.style.right = '20px';
  popup.style.width = '350px';
  popup.style.maxHeight = '500px';
  popup.style.overflow = 'auto';
  popup.style.zIndex = '9998';
  popup.style.background = 'white';
  popup.style.border = '1px solid #ccc';
  popup.style.borderRadius = '8px';
  popup.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
  popup.style.display = 'none';
  popup.style.padding = '20px';

  popup.innerHTML = `
    <div id="bot-app" style="display: flex; flex-direction: column; height: 80vh;">
  <div id="loading" style="display: none; font-style: italic;">Loading...</div>

  <!-- Scrollable Result Area -->
  <div id="result" style="
    flex: 1;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 10px;
    scroll-behavior: smooth;
    border-top: 1px solid #eee;
    padding: 10px;
  "></div>

  <!-- Fixed Form Area -->
  <form id="query-form" style="padding: 10px; border-top: 1px solid #ccc; background-color: #f9f9f9;">
    <div style="display: flex; gap: 8px;">
      <input type="text" id="question" placeholder="e.g., How many CRs were delivered?" required
        style="flex:1; box-sizing: border-box; padding: 10px; border-radius: 5px; border: 1px solid #ccc;" />
      <button type="button" id="voice-btn" title="Speak your question"
        style="box-sizing: border-box; padding: 10px; border-radius: 5px; border: 1px solid #ccc;">
        <i class="fas fa-microphone"></i>
      </button>
    </div>
    <button type="submit"
      style="margin-top:10px; width: 100%; box-sizing: border-box; padding: 10px; border-radius: 5px; border: none; background-color: #42b883; color: white; cursor: pointer;">
      Ask
    </button>
  </form>
</div>

  `;

  document.body.appendChild(popup);

  // Toggle popup visibility
  widgetBtn.addEventListener('click', () => {
    popup.style.display = popup.style.display === 'none' ? 'block' : 'none';
  });

  // Behavior script
  setTimeout(() => {
    const form = popup.querySelector('#query-form');
    const input = popup.querySelector('#question');
    const result = popup.querySelector('#result');
    const loading = popup.querySelector('#loading');
    const voiceBtn = popup.querySelector('#voice-btn');

    // Utility functions
    function getQAHistory() {
      const cookie = document.cookie.split('; ').find(row => row.startsWith('qaHistory='));
      if (!cookie) return [];
      try {
        return JSON.parse(decodeURIComponent(cookie.split('=')[1]));
      } catch {
        return [];
      }
    }

    function saveQA(question, answer) {
      let history = getQAHistory();
      history.push({ question, answer });
      if (history.length > 10) history = history.slice(-10);
      document.cookie = `qaHistory=${encodeURIComponent(JSON.stringify(history))}; path=/; max-age=604800`;
    }

    function appendChatBubble(role, content) {
      const bubble = document.createElement('div');
      bubble.style.padding = '10px';
      bubble.style.borderRadius = '10px';
      bubble.style.maxWidth = '80%';
      bubble.style.whiteSpace = 'pre-wrap';
      bubble.style.fontFamily = 'Arial, sans-serif';
      bubble.style.fontSize = '14px';
      bubble.style.lineHeight = '1.4';
      bubble.style.background = role === 'user' ? '#d1ecf1' : '#e2f0d9';
      bubble.style.alignSelf = role === 'user' ? 'flex-end' : 'flex-start';
      bubble.style.marginBottom = '5px';

      if (typeof content === 'string' || typeof content === 'number') {
        bubble.textContent = content;
      } else if (Array.isArray(content)) {
        const headers = Object.keys(content[0]);
        let table = '<table border="1" cellpadding="5" cellspacing="0" style="border-collapse: collapse; width: 100%;">';
        table += '<thead><tr>' + headers.map(h => `<th style="padding: 8px; border: 1px solid #ddd; text-align: left; background-color: #f2f2f2;">${h}</th>`).join('') + '</tr></thead>';
        table += '<tbody>' + content.map(row =>
          '<tr>' + headers.map(h => `<td style="padding: 8px; border: 1px solid #ddd; text-align: left;">${row[h]}</td>`).join('') + '</tr>'
        ).join('') + '</tbody></table>';
        bubble.innerHTML = table;
      }

      result.appendChild(bubble);

      // 🔽 Ensure scroll happens after rendering
      setTimeout(() => {
        result.scrollTop = result.scrollHeight;
      }, 0);
    }

    function renderHistory() {
      const history = getQAHistory();
      history.forEach(({ question, answer }) => {
        appendChatBubble('user', question);
        appendChatBubble('bot', answer);
      });
        setTimeout(() => {
        result.scrollTop = result.scrollHeight;
      }, 0);
    }

    renderHistory();

    // Form submit
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const question = input.value.trim();
      if (!question) return;

      appendChatBubble('user', question);
      loading.style.display = 'block';
      input.value = '';

      try {
        const res = await fetch('http://localhost:8001/query', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ question: question })
        });

        const data = await res.json();
        const output = data.result;
        appendChatBubble('bot', output);
        saveQA(question, output);
      } catch (err) {
        appendChatBubble('bot', 'Error: ' + err.message);
      } finally {
        loading.style.display = 'none';
      }
    });

    // Voice recognition
    let recognition;
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognition = new SpeechRecognition();
      recognition.lang = 'en-US';
      recognition.continuous = false;
      recognition.interimResults = false;

      recognition.onresult = function (event) {
        const speechResult = event.results[0][0].transcript;
        input.value = speechResult;
        form.dispatchEvent(new Event('submit'));
      };

      recognition.onerror = function (event) {
        console.error('Speech recognition error: ', event.error);
        alert('Speech recognition error: ' + event.error);
      };

      voiceBtn.addEventListener('click', () => {
        recognition.start();
      });
    } else {
      voiceBtn.disabled = true;
      voiceBtn.title = 'Speech recognition not supported';
    }
  }, 100);
})();