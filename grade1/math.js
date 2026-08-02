// ====================================================
// 状態管理変数 & 定数
// ====================================================
let currentCalcAnswers = [];
let currentWordAnswers = [];

// ストレージ保存用キー（1年生算数専用）
const STORAGE_KEY = 'math_print_current_problems_g1';

// 🔑 Gemini API Key（※実際のご自身のAPIキーに置き換えてください）
const GEMINI_API_KEY = '';

// ====================================================
// ページ読み込み時の初期化
// ====================================================
document.addEventListener('DOMContentLoaded', () => {
    initProblems();

    document.getElementById('checkBtn')?.addEventListener('click', checkAnswersAndSave);
    
    document.getElementById('resetBtn')?.addEventListener('click', async () => {
        if (confirm('あたらしい もんだいに かえますか？')) {
            await generateNewProblems();
        }
    });

    document.getElementById('logoutBtn')?.addEventListener('click', () => handleLogout('index.html'));

    clientSupabase.auth.onAuthStateChange(async (event, session) => {
        if (session) {
            currentUser = session.user;
            const logoutBtn = document.getElementById('logoutBtn');
            if (logoutBtn) logoutBtn.style.display = 'block';

            await fetchUserProfile(currentUser.id);
            await loadScoreHistory();
        } else if (event === 'SIGNED_OUT' || (event === 'INITIAL_SESSION' && !session)) {
            alert('ログインが必要です。トップページへ もどります。');
            window.location.href = '../index.html';
        }
    });
});

async function fetchUserProfile(userId) {
    const name = await getUserDisplayName(userId);
    const nameBox = document.getElementById('userProfileName');
    if (nameBox) nameBox.textContent = `なまえ : ${name}`;
}

async function initProblems() {
    const savedData = localStorage.getItem(STORAGE_KEY);
    if (savedData) {
        try {
            const problems = JSON.parse(savedData);
            renderProblems(problems);
            return;
        } catch (e) {
            console.error('保存データの読み込み失敗:', e);
        }
    }
    await generateNewProblems();
}

// ====================================================
// 🤖 Gemini API を使った文章問題生成
// ====================================================
async function fetchWordProblemsFromGemini() {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;

    const prompt = `
小学1年生向けの算数の文章問題を5問作成してください。

【制約事項】
1. 漢字は使わず、すべて「ひらがな」と「数字」のみで記述すること。
2. たし算（繰り上がりなし、合計10以下）または ひき算（繰り下がりなし、10以下）の難易度にすること。
3. 問題文、イラスト用の絵文字1つ、最初の数(count)、答え(ans)をJSON形式で出力すること。

【出力フォーマット】
以下のJSON構造を厳密に守り、JSONのみを出力してください。
[
  {
    "text": "りんごが 3こ あります。 2こ もらいました。 あわせて なんこに なりましたか。",
    "emoji": "🍎",
    "count": 3,
    "ans": 5
  }
]
`;

    const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
                responseMimeType: "application/json" // JSONで返却させる設定
            }
        })
    });

    if (!response.ok) {
        throw new Error(`Gemini API Error: ${response.status}`);
    }

    const data = await response.json();
    const jsonText = data.candidates[0].content.parts[0].text;
    return JSON.parse(jsonText);
}

// ⚠️ APIエラー時の代替テンプレート（フォールバック用）
function getFallbackWordProblems() {
    const templates = [
        { text: "りんごが 3こ あります。 2こ もらいました。 あわせて なんこに なりましたか。", emoji: "🍎", count: 3, ans: 5 },
        { text: "こうえんに こどもが 6にん いました。 2にん かえりました。 のこりは なんにん ですか。", emoji: "👦", count: 6, ans: 4 },
        { text: "キャンディーが 5こ あります。 2こ あげました。 のこりは なんこですか。", emoji: "🍬", count: 5, ans: 3 },
        { text: "ねこが 2ひき います。 3ひき やってきました。 ぜんぶで なんひきに なりましたか。", emoji: "🐱", count: 2, ans: 5 },
        { text: "みかんが 4こ あります。 1こ たべました。 のこりは なんこですか。", emoji: "🍊", count: 4, ans: 3 }
    ];
    return templates;
}

// ====================================================
// 2. 問題の全体生成
// ====================================================
async function generateNewProblems() {
    const scoreBox = document.getElementById('scoreBox');
    if (scoreBox) scoreBox.style.display = 'none';

    // 生成中メッセージの表示（API呼び出し時の体感速度向上のため）
    const wordArea = document.getElementById('wordProblemArea');
    if (wordArea) {
        wordArea.innerHTML = '<p style="text-align:center; color:#4a5568;">🤖 Geminiが あたらしい もんだいを かんがえています...</p>';
    }

    // A. 計算問題データ (10問) の生成
    const calcProblems = [];
    for (let i = 0; i < 10; i++) {
        const isAddition = Math.random() > 0.3;
        let num1, num2, ans, op;

        if (isAddition) {
            num1 = Math.floor(Math.random() * 9) + 1;
            num2 = Math.floor(Math.random() * 9) + 1;
            ans = num1 + num2;
            op = '＋';
        } else {
            num1 = Math.floor(Math.random() * 9) + 2;
            num2 = Math.floor(Math.random() * (num1 - 1)) + 1;
            ans = num1 - num2;
            op = '－';
        }

        calcProblems.push({ num1, num2, ans, op });
    }

    // B. 文章問題データ (5問) の生成（Gemini API呼び出し）
    let wordProblems = [];
    try {
        wordProblems = await fetchWordProblemsFromGemini();
    } catch (error) {
        console.warn('Gemini APIからの取得に失敗したため、固定問題を使用します:', error);
        wordProblems = getFallbackWordProblems();
    }

    const problemData = { calc: calcProblems, word: wordProblems };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(problemData));
    renderProblems(problemData);
}

