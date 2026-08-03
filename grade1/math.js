// グローバル変数
let currentProblems = []; 
let currentUser = null;    

// ====================================================
// 1. 初期化処理
// ====================================================
document.addEventListener('DOMContentLoaded', async () => {
    // ログイン情報の取得と、プリントへの「なまえ」表示
    currentUser = await getCurrentUser();
    if (currentUser) {
        const nameBox = document.getElementById('userProfileName');
        if (nameBox) {
            const displayName = await getUserDisplayName(currentUser.id);
            nameBox.textContent = `なまえ： ${displayName} さん`;
        }
    }

    // 答え合わせボタンのイベント設定
    document.getElementById('checkBtn')?.addEventListener('click', checkAnswersAndSave);

    // 今日の問題をDBから読み込み
    await loadTodayProblems();
});

// ====================================================
// 2. DBから「今日の問題」を取得
// ====================================================
async function loadTodayProblems() {
    try {
        // 日本時間の今日の日付 (YYYY-MM-DD)
        const todayStr = new Date().toISOString().split('T')[0];

        const { data, error } = await clientSupabase
            .from('daily_problems')
            .select('problems')
            .eq('target_date', todayStr)
            .eq('grade', 1)
            .eq('subject', 'math')
            .maybeSingle();

        if (error) throw error;

        if (data && data.problems && data.problems.length > 0) {
            currentProblems = data.problems;
        } else {
            console.warn('本日の問題が見つからないため、予備の問題を表示します。');
            currentProblems = getFallbackProblems();
        }

        renderProblems(currentProblems);

    } catch (err) {
        console.error('問題読み込みエラー:', err);
        currentProblems = getFallbackProblems();
        renderProblems(currentProblems);
    }
}

// ====================================================
// 3. 問題を画面に描画（math.html の #calcGrid に対応）
// ====================================================
function renderProblems(problems) {
    const calcGrid = document.getElementById('calcGrid');
    if (!calcGrid) return;

    calcGrid.innerHTML = ''; // 中身をリセット

    problems.forEach((p, index) => {
        // html側のスタイルに合わせた計算用コンテナを作成
        const div = document.createElement('div');
        div.style.display = 'flex';
        div.style.alignItems = 'center';
        div.style.justifyContent = 'space-between';
        div.style.padding = '12px 0';
        div.style.borderBottom = '1px solid #e2e8f0';
        div.style.fontSize = '1.3rem';
        div.style.fontWeight = 'bold';

        div.innerHTML = `
            <div>
                <span style="color: #718096; font-size: 1rem; margin-right: 10px;">(${index + 1})</span>
                <span>${p.p1} ${p.operator} ${p.p2} ＝</span>
            </div>
            <input type="number" id="answer_${index}" style="width: 70px; height: 40px; font-size: 1.3rem; text-align: center; border: 2px solid #cbd5e0; border-radius: 8px;" pattern="\\d*">
        `;
        calcGrid.appendChild(div);
    });
}

// ====================================================
// 4. 答え合わせ ＆ 成績保存
// ====================================================
async function checkAnswersAndSave() {
    if (!currentProblems || currentProblems.length === 0) return;

    let correctCount = 0;
    const totalCount = currentProblems.length;

    currentProblems.forEach((problem, index) => {
        const inputEl = document.getElementById(`answer_${index}`);
        if (!inputEl) return;
        
        const userAnswer = parseInt(inputEl.value, 10);

        if (!isNaN(userAnswer) && userAnswer === problem.answer) {
            correctCount++;
            inputEl.style.borderColor = '#48bb78';
            inputEl.style.backgroundColor = '#f0fff4';
        } else {
            inputEl.style.borderColor = '#e53e3e';
            inputEl.style.backgroundColor = '#fff5f5';
        }
    });

    const score = Math.round((correctCount / totalCount) * 100);

    // 点数をアラートではなく画面上の専用ボックスに出力
    const scoreBox = document.getElementById('scoreBox');
    if (scoreBox) {
        scoreBox.style.display = 'block';
        scoreBox.style.padding = '15px';
        scoreBox.style.marginTop = '20px';
        scoreBox.style.background = '#e6fffa';
        scoreBox.style.border = '2px solid #319795';
        scoreBox.style.color = '#234e52';
        scoreBox.style.fontSize = '1.2rem';
        scoreBox.style.fontWeight = 'bold';
        scoreBox.style.borderRadius = '8px';
        scoreBox.innerHTML = `💮 てんすう： ${score} てん (${totalCount}もんちゅう ${correctCount}もん せいかい) 💮`;
    }

    // データベースに点数を保存
    if (currentUser) {
        try {
            await clientSupabase
                .from('learning_scores_test')
                .insert([{
                    user_id: currentUser.id,
                    grade: 1,
                    subject: 'math',
                    score: score
                }]);
        } catch (e) {
            console.error('成績保存エラー:', e);
        }
    }
}

// ====================================================
// 5. 予備問題（データ未作成時の保険）
// ====================================================
function getFallbackProblems() {
    return [
        { id: 1, p1: 2, p2: 3, operator: '＋', answer: 5 },
        { id: 2, p1: 7, p2: 4, operator: '－', answer: 3 },
        { id: 3, p1: 5, p2: 5, operator: '＋', answer: 10 },
        { id: 4, p1: 9, p2: 1, operator: '－', answer: 8 },
        { id: 5, p1: 4, p2: 2, operator: '＋', answer: 6 }
    ];
}