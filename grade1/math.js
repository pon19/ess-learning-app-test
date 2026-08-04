// グローバル変数
let currentProblems = []; 
let currentWordProblems = []; // 文章問題用を追加
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
        // math.html 側の JavaScript 例
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const todayStr = `${year}-${month}-${day}`; // 正確なYYYY-MM-DD (日本時間)

        // まずは確実に存在する problems のみを取得してエラーを防ぐ
        const { data, error } = await clientSupabase
            .from('daily_problems')
            .select('*') // * にすることで存在する列だけを安全に取得
            .eq('target_date', todayStr)
            .eq('grade', 1)
            .eq('subject', 'math')
            .maybeSingle();

        if (error) throw error;

        if (data) {
            // 計算問題のセット
            if (data.problems && data.problems.length > 0) {
                currentProblems = data.problems;
            } else {
                currentProblems = getFallbackProblems();
            }

            // 文章問題のセット（列が存在し、データがある場合）
            if (data.word_problems && data.word_problems.length > 0) {
                currentWordProblems = data.word_problems;
            } else {
                currentWordProblems = getFallbackWordProblems();
            }
        } else {
            // 本日のデータ自体が未登録の場合
            console.warn('本日のデータが未登録のため予備問題を表示します。');
            currentProblems = getFallbackProblems();
            currentWordProblems = getFallbackWordProblems();
        }

        renderProblems(currentProblems);
        renderWordProblems(currentWordProblems);

    } catch (err) {
        console.error('問題読み込みエラー:', err);
        currentProblems = getFallbackProblems();
        currentWordProblems = getFallbackWordProblems();
        renderProblems(currentProblems);
        renderWordProblems(currentWordProblems);
    }
}

// ====================================================
// 3. 計算問題を画面に描画
// ====================================================
function renderProblems(problems) {
    const calcGrid = document.getElementById('calcGrid');
    if (!calcGrid) return;

    calcGrid.innerHTML = ''; 

    problems.forEach((p, index) => {
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
// 4. 文章問題を画面に描画
// ====================================================
function renderWordProblems(wordProblems) {
    // HTMLにある「wordProblemArea」を取得
    const wordProblemArea = document.getElementById('wordProblemArea');
    if (!wordProblemArea) return;

    // 中身をリセット
    wordProblemArea.innerHTML = '';

    // 文章問題カードを作成して追加
    wordProblems.forEach((wp, index) => {
        const div = document.createElement('div');
        div.style.padding = '15px';
        div.style.marginBottom = '15px';
        div.style.backgroundColor = '#f7fafc';
        div.style.borderRadius = '8px';
        div.style.border = '1px solid #e2e8f0';

        div.innerHTML = `
            <div style="font-size: 1.2rem; font-weight: bold; margin-bottom: 15px; line-height: 1.5;">
                <span style="color: #718096; font-size: 1rem; margin-right: 5px;">(${index + 1})</span>
                ${wp.text}
            </div>
            <div style="display: flex; gap: 15px; align-items: center; justify-content: flex-end; font-size: 1.2rem; font-weight: bold;">
                しき：<input type="text" id="wp_eq_${index}" style="width: 120px; height: 40px; font-size: 1.2rem; text-align: center; border: 2px solid #cbd5e0; border-radius: 8px;">
                こたえ：<input type="number" id="wp_ans_${index}" style="width: 70px; height: 40px; font-size: 1.2rem; text-align: center; border: 2px solid #cbd5e0; border-radius: 8px;">
            </div>
        `;
        wordProblemArea.appendChild(div);
    });
}

// ====================================================
// 5. 答え合わせ ＆ 成績保存
// ====================================================
async function checkAnswersAndSave() {
    let correctCount = 0;
    const totalCount = currentProblems.length + currentWordProblems.length;

    if (totalCount === 0) return;

    // 計算問題の答え合わせ
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

    // 文章問題の答え合わせ（今回は「こたえ」の数値のみで判定）
    currentWordProblems.forEach((wp, index) => {
        const ansInput = document.getElementById(`wp_ans_${index}`);
        if (!ansInput) return;
        
        const userAnswer = parseInt(ansInput.value, 10);
        if (!isNaN(userAnswer) && userAnswer === wp.answer) {
            correctCount++;
            ansInput.style.borderColor = '#48bb78';
            ansInput.style.backgroundColor = '#f0fff4';
        } else {
            ansInput.style.borderColor = '#e53e3e';
            ansInput.style.backgroundColor = '#fff5f5';
        }
    });

    const score = Math.round((correctCount / totalCount) * 100);

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
// 6. 予備問題（DBにデータがない場合の保険）
// ====================================================
function getFallbackProblems() {
    return [
        { id: 1, p1: 2, p2: 3, operator: '＋', answer: 5 },
        { id: 2, p1: 7, p2: 4, operator: '－', answer: 3 },
        { id: 3, p1: 5, p2: 5, operator: '＋', answer: 10 },
        { id: 4, p1: 9, p2: 1, operator: '－', answer: 8 },
        { id: 5, p1: 4, p2: 2, operator: '＋', answer: 6 },
        { id: 6, p1: 8, p2: 3, operator: '－', answer: 5 },
        { id: 7, p1: 6, p2: 4, operator: '＋', answer: 10 },
        { id: 8, p1: 10, p2: 2, operator: '－', answer: 8 },
        { id: 9, p1: 1, p2: 7, operator: '＋', answer: 8 },
        { id: 10, p1: 5, p2: 0, operator: '－', answer: 5 }
    ];
}

function getFallbackWordProblems() {
    return [
        {
            id: 1,
            text: "りんごが 3こ あります。みかんを 4こ もらいました。あわせて いくつに なりますか。",
            equation: "3+4",
            answer: 7
        },
        {
            id: 2,
            text: "こうえんに こどもが 10にん いました。3にん かえりました。のこりは なんにんですか。",
            equation: "10-3",
            answer: 7
        }
    ];
}