// グローバル変数（画面内で保持する変数）
let currentProblems = []; // DBから取得した今日の問題リスト
let currentUser = null;    // ログイン中のユーザー情報

// ====================================================
// 1. 初期化処理（ページ読み込み時）
// ====================================================
document.addEventListener('DOMContentLoaded', async () => {
    // ログイン中のユーザー情報を取得
    currentUser = await getCurrentUser();

    // 答え合わせボタンのイベントリスナー設定
    document.getElementById('checkBtn')?.addEventListener('click', checkAnswersAndSave);

    // 今日の問題をDBから読み込んで表示
    await loadTodayProblems();
});

// ====================================================
// 2. DBから「今日の問題」を取得して表示する処理
// ====================================================
async function loadTodayProblems() {
    const printContainer = document.getElementById('printContainer');
    if (!printContainer) return;

    try {
        // 今日の日付文字列を取得 (YYYY-MM-DD)
        const todayStr = new Date().toISOString().split('T')[0];

        // Supabaseの daily_problems テーブルから今日の問題を取得
        const { data, error } = await clientSupabase
            .from('daily_problems')
            .select('problems')
            .eq('target_date', todayStr)
            .eq('grade', 1)
            .eq('subject', 'math')
            .maybeSingle();

        if (error) throw error;

        // 問題が存在する場合はそれを使用、まだ作られていない場合はデフォルト問題を使用
        if (data && data.problems && data.problems.length > 0) {
            currentProblems = data.problems;
        } else {
            console.warn('本日の問題がDBにありません。予備の問題を表示します。');
            currentProblems = getFallbackProblems();
        }

        // 画面に問題を描画
        renderProblems(currentProblems);

    } catch (err) {
        console.error('問題の読み込みエラー:', err);
        printContainer.innerHTML = '<p style="color: red; text-align: center;">問題の読み込みに失敗しました。</p>';
    }
}

// ====================================================
// 3. 問題を画面（HTML）に描画する処理
// ====================================================
function renderProblems(problems) {
    const printContainer = document.getElementById('printContainer');
    if (!printContainer) return;

    // 問題のHTMLを作成
    const html = problems.map((item, index) => {
        return `
            <div style="display: flex; align-items: center; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid #e2e8f0; font-size: 1.3rem; font-weight: bold;">
                <div>
                    <span style="color: #718096; font-size: 1rem; margin-right: 10px;">(${index + 1})</span>
                    <span>${item.p1} ${item.operator} ${item.p2} =</span>
                </div>
                <input type="number" id="answer_${index}" class="answer-input" style="width: 70px; height: 40px; font-size: 1.3rem; text-align: center; border: 2px solid #cbd5e0; border-radius: 8px;" pattern="\\d*">
            </div>
        `;
    }).join('');

    printContainer.innerHTML = html;
}

// ====================================================
// 4. 答え合わせ & 成績の保存処理
// ====================================================
async function checkAnswersAndSave() {
    if (!currentProblems || currentProblems.length === 0) return;

    let correctCount = 0;
    const totalCount = currentProblems.length;

    // 各問題の正誤判定
    currentProblems.forEach((problem, index) => {
        const inputEl = document.getElementById(`answer_${index}`);
        const userAnswer = parseInt(inputEl.value, 10);

        if (!isNaN(userAnswer) && userAnswer === problem.answer) {
            correctCount++;
            inputEl.style.borderColor = '#48bb78'; // 正解なら緑色の枠
            inputEl.style.backgroundColor = '#f0fff4';
        } else {
            inputEl.style.borderColor = '#e53e3e'; // 不正解なら赤色の枠
            inputEl.style.backgroundColor = '#fff5f5';
        }
    });

    // 点数計算 (100点満点換算)
    const score = Math.round((correctCount / totalCount) * 100);

    // 採点結果のメッセージを表示
    const resultMsg = `【採点結果】\n${totalCount}問中 ${correctCount}問 正解！\n点数: ${score}点`;
    alert(resultMsg);

    // ログイン中の場合、成績をSupabaseに保存
    if (currentUser) {
        try {
            const { error } = await clientSupabase
                .from('learning_scores_test')
                .insert([{
                    user_id: currentUser.id,
                    grade: 1,
                    subject: 'math',
                    score: score
                }]);

            if (error) console.error('成績の保存に失敗しました:', error);
        } catch (e) {
            console.error('成績保存時の例外エラー:', e);
        }
    }
}

// ====================================================
// 5. 万が一のためのフォールバック問題（予備）
// ====================================================
function getFallbackProblems() {
    return [
        { id: 1, p1: 2, p2: 3, operator: '+', answer: 5 },
        { id: 2, p1: 7, p2: 4, operator: '-', answer: 3 },
        { id: 3, p1: 5, p2: 5, operator: '+', answer: 10 },
        { id: 4, p1: 9, p2: 1, operator: '-', answer: 8 },
        { id: 5, p1: 4, p2: 2, operator: '+', answer: 6 }
    ];
}