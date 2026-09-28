// --- 1年生用 図形問題テンプレート ---
const shapeTemplatesG1 = [
  // 1. 直線でかこまれた形（辺や角の数を数える）
  {
    category: 'count_elements',
    generate: () => {
      const isTriangle = Math.random() < 0.5;
      const shapeName = isTriangle ? 'さんかくけい' : 'しかくけい';
      const count = isTriangle ? 3 : 4;
      const target = Math.random() < 0.5 ? 'かど（ちょうてん）' : 'へん（まわりの まっすぐな せん）';
      
      const points = isTriangle ? "100,20 40,120 160,120" : "40,30 160,30 160,120 40,120";

      return {
        text: `下の かたちは 「${shapeName}」です。 ${target}は ぜんぶで いくつ ありますか。`,
        svg: `
          <svg class="shape-svg" width="200" height="140" viewBox="0 0 200 140">
            <polygon points="${points}" fill="#EBF8FF" stroke="#3182CE" stroke-width="4"/>
          </svg>
        `,
        answer: count.toString(),
        unit: 'こ',
        inputType: 'number'
      };
    }
  },

  // 2. 数え棒で作った形（必要な棒の本数）
  {
    category: 'match_stick',
    generate: () => {
      const isTriangle = Math.random() < 0.5;
      const shapeName = isTriangle ? 'さんかくけい' : 'しかくけい';
      const count = isTriangle ? 3 : 4;

      const svgContent = isTriangle ? `
        <line x1="100" y1="20" x2="40" y2="120" stroke="#DD6B20" stroke-width="6" stroke-linecap="round"/>
        <line x1="40" y1="120" x2="160" y2="120" stroke="#DD6B20" stroke-width="6" stroke-linecap="round"/>
        <line x1="160" y1="120" x2="100" y2="20" stroke="#DD6B20" stroke-width="6" stroke-linecap="round"/>
      ` : `
        <line x1="40" y1="30" x2="160" y2="30" stroke="#DD6B20" stroke-width="6" stroke-linecap="round"/>
        <line x1="160" y1="30" x2="160" y2="120" stroke="#DD6B20" stroke-width="6" stroke-linecap="round"/>
        <line x1="160" y1="120" x2="40" y2="120" stroke="#DD6B20" stroke-width="6" stroke-linecap="round"/>
        <line x1="40" y1="120" x2="40" y2="30" stroke="#DD6B20" stroke-width="6" stroke-linecap="round"/>
      `;

      return {
        text: `ひご（ぼう）をつかって 「${shapeName}」を １つ つくります。 ぼうは ぜんぶで なんほん いりますか。`,
        svg: `
          <svg class="shape-svg" width="200" height="140" viewBox="0 0 200 140">
            ${svgContent}
          </svg>
        `,
        answer: count.toString(),
        unit: 'ほん',
        inputType: 'number'
      };
    }
  },

  // 3. 立体の特徴（箱の形・缶の形・ボールの形）
  {
    category: 'solid_shape',
    generate: () => {
      const types = [
        {
          name: 'はこの かたち',
          svg: `
            <path d="M50,50 L110,50 L110,110 L50,110 Z" fill="#EBF8FF" stroke="#3182CE" stroke-width="3"/>
            <path d="M50,50 L85,20 L145,20 L110,50 Z" fill="#BEE3F8" stroke="#3182CE" stroke-width="3"/>
            <path d="M110,50 L145,20 L145,80 L110,110 Z" fill="#90CDF4" stroke="#3182CE" stroke-width="3"/>
          `,
          question: 'たいらな めんだけで できていて、ころがりにくい かたちは どれかな。',
          answer: 'はこの かたち'
        },
        {
          name: 'かんの かたち',
          svg: `
            <ellipse cx="100" cy="30" rx="45" ry="18" fill="#FEFCBF" stroke="#D69E2E" stroke-width="3"/>
            <path d="M55,30 L55,100 A45,18 0 0,0 145,100 L145,30 Z" fill="#FEFCBF" stroke="#D69E2E" stroke-width="3"/>
            <path d="M55,100 A45,18 0 0,1 145,100" fill="none" stroke="#D69E2E" stroke-width="3" stroke-dasharray="4,4"/>
          `,
          question: 'すべらせることも、よこにして ころがすことも できる かたちは どれかな。',
          answer: 'かんの かたち'
        },
        {
          name: 'ボールの かたち',
          svg: `
            <circle cx="100" cy="65" r="48" fill="#FED7D7" stroke="#E53E3E" stroke-width="3"/>
            <path d="M56,60 Q100,90 144,60" fill="none" stroke="#E53E3E" stroke-width="2" stroke-dasharray="4,4"/>
          `,
          question: 'どの むきにも すいすい ころがる かたちは どれかな。',
          answer: 'ボールの かたち'
        }
      ];

      const item = types[Math.floor(Math.random() * types.length)];

      return {
        text: item.question,
        svg: `
          <svg class="shape-svg" width="200" height="130" viewBox="0 0 200 130">
            ${item.svg}
          </svg>
        `,
        answer: item.answer,
        options: ['はこの かたち', 'かんの かたち', 'ボールの かたち'],
        inputType: 'choice'
      };
    }
  }
];

