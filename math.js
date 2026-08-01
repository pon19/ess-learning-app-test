// ストレージ保存用キー
const STORAGE_KEY = 'math_print_current_problems';

// ====================================================
// ページ読み込み時の初期化
// ====================================================
document.addEventListener('DOMContentLoaded', () => {
    // 1. ページ読み込み時は「既存問題の復元」または「無ければ新規生成」
    initProblems();

    // 2. イベントリスナーの登録
    document.getElementById('checkBtn')?.addEventListener('click', checkAnswersAndSave);
    
    // ボタン押下時のみ明示的に新規生成を実行
    document.getElementById('resetBtn')?.addEventListener('click', async () => {
        if (confirm('あたらしい もんだいに かえますか？')) {
            await generateNewProblems();
        }
    });

    document.getElementById('logoutBtn')?.addEventListener('click', handleLogout);

    // 3. 認証状態の監視
    clientSupabase.auth.onAuthStateChange(async (event, session) => {
        if (session) {
            currentUser = session.user;
            
            const logoutBtn = document.getElementById('logoutBtn');
            if (logoutBtn) logoutBtn.style.display = 'block';

            await fetchUserProfile(currentUser.id);
            await loadScoreHistory();
        } else if (event === 'SIGNED_OUT' || (event === 'INITIAL_SESSION' && !session)) {
            alert('ログインが必要です。トップページへ もどります。');
            window.location.href = 'index.html';
        }
    });
});

// ====================================================
// 1. 認証 ＆ プロフィール表示 ＆ ログアウト処理
// ====================================================
async function fetchUserProfile(userId) {
    const name = await getUserDisplayName(userId);
    const nameBox = document.getElementById('userProfileName');
    if (nameBox) nameBox.textContent = 'なまえ : ${name}';
}

// ログアウト処理
async function handleLogout() {
    await clientSupabase.auth.signOut();
    window.location.href = 'index.html';
}

// ====================================================
// 2. 問題の初期化と保存・復元ロジック
// ====================================================

// ページ読み込み時の呼び出し（保存データがあれば読み込むだけ）
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
    // 保存データがない場合のみ新規生成
    await generateNewProblems();
}

// 「あたらしい問題にする」ボタン押下時（完全新規生成）
async function generateNewProblems() {
    // 画面のリセット
    const scoreBox = document.getElementById('scoreBox');
    if (scoreBox) scoreBox.style.display = 'none';

    // ----------------------------------------------------
    // A. 計算問題データ (4問) の生成
    // ----------------------------------------------------
    const calcProblems = [];
    for (let i = 0; i < 4; i++) {
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

    // ----------------------------------------------------
    // B. 文章問題データ (3問) の生成
    // ----------------------------------------------------
    // ※今後Gemini APIを呼び出す場合は、ここで行って生成結果を配列にします
    const wordTemplates = [
        {
            text: "りんごが {a}こ あります。おとうとから {b}こ もらいました。あわせて なんこに なりましたか。",
            emoji: "🍎",
            op: "+",
            getParams: () => {
                const a = Math.floor(Math.random() * 5) + 2;
                const b = Math.floor(Math.random() * 5) + 1;
                return { a, b, ans: a + b };
            }
        },
        {
            text: "こうえんに こどもが {a}にん いました。 {b}にん おうちに かえりました。のこりは なんにん ですか。",
            emoji: "👦",
            op: "-",
            getParams: () => {
                const a = Math.floor(Math.random() * 6) + 4;
                const b = Math.floor(Math.random() * (a - 1)) + 1;
                return { a, b, ans: a - b };
            }
        },
        {
            text: "キャンディーが {a}こ あります。おともだちに {b}こ あげました。のこりは なんこですか。",
            emoji: "🍬",
            op: "-",
            getParams: () => {
                const a = Math.floor(Math.random() * 5) + 4;
                const b = Math.floor(Math.random() * (a - 1)) + 1;
                return { a, b, ans: a - b };
            }
        },
        {
            text: "ねこが {a}ひき います。あとから {b}ひき やってきました。ぜんぶで なんひきに なりましたか。",
            emoji: "🐱",
            op: "+",
            getParams: () => {
                const a = Math.floor(Math.random() * 4) + 2;
                const b = Math.floor(Math.random() * 4) + 1;
                return { a, b, ans: a + b };
            }
        }
    ];

    const shuffledTemplates = [...wordTemplates].sort(() => Math.random() - 0.5);
    const wordProblems = [];

    for (let i = 0; i < 3; i++) {
        const selected = shuffledTemplates[i % shuffledTemplates.length];
        const p = selected.getParams();
        const problemText = selected.text.replace('{a}', p.a).replace('{b}', p.b);

        wordProblems.push({
            text: problemText,
            emoji: selected.emoji,
            count: p.a,
            op: selected.op,
            ans: p.ans
        });
    }

    // 問題データをオブジェクトにして保存
    const problemData = {
        calc: calcProblems,
        word: wordProblems
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(problemData));

    // 画面に描写
    renderProblems(problemData);
}

// ----------------------------------------------------
// C. 受け取った問題データを画面に表示する処理
// ----------------------------------------------------
function renderProblems(problems) {
    // 画面リセット
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
                    ${p.emoji.repeat(Math.min(p.count, 8))}
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
// 3. 採点 ＆ Supabaseへの成績自動保存
// ====================================================
async function checkAnswersAndSave() {
    let correctCount = 0;
    const totalQuestions = 7;

    // 1. 計算問題の採点 (4問)
    currentCalcAnswers.forEach((ans, i) => {
        const input = document.getElementById(`calcInput_${i}`);
        if (input && parseInt(input.value, 10) === ans) {
            correctCount++;
        }
    });

    // 2. 文章問題の採点 (3問)
    currentWordAnswers.forEach((ans, i) => {
        const wordInput = document.getElementById(`wordInput_${i}`);
        if (wordInput && parseInt(wordInput.value, 10) === ans) {
            correctCount++;
        }
    });

    // 3. 100点満点換算
    const finalScore = Math.round((correctCount / totalQuestions) * 100);

    // 画面に点数を表示
    const scoreBox = document.getElementById('scoreBox');
    if (scoreBox) {
        scoreBox.style.display = 'block';
        scoreBox.className = 'score-display';
        scoreBox.style.background = '#e6fffa';
        scoreBox.style.border = '2px solid #319795';
        scoreBox.style.color = '#234e52';
        scoreBox.innerHTML = `💮 てんすう： <strong>${finalScore}</strong> てん (${totalQuestions}もんちゅう ${correctCount}もん せいかい) 💮`;
    }

    // 4. ログイン中の場合、Supabase (math_scores_test) に保存
    if (currentUser) {
        const { error } = await clientSupabase
            .from('math_scores_test')
            .insert([
                {
                    user_id: currentUser.id,
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
// 4. 成績履歴の読み込みと表示
// ====================================================
async function loadScoreHistory() {
    const historyList = document.getElementById('historyList');
    if (!historyList || !currentUser) return;

    const { data, error } = await clientSupabase
        .from('math_scores_test')
        .select('*')
        .eq('user_id', currentUser.id)
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