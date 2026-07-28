const GEMINI_API_KEY = "AQ.Ab8RN6L_aVgGUuoXLdCliSppPdfPagQ2pAHmExASMYl5iTRcDw";

document.addEventListener('DOMContentLoaded', () => {
    loadOrGenerateAll(false);

    const checkBtn = document.getElementById('checkBtn');
    if (checkBtn) checkBtn.addEventListener('click', checkAnswers);

    const resetBtn = document.getElementById('resetBtn');
    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            const isConfirmed = confirm('あたらしい もんだいに かえますか？\n（いままでの こたえは きえます）');
            if (isConfirmed) {
                loadOrGenerateAll(true);
                resetInputs();
            }
        });
    }
});

async function loadOrGenerateAll(forceNew = false) {
    loadOrGenerateCalculations(forceNew);
    await loadOrGenerateWordProblems(forceNew);
}

// 1. 計算問題（端末ごとにランダム生成）
function loadOrGenerateCalculations(forceNew) {
    const calcGrid = document.getElementById('calcGrid');
    if (!calcGrid) return;

    let questions = [];
    const savedData = sessionStorage.getItem('sansu_calc_questions');

    if (!forceNew && savedData) {
        questions = JSON.parse(savedData);
    } else {
        questions = generateQuestionsData();
        sessionStorage.setItem('sansu_calc_questions', JSON.stringify(questions));
    }

    calcGrid.innerHTML = '';
    const circleNums = ['①', '②', '③', '④'];
    questions.forEach((q, i) => {
        const calcBox = document.createElement('div');
        calcBox.className = 'calc-box';
        calcBox.innerHTML = `
            <span>${circleNums[i]} ${q.num1} ${q.operator} ${q.num2} =</span>
            <input type="number" class="input-num" data-ans="${q.answer}">
        `;
        calcGrid.appendChild(calcBox);
    });
}

function generateQuestionsData() {
    const questions = [];
    for (let i = 0; i < 4; i++) {
        const isAddition = Math.random() < 0.5;
        let num1, num2, answer, operator;
        if (isAddition) {
            operator = '+';
            num1 = Math.floor(Math.random() * 9) + 1;
            num2 = Math.floor(Math.random() * 9) + 1;
            answer = num1 + num2;
        } else {
            operator = '-';
            num1 = Math.floor(Math.random() * 10) + 1;
            num2 = Math.floor(Math.random() * num1) + 1;
            answer = num1 - num2;
        }
        questions.push({ num1, num2, operator, answer });
    }
    return questions;
}

// 2. 文章問題（端末ごとのブラウザから Gemini API を呼び出して個別生成）
async function loadOrGenerateWordProblems(forceNew) {
    const area = document.getElementById('wordProblemArea');
    if (!area) return;

    let selectedProblems = [];
    const savedData = sessionStorage.getItem('sansu_word_questions');

    if (!forceNew && savedData) {
        selectedProblems = JSON.parse(savedData);
        renderWordProblems(selectedProblems);
    } else {
        area.innerHTML = '<div style="text-align:center; padding:20px; color:#4a5568;">✨ あたらしい もんだいを かんがえています...</div>';
        
        try {
            selectedProblems = await fetchProblemsFromGemini();
            sessionStorage.setItem('sansu_word_questions', JSON.stringify(selectedProblems));
            renderWordProblems(selectedProblems);
        } catch (error) {
            console.error('Gemini API Error:', error);
            // APIエラー時（通信障害等）のバックアップ問題
            selectedProblems = [
                { text: "りんごが 3こ あります。みかんが 2こ あります。あわせて なんこですか。", icon: "🍎 🍎 🍎 + 🍊 🍊", num1: 3, num2: 2, answer: 5, unit: "こ", op: "+" },
                { text: "クッキーが 5こ ありました。2こ たべました。のこりは なんこですか。", icon: "🍪 🍪 🍪 🍪 🍪 ➔ ❌ ❌", num1: 5, num2: 2, answer: 3, unit: "こ", op: "-" },
                { text: "どんぐりを 6こ ひろいました。3こ あげました。のこりは なんこですか。", icon: "🌰 🌰 🌰 🌰 🌰 🌰 ➔ 🎁 🌰 🌰 🌰", num1: 6, num2: 3, answer: 3, unit: "こ", op: "-" }
            ];
            renderWordProblems(selectedProblems);
        }
    }
}

