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
    <div id="bot-app">
      <form id="query-form">
        <label for="question">Ask a question:</label>
        <div style="display: flex; gap: 8px;">
          <input type="text" id="question" placeholder="e.g., How many CRs were delivered?" required style="flex:1;" />
          <button type="button" id="voice-btn" title="Speak your question"><i class="fas fa-microphone"></i></button>
        </div>
        <button type="submit" style="margin-top:10px;">Ask</button>
      </form>
      <div id="loading" style="display: none; font-style: italic;">Loading...</div>
      <div id="result" style="margin-top: 20px;"></div>
    </div>
  `;

  document.body.appendChild(popup);

  // Show/hide popup on button click
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
  // Load past Q&A from cookie
  function getQAHistory() {
    const cookie = document.cookie
      .split('; ')
      .find(row => row.startsWith('qaHistory='));
    if (!cookie) return [];
    try {
      return JSON.parse(decodeURIComponent(cookie.split('=')[1]));
    } catch {
      return [];
    }
  }

  // Save Q&A to cookie
  function saveQA(question, answer) {
    const history = getQAHistory();
    history.push({ question, answer });
    if (history.length > 10) history.shift(); // Keep only last 10
    document.cookie = `qaHistory=${encodeURIComponent(JSON.stringify(history))}; path=/; max-age=604800`; // 7 days
  }
  function appendChatBubble(role, text) {
    const bubble = document.createElement('div');
    bubble.style.padding = '10px';
    bubble.style.borderRadius = '10px';
    bubble.style.maxWidth = '80%';
    bubble.style.whiteSpace = 'pre-wrap';
    bubble.style.fontFamily = 'Arial, sans-serif';
    bubble.style.fontSize = '14px';
    bubble.style.lineHeight = '1.4';
    bubble.style.background = role === 'user' ? '#e0f7fa' : '#f1f8e9';
    bubble.style.alignSelf = role === 'user' ? 'flex-end' : 'flex-start';
    bubble.textContent = text;
    result.appendChild(bubble);
    result.scrollTop = result.scrollHeight;
  }
  // Render Q&A history
  function renderHistory() {
  const history = getQAHistory();
  history.forEach(item => {
    appendChatBubble('user', item.question);
    if (typeof item.answer === 'string' || typeof item.answer === 'number') {
      appendChatBubble('bot', item.answer.toString());
    } else if (Array.isArray(item.answer) && item.answer.length > 0) {
      const headers = Object.keys(item.answer[0]);
      let table = '<table border="1" cellpadding="5" cellspacing="0" style="border-collapse: collapse;">';
      table += '<thead><tr>' + headers.map(h => `<th>${h}</th>`).join('') + '</tr></thead>';
      table += '<tbody>' + item.answer.map(row =>
        '<tr>' + headers.map(h => `<td>${row[h]}</td>`).join('') + '</tr>'
      ).join('') + '</tbody></table>';
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = table;
      tempDiv.style.background = '#f1f8e9';
      tempDiv.style.padding = '10px';
      tempDiv.style.borderRadius = '10px';
      tempDiv.style.alignSelf = 'flex-start';
      result.appendChild(tempDiv);
    }
  });
}


  renderHistory();

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const question = input.value.trim();
      if (!question) return;

      loading.style.display = 'block';
      result.innerHTML = '';

      try {
        const res = await fetch('http://localhost:8001/query', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({question: question})
        });

        const data = await res.json();
        const output = data.result;
        if (typeof output === 'number') {
          result.innerHTML = "<div style=\"margin-bottom: 8px; font-weight: bold; font-family: Arial, sans-serif; color: #222;\">\n" +
              "    The result is:\n" +
              "  </div>\n" +
              "  <pre style=\"\n" +
              "    background: #f4f4f4;\n" +
              "    padding: 15px;\n" +
              "    border: 1px solid #ccc;\n" +
              "    border-radius: 5px;\n" +
              "    overflow-x: auto;\n" +
              "    white-space: pre-wrap;\n" +
              "    font-family: Consolas, Monaco, monospace;\n" +
              "    color: #333;\n" +
              "  \">" + output + "</pre>";
              saveQA(question, output);
        } else if (Array.isArray(output) && output.length > 0) {
              const headers = Object.keys(output[0]);
              let table = '<table border="1" cellpadding="5" cellspacing="0" style="border-collapse: collapse;">';

              // Header row
              table += '<thead><tr>';
              headers.forEach(header => {
                table += `<th>${header}</th>`;
              });
              table += '</tr></thead>';

              // Data rows
              table += '<tbody>';
              output.forEach(row => {
                table += '<tr>';
                headers.forEach(header => {
                  table += `<td>${row[header]}</td>`;
                });
                table += '</tr>';
              });
              table += '</tbody></table>';

              result.innerHTML = table;
              saveQA(question, table);
            } else if (typeof output === 'string') {
            result.textContent = output;
            saveQA(question, output);
        } else {
          result.textContent = 'Unexpected response format.';
        }

      } catch (err) {
        result.textContent = 'Error: ' + err.message;
      } finally {
        loading.style.display = 'none';
      }
    });

    // 🎤 Voice Search
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
