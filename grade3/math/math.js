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

    // Supabaseクライアントの取得
    const supabaseClient = typeof clientSupabase !== 'undefined' ? clientSupabase : (typeof supabase !== 'undefined' ? supabase : null);

    // 1. ユーザー情報の取得と本日回答済みチェック（学年: 3）
    if (supabaseClient) {
        try {
            const { data: { user } } = await supabaseClient.auth.getUser();
            if (user) {
                currentUser = user;
                console.log('ログインユーザーID:', currentUser.id);

                const nameBox = document.getElementById('userProfileName');
                if (nameBox) {
                    const displayName = await getUserDisplayName(currentUser.id);
                    nameBox.textContent = `名前： ${displayName} さん`;
                }

                // 本日すでに回答済みかチェック（学年: 3）
                const todayScore = await checkTodaySubmitted(currentUser.id, 3);
                if (todayScore) {
                    console.log('本日提出済みのデータを発見:', todayScore);
                    showAlreadySubmittedView(todayScore);
                    return;
                }
            } else {
                console.log('ユーザーがログインしていません');
            }
        } catch (err) {
            console.error('ユーザー認証・初期チェックエラー:', err);
        }
    }

    // 2. 今日の問題を取得 (Grade = 3)
    currentProblems = await fetchDailyProblems(3);

    if (!currentProblems || currentProblems.length === 0) {
        currentProblems = getFallbackProblems();
    }

    // 3. 問題の描画とタイマー開始
    renderProblems(currentProblems);
    if (loadingMsg) loadingMsg.classList.add('hidden');
    if (challengeForm) challengeForm.classList.remove('hidden');
    if (timerDisplay) timerDisplay.classList.remove('hidden');
    startTimer(90); // 3年生は制限時間を90秒に設定

    // 4. 採点＆提出イベント設定
    challengeForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (submitBtn) submitBtn.disabled = true;
        submitForm();
    });

    /**
     * 問題一覧を描画する関数
     */
    function renderProblems(problems) {
        if (!problemsContainer) return;
        problemsContainer.innerHTML = '';

        problems.forEach((problem, index) => {
            let questionText = '';
            if (problem.text) {
                questionText = problem.text;
            } else if (problem.question) {
                questionText = problem.question;
            } else if (problem.p1 !== undefined && problem.p2 !== undefined) {
                questionText = `${problem.p1} ${problem.operator || '×'} ${problem.p2} =`;
            }

            const problemDiv = document.createElement('div');
            problemDiv.className = 'problem-item';
            problemDiv.innerHTML = `
                <div class="problem-statement">
                    <span class="problem-num">（${index + 1}）</span>
                    <span class="question-text">${questionText}</span>
                    <input type="text" id="ans-${index}" class="answer-input" autocomplete="off" inputmode="numeric" required>
                </div>
                <div id="feedback-${index}" class="feedback-area"></div>
            `;
            problemsContainer.appendChild(problemDiv);
        });
    }

    /**
     * 採点・保存実行関数
     */
    async function submitForm() {
        stopTimer();
        
        if (startTimestamp) {
            elapsedTime = Math.floor((Date.now() - startTimestamp) / 1000);
        }

        if (submitBtn) submitBtn.disabled = true;
        let score = 0;

        currentProblems.forEach((problem, index) => {
            const input = document.getElementById(`ans-${index}`);
            if (input) input.disabled = true;

            const userVal = input ? normalizeAnswer(input.value) : '';
            const isCorrect = (userVal === normalizeAnswer(problem.answer.toString()));

            if (isCorrect) score++;

            const feedbackEl = document.getElementById(`feedback-${index}`);
            if (feedbackEl) {
                if (isCorrect) {
                    feedbackEl.innerHTML = '<span class="correct">⭕ 正解！</span>';
                } else {
                    feedbackEl.innerHTML = `<span class="incorrect">❌ 残念！ 答え: ${problem.answer}</span>`;
                }
            }
        });

        const calculatedScore = Math.round(score * (100 / currentProblems.length));
        if (resultScore) resultScore.textContent = `💮 ${calculatedScore} 点！`;
        if (resultTime) resultTime.textContent = `かかった時間: ${elapsedTime} 秒`;

        if (resultMessage) {
            if (calculatedScore === 100) {
                resultMessage.textContent = '🎉 素晴らしい！ 満点です！ 記録を保存しました！';
            } else {
                resultMessage.textContent = '👍 よくがんばりました！ 記録を保存しました！';
            }
        }

        // Supabaseへスコア保存（学年: 3）
        await saveLearningScore(3, calculatedScore, elapsedTime);

        if (resultContainer) resultContainer.classList.remove('hidden');
    }

    /**
     * 本日の送信履歴を取得
     */
    async function checkTodaySubmitted(userId, grade) {
        if (!supabaseClient) return null;

        try {
            const now = new Date();
            const year = now.getFullYear();
            const month = String(now.getMonth() + 1).padStart(2, '0');
            const day = String(now.getDate()).padStart(2, '0');
            const todayStr = `${year}-${month}-${day}`;

            const { data, error } = await supabaseClient
                .from(DB_TABLES.LEARNING_SCORES)
                .select('*')
                .eq('user_id', userId)
                .eq('grade', grade)
                .eq('subject', 'math')
                .eq('created_date', todayStr)
                .maybeSingle();

            if (error) {
                console.error('履歴取得DBエラー:', error);
                return null;
            }

            return data;
        } catch (e) {
            console.error('履歴チェック例外:', e);
            return null;
        }
    }

    /**
     * 回答済みの場合の画面表示制御
     */
    function showAlreadySubmittedView(scoreData) {
        const idsToHide = ['loading-msg', 'timer-display', 'challenge-form', 'problems-container'];
        idsToHide.forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.classList.add('hidden');
                el.style.setProperty('display', 'none', 'important');
            }
        });

        const sectionTitles = document.querySelectorAll('.section-title');
        sectionTitles.forEach(el => {
            el.style.setProperty('display', 'none', 'important');
        });

        if (resultContainer) {
            resultContainer.classList.remove('hidden');
            resultContainer.style.setProperty('display', 'block', 'important');

            if (resultScore) {
                resultScore.textContent = `💮 今日のスコア: ${scoreData.score} 点！`;
            }
            if (resultTime) {
                resultTime.textContent = scoreData.time_taken ? `かかった時間: ${scoreData.time_taken} 秒` : '';
            }
            if (resultMessage) {
                resultMessage.textContent = '今日のチャレンジは すでに完了しています。また明日挑戦してね！ 💮';
            }
        }
    }

    function startTimer(durationSeconds = 90) {
        stopTimer();
        startTimestamp = Date.now();
        const endTime = startTimestamp + durationSeconds * 1000;

        if (timerSeconds) timerSeconds.textContent = durationSeconds;

        timerInterval = setInterval(() => {
            const now = Date.now();
            const timeLeft = Math.max(0, Math.ceil((endTime - now) / 1000));

            if (timerSeconds) timerSeconds.textContent = timeLeft;

            if (timeLeft <= 0) {
                stopTimer();
                handleTimeUp();
            }
        }, 250);
    }

    function stopTimer() {
        if (timerInterval !== null) {
            clearInterval(timerInterval);
            timerInterval = null;
        }
    }

    function handleTimeUp() {
        alert('時間切れです！ 採点します。');
        submitForm();
    }

    /**
     * DBから本日の問題を取得
     */
    async function fetchDailyProblems(grade) {
        if (!supabaseClient) return null;

        try {
            const now = new Date();
            const year = now.getFullYear();
            const month = String(now.getMonth() + 1).padStart(2, '0');
            const day = String(now.getDate()).padStart(2, '0');
            const todayStr = `${year}-${month}-${day}`;

            const { data, error } = await supabaseClient
                .from('daily_problems')
                .select('*')
                .eq('grade', grade)
                .eq('subject', 'math')
                .eq('target_date', todayStr)
                .maybeSingle();

            if (error || !data) return null;
            return data.problems || data.problems_json;
        } catch (e) {
            console.error('問題取得エラー:', e);
            return null;
        }
    }

    // 3年生向けのフォールバック問題（あまりのある割り算、かけ算筆算等）
    function getFallbackProblems() {
        return [
            { text: '35 ÷ 7 = ', answer: 5 },
            { text: '48 ÷ 6 = ', answer: 8 },
            { text: '17 ÷ 3 = ', answer: '5あまり2' },
            { text: '29 ÷ 5 = ', answer: '5あまり4' },
            { text: '23 × 3 = ', answer: 69 },
            { text: '41 × 2 = ', answer: 82 },
            { text: '125 + 342 = ', answer: 467 },
            { text: '580 - 240 = ', answer: 340 },
            { text: '0.4 + 0.5 = ', answer: 0.9 },
            { text: '1 - 0.3 = ', answer: 0.7 }
        ];
    }

    async function saveLearningScore(grade, score, timeTaken) {
        if (!supabaseClient) return;

        try {
            const userResp = await supabaseClient.auth.getUser();
            const userId = userResp?.data?.user?.id;
            const totalQuestions = currentProblems.length;

            const { data, error } = await supabaseClient
                .from(DB_TABLES.LEARNING_SCORES)
                .insert([
                    {
                        user_id: userId,
                        grade: Number(grade),
                        subject: 'math',
                        score: Number(score),
                        time_taken: Number(timeTaken),
                        total_questions: Number(totalQuestions)
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

    function normalizeAnswer(str) {
        if (!str) return '';
        return str
            .replace(/[０-９]/g, s => String.fromCharCode(s.charCodeAt(0) - 0xfee0))
            .replace(/\s+/g, '')
            .replace(/余り|あまり/g, 'あまり')
            .trim();
    }
});