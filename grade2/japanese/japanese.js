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

    const supabaseClient = typeof clientSupabase !== 'undefined' ? clientSupabase : (typeof supabase !== 'undefined' ? supabase : null);

    // 1. ユーザー確認 & 本日回答済みチェック
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

                const todayScore = await checkTodaySubmitted(currentUser.id, 2);
                if (todayScore) {
                    showAlreadySubmittedView(todayScore);
                    return;
                }
            }
        } catch (err) {
            console.error('初期チェックエラー:', err);
        }
    }

    // 2. 今日の国語問題を取得
    currentProblems = await fetchDailyProblems(2);
    if (!currentProblems || currentProblems.length === 0) {
        currentProblems = getFallbackProblems();
    }

    // 3. 描画とタイマー開始
    renderProblems(currentProblems);
    if (loadingMsg) loadingMsg.classList.add('hidden');
    if (challengeForm) challengeForm.classList.remove('hidden');
    if (timerDisplay) timerDisplay.classList.remove('hidden');
    startTimer(90); // 国語用に90秒に設定

    // 4. 提出イベント
    challengeForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (submitBtn) submitBtn.disabled = true;
        submitForm();
    });

    function renderProblems(problems) {
        if (!problemsContainer) return;
        problemsContainer.innerHTML = '';

        problems.forEach((problem, index) => {
            const problemDiv = document.createElement('div');
            problemDiv.className = 'problem-item';
            problemDiv.innerHTML = `
                <div class="problem-statement">
                    <span class="problem-num">（${index + 1}）</span>
                    <span class="question-text">${problem.text}</span>
                    <input type="text" id="ans-${index}" class="answer-input" autocomplete="off" required>
                </div>
                <div id="feedback-${index}" class="feedback-area"></div>
            `;
            problemsContainer.appendChild(problemDiv);
        });
    }

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
                    feedbackEl.innerHTML = `<span class="incorrect">❌ こたえ: ${problem.answer}</span>`;
                }
            }
        });

        const calculatedScore = Math.round(score * (100 / currentProblems.length));
        if (resultScore) resultScore.textContent = `💮 ${calculatedScore} てん！`;
        if (resultTime) resultTime.textContent = `かかった じかん: ${elapsedTime} びょう`;
        if (resultMessage) {
            resultMessage.textContent = calculatedScore === 100 ? '🎉 すごい！ まんてんだよ！' : '👍 よくがんばったね！';
        }

        await saveLearningScore(2, calculatedScore, elapsedTime);
        if (resultContainer) resultContainer.classList.remove('hidden');
    }

    async function checkTodaySubmitted(userId, grade) {
        if (!supabaseClient) return null;
        try {
            const todayStr = new Date().toISOString().split('T')[0];
            const { data } = await supabaseClient
                .from('learning_scores_test')
                .select('*')
                .eq('user_id', userId)
                .eq('grade', grade)
                .eq('subject', 'japanese')
                .eq('created_date', todayStr)
                .maybeSingle();
            return data;
        } catch (e) {
            return null;
        }
    }

    function showAlreadySubmittedView(scoreData) {
        ['loading-msg', 'timer-display', 'challenge-form'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.style.setProperty('display', 'none', 'important');
        });

        if (resultContainer) {
            resultContainer.classList.remove('hidden');
            resultContainer.style.setProperty('display', 'block', 'important');
            if (resultScore) resultScore.textContent = `💮 きょうのスコア: ${scoreData.score} てん！`;
            if (resultTime) resultTime.textContent = scoreData.time_taken ? `かかった じかん: ${scoreData.time_taken} びょう` : '';
            if (resultMessage) resultMessage.textContent = 'きょうの チャレンジは すでに かんりょう しています。';
        }
    }

    function startTimer(durationSeconds) {
        stopTimer();
        startTimestamp = Date.now();
        const endTime = startTimestamp + durationSeconds * 1000;

        timerInterval = setInterval(() => {
            const timeLeft = Math.max(0, Math.ceil((endTime - Date.now()) / 1000));
            if (timerSeconds) timerSeconds.textContent = timeLeft;
            if (timeLeft <= 0) {
                stopTimer();
                alert('じかんきれです！');
                submitForm();
            }
        }, 250);
    }

    function stopTimer() {
        if (timerInterval) clearInterval(timerInterval);
    }

    async function fetchDailyProblems(grade) {
        if (!supabaseClient) return null;
        try {
            const todayStr = new Date().toISOString().split('T')[0];
            const { data } = await supabaseClient
                .from('daily_problems')
                .select('*')
                .eq('grade', grade)
                .eq('subject', 'japanese')
                .eq('target_date', todayStr)
                .maybeSingle();
            return data ? (data.problems || data.problems_json) : null;
        } catch (e) {
            return null;
        }
    }

    function getFallbackProblems() {
        return [
            { text: '「新しん」の かんじの よみかた（ひらがな）：', answer: 'あたら' },
            { text: '「春」の かんじの よみかた（ひらがな）：', answer: 'はる' },
            { text: '「話す」の かんじの よみかた（ひらがな）：', answer: 'はな' },
            { text: '「犬」の 反対（はんたい）のことば：', answer: 'ねこ' },
            { text: '「高い」の 反対（はんたい）のことば：', answer: 'ひくい' }
        ];
    }

    async function saveLearningScore(grade, score, timeTaken) {
        if (!supabaseClient) return;
        const userResp = await supabaseClient.auth.getUser();
        const userId = userResp?.data?.user?.id;
        await supabaseClient.from('learning_scores_test').insert([{
            user_id: userId,
            grade: Number(grade),
            subject: 'japanese',
            score: Number(score),
            total_questions: currentProblems.length
        }]);
    }

    function normalizeAnswer(str) {
        return (str || '').trim().replace(/\s+/g, '');
    }
});