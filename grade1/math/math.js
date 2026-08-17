// グローバル変数
let currentProblems = []; 
let currentWordProblems = []; 
let currentUser = null;    

// ====================================================
// 1. 初期化処理
// ====================================================
document.addEventListener('DOMContentLoaded', async () => {
    const supabaseClient = typeof clientSupabase !== 'undefined' ? clientSupabase : (typeof supabase !== 'undefined' ? supabase : null);

    // ユーザー情報の取得と表示、および本日回答済みチェック
    if (supabaseClient) {
        try {
            const { data: { user } } = await supabaseClient.auth.getUser();
            if (user) {
                currentUser = user;
                const nameBox = document.getElementById('userProfileName');
                if (nameBox) {
                    const displayName = await getUserDisplayName(currentUser.id);
                    nameBox.textContent = `なまえ： ${displayName} さん`;
                }

                // ★ 本日すでに送信済みかチェック
                const todayScore = await checkTodaySubmitted(currentUser.id, 1);
                if (todayScore) {
                    showAlreadySubmittedView(todayScore);
                    return; // 提出済みの場合はこれ以降の読み込みを行わない
                }
            }
        } catch (err) {
            console.error('ユーザー認証・初期チェックエラー:', err);
        }
    }

    // 答え合わせボタンのイベント設定
    document.getElementById('checkBtn')?.addEventListener('click', checkAnswersAndSave);

    // 今日の問題をDBから読み込み
    await loadTodayProblems();
});

// ====================================================
// 2. 本日の送信履歴を取得（重複チェック）
// ====================================================
async function checkTodaySubmitted(userId, grade) {
    const supabaseClient = typeof clientSupabase !== 'undefined' ? clientSupabase : (typeof supabase !== 'undefined' ? supabase : null);
    if (!supabaseClient) return null;

    try {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const todayStr = `${year}-${month}-${day}`;

        // 生成列 created_date と比較して重複チェック
        const { data, error } = await supabaseClient
            .from('learning_scores_test')
            .select('*')
            .eq('user_id', userId)
            .eq('grade', grade)
            .eq('subject', 'math')
            .eq('created_date', todayStr)
            .maybeSingle();

        if (error) {
            console.error('履歴チェックエラー:', error);
            return null;
        }
        return data;
    } catch (e) {
        console.error('履歴チェック例外エラー:', e);
        return null;
    }
}

// ====================================================
// 3. 回答済みの場合の画面表示制御（パターンB・強力適用版）
// ====================================================
function showAlreadySubmittedView(scoreData) {
    const calcGrid = document.getElementById('calcGrid');
    const wordProblemArea = document.getElementById('wordProblemArea');
    const checkBtn = document.getElementById('checkBtn');
    const scoreBox = document.getElementById('scoreBox');

    // セクションタイトルを強制非表示
    const sectionTitles = document.querySelectorAll('.section-title');
    sectionTitles.forEach(title => {
        title.style.setProperty('display', 'none', 'important');
    });

    // 計算問題・文章問題のエリアおよびボタンを強制非表示
    if (calcGrid) {
        calcGrid.classList.add('hidden');
        calcGrid.style.setProperty('display', 'none', 'important');
    }
    if (wordProblemArea) {
        wordProblemArea.classList.add('hidden');
        wordProblemArea.style.setProperty('display', 'none', 'important');
    }
    if (checkBtn) {
        checkBtn.style.setProperty('display', 'none', 'important');
    }

    // 結果メッセージエリアのみを表示
    if (scoreBox) {
        scoreBox.classList.remove('hidden');
        scoreBox.style.setProperty('display', 'block', 'important');
        scoreBox.innerHTML = `
            <h2>💮 きょうの チャレンジは すでに かんりょう しています！</h2>
            <p style="font-size: 1.25rem; font-weight: bold; margin: 15px 0; color: #2b6cb0;">
                てんすう： ${scoreData.score} てん
            </p>
            <p style="color: #4a5568; margin-top: 10px;">
                また あした ちょうせんしてね！ 💮
            </p>
        `;
    }
}

