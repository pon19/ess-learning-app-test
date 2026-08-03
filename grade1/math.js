// ====================================================
// 状態管理変数 & 定数
// ====================================================
let currentCalcAnswers = [];
let currentWordAnswers = [];
let currentUser = null;

// ====================================================
// 📅 今日の日付キーを取得する関数（例: math_print_daily_2026-08-03_g1）
// ====================================================
function getTodayKey() {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `math_print_daily_${year}-${month}-${day}_g1`;
}

// ====================================================
// ページ読み込み時の初期化
// ====================================================
document.addEventListener('DOMContentLoaded', () => {
    // 1. 今日の問題を読み込み（または新規生成）
    initProblems();

    // 2. イベントリスナーの設定
    document.getElementById('checkBtn')?.addEventListener('click', checkAnswersAndSave);
    document.getElementById('logoutBtn')?.addEventListener('click', () => handleLogout('../index.html'));

    // 3. Supabase 認証状態の監視
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

// ====================================================
// 🔍 問題の判定と読み込み処理（日替わり判定の核心部分）
// ====================================================
async function initProblems() {
    const todayKey = getTodayKey();
    const savedData = localStorage.getItem(todayKey);

    // 【パターンA】今日の問題がすでに保存されている場合 -> それを使う
    if (savedData) {
        try {
            const problems = JSON.parse(savedData);
            renderProblems(problems);
            return;
        } catch (e) {
            console.error('保存データの読み込み失敗:', e);
        }
    }

    // 【パターンB】今日初めてアクセスした場合 -> 新しく生成して保存する
    await generateNewProblems(todayKey);
}

// ====================================================
// 🤖 Supabase Edge Function 経由で文章問題を生成
// ====================================================
async function fetchWordProblemsFromGemini() {
    const { data, error } = await clientSupabase.functions.invoke('generate-problems');

    if (error) {
        throw new Error(`Edge Function Error: ${error.message}`);
    }

    return data;
}

// ⚠️ APIエラー時の代替テンプレート
function getFallbackWordProblems() {
    return [
        { text: "りんごが 3こ あります。 2こ もらいました。 あわせて なんこに なりましたか。", emoji: "🍎", count: 3, ans: 5 },
        { text: "こうえんに こどもが 6にん いました。 2にん かえりました。 のこりは なんにん ですか。", emoji: "👦", count: 6, ans: 4 },
        { text: "キャンディーが 5こ あります。 2こ あげました。 のこりは なんこですか。", emoji: "🍬", count: 5, ans: 3 },
        { text: "ねこが 2ひき います。 3ひき やってきました。 ぜんぶで なんひきに なりましたか。", emoji: "🐱", count: 2, ans: 5 },
        { text: "みかんが 4こ あります。 1こ たべました。 のこりは なんこですか。", emoji: "🍊", count: 4, ans: 3 }
    ];
}

// ====================================================
// 🎲 新しい問題を生成して LocalStorage に保存する
// ====================================================
async function generateNewProblems(todayKey) {
    const scoreBox = document.getElementById('scoreBox');
    if (scoreBox) scoreBox.style.display = 'none';

    const wordArea = document.getElementById('wordProblemArea');
    if (wordArea) {
        wordArea.innerHTML = '<p style="text-align:center; color:#4a5568;">🤖 きょうの もんだいを じゅんび しています...</p>';
    }

    // A. 計算問題データ (10問)
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

    // B. 文章問題データ (5問)
    let wordProblems = [];
    try {
        wordProblems = await fetchWordProblemsFromGemini();
    } catch (error) {
        console.warn('Gemini APIからの取得に失敗したため、固定問題を使用します:', error);
        wordProblems = getFallbackWordProblems();
    }

    const problemData = { calc: calcProblems, word: wordProblems };

    // 🧹 不要になった過去の古い日付けデータを削除
    Object.keys(localStorage).forEach(key => {
        if (key.startsWith('math_print_daily_')) {
            localStorage.removeItem(key);
        }
    });

    // 💾 今日の問題データを保存
    localStorage.setItem(todayKey, JSON.stringify(problemData));

    // 画面に描画
    renderProblems(problemData);
}

// ====================================================
// 🎨 問題の画面描画
// ====================================================
function renderProblems(problems) {
    const scoreBox = document.getElementById('scoreBox');
    if (scoreBox) scoreBox.style.display = 'none';

    // 1. 計算問題
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

    // 2. 文章問題
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

// ====================================================
// 💯 採点および Supabase への結果保存
// ====================================================
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

// ====================================================
// 📜 成績履歴の読み込み
// ====================================================
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