// ====================================================
// 描画・採点・履歴読み込み処理（変更なし）
// ====================================================
function renderProblems(problems) {
    const scoreBox = document.getElementById('scoreBox');
    if (scoreBox) scoreBox.style.display = 'none';

    // 1. 計算問題の表示
    const calcGrid = document.getElementById('calcGrid');
    if (calcGrid && problems.calc) {
        calcGrid.innerHTML = '';
        currentCalcAnswers = [];

        problems.calc.forEach((p, i) => {
            currentCalcAnswers.push(p.ans);

            const card = document.createElement('div');
            card.className = 'calc-box';
            card.innerHTML = `
                <span>(${i + 1}) ${p.num1} ${p.op} ${p.num2} ＝</span>
                <input type="number" class="input-num" id="calcInput_${i}" autocomplete="off">
            `;
            calcGrid.appendChild(card);
        });
    }

    // 2. 文章問題の表示
    const wordArea = document.getElementById('wordProblemArea');
    if (wordArea && problems.word) {
        wordArea.innerHTML = '';
        currentWordAnswers = [];

        problems.word.forEach((p, i) => {
            currentWordAnswers.push(p.ans);

            const wordCard = document.createElement('div');
            wordCard.className = 'problem-card';
            wordCard.innerHTML = `
                <div class="problem-header">
                    <div class="problem-num">${i + 1}</div>
                    <div class="problem-text">${p.text}</div>
                </div>
                <div class="illustration-box">
                    ${(p.emoji || '🍎').repeat(Math.min(p.count || 3, 8))}
                </div>
                <div class="formula-area">
                    <span class="formula-label">しき：</span>
                    <input type="text" class="input-num" id="formulaInput_${i}" style="width: 110px; font-size: 16px;" autocomplete="off">
                    <span style="margin-left: 15px;">こたえ：</span>
                    <input type="number" class="input-num" id="wordInput_${i}" autocomplete="off">
                </div>
            `;
            wordArea.appendChild(wordCard);
        });
    }
}

async function checkAnswersAndSave() {
    let correctCount = 0;
    const totalQuestions = 15;

    currentCalcAnswers.forEach((ans, i) => {
        const input = document.getElementById(`calcInput_${i}`);
        if (input && parseInt(input.value, 10) === ans) {
            correctCount++;
        }
    });

    currentWordAnswers.forEach((ans, i) => {
        const wordInput = document.getElementById(`wordInput_${i}`);
        if (wordInput && parseInt(wordInput.value, 10) === ans) {
            correctCount++;
        }
    });

    const finalScore = Math.round((correctCount / totalQuestions) * 100);

    const scoreBox = document.getElementById('scoreBox');
    if (scoreBox) {
        scoreBox.style.display = 'block';
        scoreBox.className = 'score-display';
        scoreBox.style.background = '#e6fffa';
        scoreBox.style.border = '2px solid #319795';
        scoreBox.style.color = '#234e52';
        scoreBox.innerHTML = `💮 てんすう： <strong>${finalScore}</strong> てん (${totalQuestions}もんちゅう ${correctCount}もん せいかい) 💮`;
    }

    if (currentUser) {
        const { error } = await clientSupabase
            .from('learning_scores_test')
            .insert([
                {
                    user_id: currentUser.id,
                    grade: 1,
                    subject: 'math',
                    score: finalScore,
                    total_questions: totalQuestions
                }
            ]);

        if (error) {
            console.error('成績保存エラー:', error.message);
        } else {
            loadScoreHistory();
        }
    }
}

async function loadScoreHistory() {
    const historyList = document.getElementById('historyList');
    if (!historyList || !currentUser) return;

    const { data, error } = await clientSupabase
        .from('learning_scores_test')
        .select('*')
        .eq('user_id', currentUser.id)
        .eq('grade', 1)
        .eq('subject', 'math')
        .order('created_at', { ascending: false })
        .limit(5);

    if (error) {
        console.error('履歴取得エラー:', error.message);
        return;
    }

    if (data && data.length > 0) {
        historyList.innerHTML = data.map(item => {
            const date = new Date(item.created_at).toLocaleString('ja-JP', {
                month: 'numeric',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
            return `<div style="padding: 8px 0; border-bottom: 1px dashed #e2e8f0; font-size: 14px;">
                📅 <strong>${date}</strong> — 点数: <span style="color: #dd6b20; font-weight: bold;">${item.score}点</span>
            </div>`;
        }).join('');
    } else {
        historyList.innerHTML = '<p style="color:#718096; margin:0; font-size:14px;">まだ きろくが ありません。</p>';
    }
}