// --- 画面制御スクリプト ---
let currentQuestion = null;
let selectedChoice = null;
let isCorrectState = false; // 正解済みかどうか

function getRandomItem(array) {
  return array[Math.floor(Math.random() * array.length)];
}

function loadQuestion() {
  isCorrectState = false;
  selectedChoice = null;

  const template = getRandomItem(shapeTemplatesG1);
  currentQuestion = template.generate();

  document.getElementById('question-text').innerText = currentQuestion.text;
  document.getElementById('svg-container').innerHTML = currentQuestion.svg;
  
  const feedbackEl = document.getElementById('feedback');
  feedbackEl.className = 'feedback';
  feedbackEl.style.display = 'none';

  const actionBtn = document.getElementById('action-btn');
  actionBtn.innerText = 'こたえあわせ';

  const answerArea = document.getElementById('answer-area');
  answerArea.innerHTML = '';

  if (currentQuestion.inputType === 'number') {
    answerArea.innerHTML = `
      <div class="number-input-group">
        <input type="number" id="user-input" class="number-input" min="0" max="99" inputmode="numeric">
        <span>${currentQuestion.unit || ''}</span>
      </div>
    `;
  } else if (currentQuestion.inputType === 'choice') {
    const group = document.createElement('div');
    group.className = 'choice-group';

    currentQuestion.options.forEach(opt => {
      const btn = document.createElement('button');
      btn.className = 'choice-btn';
      btn.innerText = opt;
      btn.onclick = () => selectChoice(btn, opt);
      group.appendChild(btn);
    });

    answerArea.appendChild(group);
  }
}

function selectChoice(btnElement, value) {
  // すでに正解している場合は操作不可
  if (isCorrectState) return;
  
  const buttons = document.querySelectorAll('.choice-btn');
  buttons.forEach(b => b.classList.remove('selected'));

  btnElement.classList.add('selected');
  selectedChoice = value;
}

function checkAnswer() {
  // 正解済みの状態でボタンが押されたら「次の問題へ」移行
  if (isCorrectState) {
    loadQuestion();
    return;
  }

  let userAnswer = '';
  if (currentQuestion.inputType === 'number') {
    const input = document.getElementById('user-input');
    userAnswer = input ? input.value.trim() : '';
  } else if (currentQuestion.inputType === 'choice') {
    userAnswer = selectedChoice || '';
  }

  if (!userAnswer) {
    alert('こたえを 入力するか えらんでね！');
    return;
  }

  const feedbackEl = document.getElementById('feedback');
  const isCorrect = (userAnswer === currentQuestion.answer);

  if (isCorrect) {
    // 【正解の場合】
    isCorrectState = true;
    feedbackEl.innerText = '⭕ せいかい！ すごいね！';
    feedbackEl.className = 'feedback correct';
    feedbackEl.style.display = 'block';

    // 入力・選択の無効化
    const input = document.getElementById('user-input');
    if (input) input.disabled = true;

    // ボタンのテキストを変更
    const actionBtn = document.getElementById('action-btn');
    actionBtn.innerText = 'つぎの もんだいへ';
  } else {
    // 【不正解の場合】やり直しを促す
    feedbackEl.innerText = '❌ おしい！ もういちど かんがえてみよう！';
    feedbackEl.className = 'feedback incorrect';
    feedbackEl.style.display = 'block';
    
    // ボタン表示や状態はそのまま（再度「こたえあわせ」を押せる）
  }
}

window.onload = loadQuestion;