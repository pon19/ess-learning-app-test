const GEMINI_API_KEY = "AQ.Ab8RN6L_aVgGUuoXLdCliSppPdfPagQ2pAHmExASMYl5iTRcDw";

// ----------------------------------------------------
// Supabase 設定 (変数名を clientSupabase にして名前衝突を回避)
// ----------------------------------------------------
const SUPABASE_URL = 'https://YOUR-PROJECT-REF.supabase.co';
const SUPABASE_ANON_KEY = 'YOUR-ANON-KEY';

// window.supabase は SDK が生成するオブジェクトのため、Clientを作成して別名で受ける
const clientSupabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let currentUser = null;
let attemptCount = 1;

document.addEventListener('DOMContentLoaded', async () => {
    // 1. 認証チェック
    await checkAuth();

    loadOrGenerateAll(false);

    const checkBtn = document.getElementById('checkBtn');
    if (checkBtn) checkBtn.addEventListener('click', checkAnswers);

    const resetBtn = document.getElementById('resetBtn');
    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            const isConfirmed = confirm('あたらしい もんだいに かえますか？\n（いままでの こたえは きえます）');
            if (isConfirmed) {
                attemptCount = 1;
                loadOrGenerateAll(true);
                resetInputs();
            }
        });
    }

    // ログインフォーム処理の追加
    const loginForm = document.getElementById('loginForm');
    if (loginForm) loginForm.addEventListener('submit', handleLogin);

    // ログアウトボタン処理の追加
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            await clientSupabase.auth.signOut();
            window.location.reload();
        });
    }
});

// ----------------------------------------------------
// 認証確認 ＆ プロフィール読み込み
// ----------------------------------------------------
async function checkAuth() {
    const { data: { session } } = await clientSupabase.auth.getSession();
    
    if (session) {
        currentUser = session.user;
        document.getElementById('loginModal').style.display = 'none';
        
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) logoutBtn.style.display = 'block';

        // profiles テーブルから名前を取得
        const { data: profile } = await clientSupabase
            .from('profiles')
            .select('display_name')
            .eq('id', currentUser.id)
            .single();

        if (profile) {
            const nameBox = document.getElementById('userProfileName');
            if (nameBox) nameBox.textContent = `なまえ：${profile.display_name}`;
        }
        
        loadScoreHistory();
    } else {
        document.getElementById('loginModal').style.display = 'flex';
    }
}

// ログインハンドラ
async function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    const errorEl = document.getElementById('loginError');

    errorEl.textContent = 'ログイン中...';

    const { data, error } = await clientSupabase.auth.signInWithPassword({ email, password });

    if (error) {
        errorEl.textContent = `ログインエラー: ${error.message}`;
    } else {
        errorEl.textContent = '';
        currentUser = data.user;
        checkAuth();
    }
}

// ----------------------------------------------------
// 採点 ＆ math_scores_pb への自動保存
// ----------------------------------------------------
async function checkAnswers() {
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

    const calculatedScore = Math.round((correctCount / totalCount) * 100);

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

    // Supabase math_scores_pb へ保存
    if (currentUser) {
        const { error } = await clientSupabase
            .from('math_scores_pb')
            .insert([
                {
                    user_id: currentUser.id,
                    score: calculatedScore,
                    attempt_count: attemptCount,
                    category: 'さんすうプリント'
                }
            ]);

        if (error) {
            console.error('成績保存エラー:', error.message);
        } else {
            attemptCount++;
            loadScoreHistory();
        }
    }
}

// ----------------------------------------------------
// 履歴読み込み
// ----------------------------------------------------
async function loadScoreHistory() {
    const historyList = document.getElementById('historyList');
    if (!historyList || !currentUser) return;

    const { data: scores, error } = await clientSupabase
        .from('math_scores_pb')
        .select('score, attempt_count, solved_at')
        .eq('user_id', currentUser.id)
        .order('solved_at', { ascending: false })
        .limit(10);

    if (error) {
        historyList.innerHTML = `<p style="color:red;">きろくの よみこみに しっぱいしました</p>`;
        return;
    }

    if (!scores || scores.length === 0) {
        historyList.innerHTML = '<p style="color:#718096; font-size:14px;">まだ きろくが ありません。</p>';
        return;
    }

    historyList.innerHTML = '';
    scores.forEach(item => {
        const date = new Date(item.solved_at).toLocaleString('ja-JP', {
            month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit'
        });
        const div = document.createElement('div');
        div.style.padding = '6px 0';
        div.style.borderBottom = '1px solid #edf2f7';
        div.style.fontSize = '14px';
        div.innerHTML = `📅 <strong>${date}</strong> ： <strong>${item.score}点</strong> (${item.attempt_count}かいめ)`;
        historyList.appendChild(div);
    });
}

async function loadOrGenerateAll(forceNew = false) {
    loadOrGenerateCalculations(forceNew);
    await loadOrGenerateWordProblems(forceNew);
}

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
            selectedProblems = [
                { text: "りんごが 3こ あります。みかんが 2こ あります。あわせて なんこですか。", icon: "🍎 🍎 🍎 + 🍊 🍊", num1: 3, num2: 2, answer: 5, unit: "こ", op: "+" },
                { text: "クッキーが 5こ ありました。2こ たべました。のこりは なんこですか。", icon: "🍪 🍪 🍪 🍪 🍪 ➔ ❌ ❌", num1: 5, num2: 2, answer: 3, unit: "こ", op: "-" },
                { text: "どんぐりを 6こ ひろいました。3こ あげました。のこりは なんこですか。", icon: "🌰 🌰 🌰 🌰 🌰 🌰 ➔ 🎁 🌰 🌰 🌰", num1: 6, num2: 3, answer: 3, unit: "こ", op: "-" }
            ];
            renderWordProblems(selectedProblems);
        }
    }
}

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

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }]
        })
    });

    const data = await response.json();
    let textResult = data.candidates[0].content.parts[0].text;
    textResult = textResult.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(textResult);
}

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