// Gemini APIへ直接問い合わせる処理（モデル名を正しく修正）
async function fetchProblemsFromGemini() {
    const prompt = `小学校1年生向けの算数問題を3問生成し、必ず純粋なJSON配列のみを返してください。
[
  {
    "text": "ひらがなのみの文章題（例：りんごが 3こ あります。みかんが 2こ あります。あわせて なんこですか。）",
    "icon": "絵文字でのイメージ（例：🍎 🍎 🍎 + 🍊 🍊）",
    "num1": 3,
    "num2": 2,
    "answer": 5,
    "unit": "単位（こ、だい、とり、まい など）",
    "op": "+"
  }
]
条件：
- 1問目: たしざん(+)
- 2問目: ひきざん(-)
- 3問目: ひきざん(-)
- 答えは1から10までの整数
- 余計な解説やMarkdownの整形タグは含めず、JSONのみを出力してください。`;

    // モデル名を有効な "gemini-2.5-flash" または "gemini-1.5-flash" に修正
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }]
        })
    });

    const data = await response.json();
    let textResult = data.candidates[0].content.parts[0].text;
    
    // 不要な記号(```json 等)を除去してパース
    textResult = textResult.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(textResult);
}

// 画面描画処理
function renderWordProblems(problems) {
    const area = document.getElementById('wordProblemArea');
    if (!area) return;

    area.innerHTML = '';
    problems.forEach((p, index) => {
        const card = document.createElement('div');
        card.className = 'problem-card';
        card.innerHTML = `
            <div class="problem-header">
                <span class="problem-num">${index + 1}</span>
                <div class="problem-text">${p.text}</div>
            </div>
            <div class="illustration-box">${p.icon}</div>
            <div class="formula-area">
                <span class="formula-label">しき：</span>
                <input type="number" class="input-num" data-ans="${p.num1}">
                <span>${p.op}</span>
                <input type="number" class="input-num" data-ans="${p.num2}">
                <span>=</span>
                <input type="number" class="input-num" data-ans="${p.answer}">
            </div>
            <div class="formula-area">
                <span class="formula-label">こたえ：</span>
                <input type="number" class="input-num" data-ans="${p.answer}">
                <span>${p.unit}</span>
            </div>
        `;
        area.appendChild(card);
    });
}

function resetInputs() {
    const inputs = document.querySelectorAll('.input-num');
    inputs.forEach(input => {
        input.value = '';
        input.style.backgroundColor = '#fff';
        input.style.borderColor = '#4299e1';
    });
    const scoreBox = document.getElementById('scoreBox');
    if (scoreBox) scoreBox.style.display = 'none';
}

function checkAnswers() {
    const inputs = document.querySelectorAll('.input-num');
    let correctCount = 0;
    const totalCount = inputs.length;

    inputs.forEach(input => {
        const userAns = input.value.trim();
        const expected = input.getAttribute('data-ans');

        if (userAns !== '' && userAns === expected) {
            input.style.backgroundColor = '#c6f6d5';
            input.style.borderColor = '#38a169';
            correctCount++;
        } else {
            input.style.backgroundColor = '#fed7d7';
            input.style.borderColor = '#e53e3e';
        }
    });

    const scoreBox = document.getElementById('scoreBox');
    scoreBox.style.display = 'block';

    if (correctCount === totalCount) {
        scoreBox.innerHTML = '🎉 はなまる！ ぜんぶ せいかいです！ おめでとう！ 💮✨';
        scoreBox.style.color = '#276749';
        scoreBox.style.backgroundColor = '#c6f6d5';
        scoreBox.style.border = '2px solid #38a169';
    } else {
        scoreBox.innerHTML = `💪 あとすこし！ ${totalCount}こちゅう ${correctCount}こ せいかいです。<br>あかいところを もういちど かんがえてみよう！`;
        scoreBox.style.color = '#9b2c2c';
        scoreBox.style.backgroundColor = '#fed7d7';
        scoreBox.style.border = '2px solid #e53e3e';
    }
}