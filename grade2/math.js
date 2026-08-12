document.addEventListener('DOMContentLoaded', async () => {
    const loadingMsg = document.getElementById('loading-msg');
    const challengeForm = document.getElementById('challenge-form');
    const problemsContainer = document.getElementById('problems-container');
    const timerDisplay = document.getElementById('timer-display');
    const timerSeconds = document.getElementById('timer-seconds');
    const resultContainer = document.getElementById('result-container');
    const resultScore = document.getElementById('result-score');
    const resultTime = document.getElementById('result-time');
    const resultMessage = document.getElementById('result-message');
    const submitBtn = document.getElementById('submit-btn');

    let currentProblems = [];
    let startTimestamp = null;
    let elapsedTime = 0;
    let timerInterval = null;
    let currentUser = null;

    // 1. ユーザー情報の取得
    currentUser = await getCurrentUser();
    if (currentUser) {
        const nameBox = document.getElementById('userProfileName');
        if (nameBox) {
            const displayName = await getUserDisplayName(currentUser.id);
            nameBox.textContent = `なまえ： ${displayName} さん`;
        }

        // 2. ★ 本日すでに挑戦済みかチェック
        const todayScore = await checkTodaySubmitted(currentUser.id, 2);
        if (todayScore) {
            // すでに挑戦済みの場合はフォームを隠して結果を表示
            if (loadingMsg) loadingMsg.classList.add('hidden');
            showAlreadySubmittedView(todayScore);
            return; // これ以降の挑戦処理を実行しない
        }
    }

    // 3. 今日の問題を取得 (Grade = 2)
    currentProblems = await fetchDailyProblems(2);

    if (!currentProblems || currentProblems.length === 0) {
        currentProblems = getFallbackProblems();
    }

    // 問題の描画とタイマー開始
    renderProblems(currentProblems);
    if (loadingMsg) loadingMsg.classList.add('hidden');
    if (challengeForm) challengeForm.classList.remove('hidden');
    if (timerDisplay) timerDisplay.classList.remove('hidden');
    startTimer(60);

    // 採点＆提出処理
    challengeForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        // ★ 二重送信防止（ボタン連打対策）
        if (submitBtn) submitBtn.disabled = true;
        
        submitForm();
    });

    /**
     * 採点・保存実行関数
     */
    async function submitForm() {
        stopTimer();
        
        if (startTimestamp) {
            elapsedTime = Math.floor((Date.now() - startTimestamp) / 1000);
        }

        let score = 0;

        currentProblems.forEach((problem, index) => {
            const input = document.getElementById(`ans-${index}`);
            if (input) input.disabled = true;

            const userVal = input ? normalizeAnswer(input.value) : '';
            const isCorrect = (userVal === problem.answer.toString());

            if (isCorrect) score++;

            const feedbackEl = document.getElementById(`feedback-${index}`);
            if (feedbackEl) {
                if (isCorrect) {
                    feedbackEl.innerHTML = '<span class="correct">⭕ せいかい！</span>';
                } else {
                    feedbackEl.innerHTML = `<span class="incorrect">❌ ざんねん！ こたえ: ${problem.answer}</span>`;
                }
            }
        });

        // スコア結果の計算と表示
        const calculatedScore = Math.round(score * (100 / currentProblems.length));
        if (resultScore) resultScore.textContent = `💮 ${calculatedScore} てん！`;
        if (resultTime) resultTime.textContent = `かかった じかん: ${elapsedTime} びょう`;

        if (resultMessage) {
            if (calculatedScore === 100) {
                resultMessage.textContent = '🎉 すごい！ まんてんだよ！ きろくを ほぞんしました！';
            } else {
                resultMessage.textContent = '👍 よくがんばったね！ きろくを ほぞんしました！';
            }
        }

        // Supabaseへスコア保存
        await saveLearningScore(2, calculatedScore, elapsedTime);

        if (resultContainer) resultContainer.classList.remove('hidden');
    }

    /**
     * ★ 本日の送信履歴を取得する関数
     */
    async function checkTodaySubmitted(userId, grade) {
        const supabaseClient = typeof clientSupabase !== 'undefined' ? clientSupabase : (typeof supabase !== 'undefined' ? supabase : null);
        if (!supabaseClient) return null;

        try {
            const now = new Date();
            const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
            const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999).toISOString();

            const { data, error } = await supabaseClient
                .from('learning_scores_test')
                .select('*')
                .eq('user_id', userId)
                .eq('grade', grade)
                .eq('subject', 'math')
                .gte('created_at', startOfDay)
                .lte('created_at', endOfDay)
                .maybeSingle();

            if (error) return null;
            return data;
        } catch (e) {
            console.error('履歴チェックエラー:', e);
            return null;
        }
    }

    /**
     * ★ すでに挑戦済みの場合の画面表示制御
     */
    function showAlreadySubmittedView(scoreData) {
        if (challengeForm) challengeForm.classList.add('hidden');
        if (timerDisplay) timerDisplay.classList.add('hidden');

        if (resultContainer) {
            resultContainer.classList.remove('hidden');
            if (resultScore) resultScore.textContent = `💮 きょうのスコア: ${scoreData.score} てん！`;
            if (resultTime) resultTime.textContent = scoreData.time_taken ? `かかった じかん: ${scoreData.time_taken} びょう` : '';
            if (resultMessage) resultMessage.textContent = 'きょうの チャレンジは すでに 完了（かんりょう）しています。また あした ちょうせんしてね！';
        }
    }

    // --- (タイマー関連・fetchDailyProblems・renderProblems・saveLearningScore などは既存通り) ---