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

    // 今日の問題を取得 (Grade = 2)
    currentProblems = await fetchDailyProblems(2);

    if (!currentProblems || currentProblems.length === 0) {
        // DBから取得できない場合の予備問題（2年生用）
        currentProblems = getFallbackProblems();
    }

    // 問題の描画とタイマー開始
    renderProblems(currentProblems);
    loadingMsg.classList.add('hidden');
    challengeForm.classList.remove('hidden');
    timerDisplay.classList.remove('hidden');
    startTimer(60);

    // 採点＆提出処理
    challengeForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        submitForm();
    });

    /**
     * 採点・保存実行関数
     */
    async function submitForm() {
        stopTimer();
        
        // 経過時間（秒）の計算
        if (startTimestamp) {
            elapsedTime = Math.floor((Date.now() - startTimestamp) / 1000);
        }

        submitBtn.disabled = true;
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
        resultScore.textContent = `${calculatedScore} てん！`;
        resultTime.textContent = `かかった じかん: ${elapsedTime} びょう`;

        if (calculatedScore === 100) {
            resultMessage.textContent = '🎉 すごい！ まんてんだよ！ きろくを ほぞんしました！';
        } else {
            resultMessage.textContent = '👍 よくがんばったね！ きろくを ほぞんしました！';
        }

        // Supabaseへスコア保存
        await saveLearningScore(2, calculatedScore, elapsedTime);

        resultContainer.classList.remove('hidden');
    }

    /**
     * タイマー開始関数
     * @param {number} durationSeconds - 制限時間（デフォルト60秒）
     */
    function startTimer(durationSeconds = 60) {
        stopTimer();

        startTimestamp = Date.now();
        const endTime = startTimestamp + durationSeconds * 1000;

        if (timerSeconds) {
            timerSeconds.textContent = durationSeconds;
        }

        timerInterval = setInterval(() => {
            const now = Date.now();
            const timeLeft = Math.max(0, Math.ceil((endTime - now) / 1000));

            if (timerSeconds) {
                timerSeconds.textContent = timeLeft;
            }

            if (timeLeft <= 0) {
                stopTimer();
                handleTimeUp();
            }
        }, 250);
    }

    /**
     * タイマー停止関数
     */
    function stopTimer() {
        if (timerInterval !== null) {
            clearInterval(timerInterval);
            timerInterval = null;
        }
    }

    /**
     * タイムアップ時の処理
     */
    function handleTimeUp() {
        alert('じかんきれです！ さいてんします。');
        submitForm();
    }

    /**
     * DBから本日の問題を取得
     */
    async function fetchDailyProblems(grade) {
        if (typeof clientSupabase === 'undefined' && typeof supabase === 'undefined') return null;
        const supabaseClient = typeof clientSupabase !== 'undefined' ? clientSupabase : supabase;

        try {
            const todayStr = new Date().toISOString().split('T')[0];
            const { data, error } = await supabaseClient
                .from('daily_problems')
                .select('*')
                .eq('grade', grade)
                .eq('target_date', todayStr)
                .single();

            if (error || !data) return null;
            return data.problems_json;
        } catch (e) {
            console.error('問題取得エラー:', e);
            return null;
        }
    }

    /**
     * DB未接続・データ不在時の予備問題
     */
    function getFallbackProblems() {
        return [
            { text: '6 × 4 = ', answer: 24 },
            { text: '7 × 8 = ', answer: 56 },
            { text: '45 + 28 = ', answer: 73 },
            { text: '82 - 35 = ', answer: 47 },
            { text: '9 × 3 = ', answer: 27 }
        ];
    }

    /**
     * 問題一覧描画
     */
    function renderProblems(problems) {
        problemsContainer.innerHTML = '';
        problems.forEach((p, index) => {
            const div = document.createElement('div');
            div.className = 'problem-item';
            div.innerHTML = `
                <span class="problem-num">(${index + 1})</span>
                <label for="ans-${index}" class="problem-text">${p.text}</label>
                <input type="text" id="ans-${index}" class="answer-input" autocomplete="off" inputmode="numeric">
                <span id="feedback-${index}" class="feedback-text"></span>
            `;
            problemsContainer.appendChild(div);
        });
    }

    /**
     * スコア保存処理（テーブル定義適合版）
     */
    async function saveLearningScore(grade, score, timeTaken) {
        if (typeof clientSupabase === 'undefined' && typeof supabase === 'undefined') return;
        const supabaseClient = typeof clientSupabase !== 'undefined' ? clientSupabase : supabase;

        try {
            const userResp = await supabaseClient.auth.getUser();
            const userId = userResp?.data?.user?.id;
            const totalQuestions = currentProblems.length;

            const { data, error } = await supabaseClient
                .from('learning_scores_test')
                .insert([
                    {
                        user_id: userId,
                        grade: Number(grade),
                        subject: 'math',                         // 必須 (NOT NULL)
                        score: Number(score),
                        total_questions: Number(totalQuestions)  // 必須 (NOT NULL)
                    }
                ]);

            if (error) {
                console.error('Supabase保存エラー:', error.message, error.details);
            } else {
                console.log('スコアを正常に保存しました！');
            }
        } catch (e) {
            console.error('スコア保存例外エラー:', e);
        }
    }
    /**
     * 入力正規化 (全角数字・スペース処理)
     */
    function normalizeAnswer(str) {
        if (!str) return '';
        return str
            .replace(/[０-９]/g, s => String.fromCharCode(s.charCodeAt(0) - 0xfee0))
            .replace(/\s+/g, '')
            .trim();
    }
});