// ====================================================
// 4. DBから「今日の問題」を取得
// ====================================================
async function loadTodayProblems() {
    try {
        const supabaseClient = typeof clientSupabase !== 'undefined' ? clientSupabase : (typeof supabase !== 'undefined' ? supabase : null);
        if (!supabaseClient) return;

        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const todayStr = `${year}-${month}-${day}`;

        const { data, error } = await supabaseClient
            .from('daily_problems')
            .select('*')
            .eq('target_date', todayStr)
            .eq('grade', 1)
            .eq('subject', 'math')
            .maybeSingle();

        if (error) throw error;

        if (data) {
            if (data.problems && data.problems.length > 0) {
                currentProblems = data.problems;
            } else {
                currentProblems = getFallbackProblems();
            }

            if (data.word_problems && data.word_problems.length > 0) {
                currentWordProblems = data.word_problems;
            } else {
                currentWordProblems = getFallbackWordProblems();
            }
        } else {
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
// 5. 計算問題の描画
// ====================================================
function renderProblems(problems) {
    const calcGrid = document.getElementById('calcGrid');
    if (!calcGrid) return;

    calcGrid.innerHTML = ''; 

    problems.forEach((p, index) => {
        const div = document.createElement('div');
        div.className = 'calc-item';

        div.innerHTML = `
            <div>
                <span class="problem-index">(${index + 1})</span>
                <span>${p.p1} ${p.operator} ${p.p2} ＝</span>
            </div>
            <input type="number" id="answer_${index}" class="input-answer-num" pattern="\\d*">
        `;
        calcGrid.appendChild(div);
    });
}

// ====================================================
// 6. 文章問題の描画
// ====================================================
/**
 * 文章問題の描画
 */
function renderWordProblems(wordProblems) {
    const wordProblemArea = document.getElementById('wordProblemArea');
    if (!wordProblemArea) return;

    wordProblemArea.innerHTML = '';

    wordProblems.forEach((wp, index) => {
        const div = document.createElement('div');
        div.className = 'word-card';

        div.innerHTML = `
            <div class="word-text">
                <span class="problem-index">(${index + 1})</span>
                ${wp.text}
            </div>
            <div class="word-formula-group">
                <div class="equation-input-group">
                    しき：<input type="text" id="wp_eq_${index}" class="input-eq-text" inputmode="numeric">
                    <div class="symbol-btn-group">
                        <button type="button" class="btn-symbol" onclick="insertSymbol('wp_eq_${index}', '+')">＋</button>
                        <button type="button" class="btn-symbol" onclick="insertSymbol('wp_eq_${index}', '-')">－</button>
                    </div>
                </div>
                <div>
                    こたえ：<input type="number" id="wp_ans_${index}" class="input-answer-num">
                </div>
            </div>
        `;
        wordProblemArea.appendChild(div);
    });
}

/**
 * 入力欄のカーソル位置（または末尾）に指定の記号を挿入する
 */
function insertSymbol(inputId, symbol) {
    const input = document.getElementById(inputId);
    if (!input) return;

    const start = input.selectionStart ?? input.value.length;
    const end = input.selectionEnd ?? input.value.length;
    const text = input.value;

    input.value = text.slice(0, start) + symbol + text.slice(end);

    const newPos = start + symbol.length;
    input.setSelectionRange(newPos, newPos);
    input.focus();
}

// ====================================================
// 7. 答え合わせ ＆ 成績保存
// ====================================================
async function checkAnswersAndSave() {
    const checkBtn = document.getElementById('checkBtn');
    if (checkBtn) checkBtn.disabled = true; // 連打防止

    let correctCount = 0;
    const totalCount = currentProblems.length + currentWordProblems.length;

    if (totalCount === 0) return;

    // 計算問題の答え合わせ
    currentProblems.forEach((problem, index) => {
        const inputEl = document.getElementById(`answer_${index}`);
        if (!inputEl) return;
        inputEl.disabled = true;
        
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

    // 文章問題の答え合わせ
    currentWordProblems.forEach((wp, index) => {
        const ansInput = document.getElementById(`wp_ans_${index}`);
        const eqInput = document.getElementById(`wp_eq_${index}`);
        if (ansInput) ansInput.disabled = true;
        if (eqInput) eqInput.disabled = true;
        
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
        scoreBox.innerHTML = `💮 てんすう： ${score} てん (${totalCount}もんちゅう ${correctCount}もん せいかい) 💮`;
    }

    const supabaseClient = typeof clientSupabase !== 'undefined' ? clientSupabase : (typeof supabase !== 'undefined' ? supabase : null);
    if (currentUser && supabaseClient) {
        try {
            await supabaseClient
                .from('learning_scores_test')
                .insert([{
                    user_id: currentUser.id,
                    grade: 1,
                    subject: 'math',
                    score: score,
                    total_questions: totalCount
                }]);
        } catch (e) {
            console.error('成績保存エラー:', e);
        }
    }
}

// ====================================================
// 8. 予備問題
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