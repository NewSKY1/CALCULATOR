let expr = '';
let caretPos = 0;
let justCalc = false;
let lastAnswer = '0';
let historyAnswers = []; // { value: string, ts: number }
let historyCollapsed = true;

function toggleHistory() {
  historyCollapsed = !historyCollapsed;
  renderHistory();
}

function renderHistory() {
  const h = document.getElementById('history');
  if (!h) return;
  h.innerHTML = '';

  const header = document.createElement('div');
  header.className = 'history-header';

  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.className = 'history-toggle';
  toggle.textContent = historyCollapsed ? '▼' : '▲';
  toggle.addEventListener('click', toggleHistory);

  const label = document.createElement('span');
  label.className = 'history-label';
  label.textContent = `History (${historyAnswers.length})`;

  header.appendChild(toggle);
  header.appendChild(label);
  h.appendChild(header);

  if (historyCollapsed) return;

  if (historyAnswers.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'history-empty';
    empty.textContent = 'No history';
    h.appendChild(empty);
    return;
  }

  const list = document.createElement('div');
  list.className = 'history-list';
  historyAnswers.forEach((entry) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'history-item';

    const valSpan = document.createElement('span');
    valSpan.className = 'history-value';
    valSpan.textContent = entry.value;

    btn.appendChild(valSpan);
    btn.addEventListener('click', () => insertFromHistory(entry.value));
    list.appendChild(btn);
  });
  h.appendChild(list);
}

function insertFromHistory(val) {
  if (justCalc) {
    expr = '';
    caretPos = 0;
    justCalc = false;
  }
  expr = expr.slice(0, caretPos) + val + expr.slice(caretPos);
  caretPos += val.length;
  updateDisplay();
}

function getResolvedExpr(source) {
  return source.replace(/ANS/g, `(${lastAnswer})`);
}

function evaluateExpr(source) {
  const resolvedExpr = getResolvedExpr(source);
  const cleanExpr = resolvedExpr.replace(/[^-+*/.0-9()]/g, '');
  return Function('"use strict"; return (' + cleanExpr + ')')();
}

function tokenizeExpr(source) {
  return source.match(/ANS|./g) || [];
}

function updateDisplay() {
  const resultEl = document.getElementById('result');
  const exprEl = document.getElementById('expr');
  
  resultEl.innerHTML = '';
  
  // 1. STYLE THE MAIN DISPLAY
  if (justCalc) {
    resultEl.classList.add('is-final');
  } else {
    resultEl.classList.remove('is-final');
  }

  // 2. RENDER THE INPUT (WITH CURSOR)
  if (expr === '' && !justCalc) {
    const zero = document.createElement('span');
    zero.className = 'char';
    zero.style.opacity = '0.3';
    zero.textContent = '0';
    resultEl.appendChild(zero);
    resultEl.appendChild(makeCaret());
  } else {
    let cursorIndex = 0;
    tokenizeExpr(expr).forEach((token) => {
      if (caretPos === cursorIndex && !justCalc) resultEl.appendChild(makeCaret());
      const span = document.createElement('span');
      span.className = 'char';
      span.textContent = token === 'ANS' ? 'ANS' : token.replace('*','×').replace('/','÷');
      resultEl.appendChild(span);
      cursorIndex += token.length;
    });
    if (caretPos >= expr.length && !justCalc) resultEl.appendChild(makeCaret());
  }

  // 3. RENDER THE LIVE RESULT (SMALLER LINE)
  if (justCalc) {
    // If finished, exprEl shows the history (the original math)
    // We already set this in the calculate() function
  } else if (expr !== '') {
    try {
      // Calculate only if it's a valid math expression (contains numbers and ops)
      if ((/[0-9]/.test(expr) || /ANS/.test(expr)) && /[+\-*/]/.test(expr)) {
        const live = evaluateExpr(expr);
        exprEl.textContent = '= ' + parseFloat(live.toFixed(8));
      } else {
        exprEl.innerHTML = '&nbsp;';
      }
    } catch {
      exprEl.innerHTML = '&nbsp;';
    }
  } else {
    exprEl.innerHTML = '&nbsp;';
  }
}

function input(val) {
  const ops = ['+', '*', '/']; // Operators that require a leading zero
  const allOps = ['+', '-', '*', '/'];

  if (justCalc) {
    expr = '';
    caretPos = 0;
    justCalc = false;
  }

  // AUTO-ZERO LOGIC: If starting with an operator or operator follows an operator
  if (expr === '' && ops.includes(val)) {
    expr = '0' + val;
    caretPos = 2;
  } 
  // If typing an operator after another operator, replace it
  else if (allOps.includes(val) && allOps.includes(expr[caretPos - 1])) {
    expr = expr.slice(0, caretPos - 1) + val + expr.slice(caretPos);
  }
  else {
    expr = expr.slice(0, caretPos) + val + expr.slice(caretPos);
    caretPos += val.length;
  }
  
  updateDisplay();
}

function calculate() {
  if (!expr) return;
  try {
    const history = expr;
    const res = evaluateExpr(expr);
    
    // Move math to top
    document.getElementById('expr').textContent = history.replace(/\*/g,'×').replace(/\//g,'÷');
    
    // Set main result
    const formatted = String(parseFloat(res.toFixed(10)));
    lastAnswer = formatted;
    // dedupe and push with timestamp
    const existing = historyAnswers.findIndex(e => e.value === formatted);
    if (existing !== -1) historyAnswers.splice(existing, 1);
    historyAnswers.unshift({ value: formatted, ts: Date.now() });
    if (historyAnswers.length > 10) historyAnswers.pop();
    renderHistory();
    expr = formatted;
    caretPos = expr.length;
    justCalc = true;
    
    updateDisplay();
  } catch {
    document.getElementById('result').textContent = 'Error';
  }
}

function makeCaret() {
  const c = document.createElement('span');
  c.className = 'caret';
  return c;
}

function clearAll() {
  expr = '';
  caretPos = 0;
  justCalc = false;
  document.getElementById('expr').innerHTML = '&nbsp;';
  updateDisplay();
}

function deleteLast() {
  if (caretPos > 0) {
    if (expr.slice(caretPos - 3, caretPos) === 'ANS') {
      expr = expr.slice(0, caretPos - 3) + expr.slice(caretPos);
      caretPos -= 3;
    } else {
      expr = expr.slice(0, caretPos - 1) + expr.slice(caretPos);
      caretPos--;
    }
    justCalc = false;
    updateDisplay();
  }
}

// Render history on initial load
renderHistory();