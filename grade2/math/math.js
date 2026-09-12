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

    // 1. ユーザー情報の取得と本日回答済みチェック
    if (supabaseClient) {
        try {
            const { data: { user } } = await supabaseClient.auth.getUser();
            if (user) {
                currentUser = user;
                console.log('ログインユーザーID:', currentUser.id);

                const nameBox = document.getElementById('userProfileName');
                if (nameBox) {
                    const displayName = await getUserDisplayName(currentUser.id);
                    nameBox.textContent = `なまえ： ${displayName} さん`;
                }

                // 本日すでに回答済みかチェック
                const todayScore = await checkTodaySubmitted(currentUser.id, 2);
                if (todayScore) {
                    console.log('本日提出済みのデータを発見:', todayScore);
                    showAlreadySubmittedView(todayScore);
                    return; // ★ 提出済みの場合はここで確実に処理を中断
                }
            } else {
                console.log('ユーザーがログインしていません');
            }
        } catch (err) {
            console.error('ユーザー認証・初期チェックエラー:', err);
        }
    }

    // 2. 今日の問題を取得 (Grade = 2)
    currentProblems = await fetchDailyProblems(2);

    if (!currentProblems || currentProblems.length === 0) {
        currentProblems = getFallbackProblems();
    }

    // 3. 問題の描画とタイマー開始
    renderProblems(currentProblems);
    if (loadingMsg) loadingMsg.classList.add('hidden');
    if (challengeForm) challengeForm.classList.remove('hidden');
    if (timerDisplay) timerDisplay.classList.remove('hidden');
    startTimer(60);

    // 4. 採点＆提出イベント設定
    challengeForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (submitBtn) submitBtn.disabled = true;
        submitForm();
    });

    /**
     * 問題一覧を描画する関数（修正ポイント）
     */
    function renderProblems(problems) {
        if (!problemsContainer) return;
        problemsContainer.innerHTML = ''; // クリア

        problems.forEach((problem, index) => {
            // 問題文の取得（text, question, p1/p2 の各種キーに対応）
            let questionText = '';
            if (problem.text) {
                questionText = problem.text;
            } else if (problem.question) {
                questionText = problem.question;
            } else if (problem.p1 !== undefined && problem.p2 !== undefined) {
                questionText = `${problem.p1} ${problem.operator || '＋'} ${problem.p2} =`;
            }

            // 問題要素の生成
            const problemDiv = document.createElement('div');
            problemDiv.className = 'problem-item';
            problemDiv.innerHTML = `
                <div class="problem-statement">
                    <span class="problem-num">（${index + 1}）</span>
                    <span class="question-text">${questionText}</span>
                    <input type="number" id="ans-${index}" class="answer-input" autocomplete="off" inputmode="numeric" required>
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

            console.log(`履歴チェック実行 -> 日付: ${todayStr}, 学年: ${grade}, ユーザー: ${userId}`);

            const { data, error } = await supabaseClient
                .from('learning_scores_test')
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
        console.log('すでに回答済み画面を表示します:', scoreData);

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

        const resultContainer = document.getElementById('result-container');
        const resultScore = document.getElementById('result-score');
        const resultTime = document.getElementById('result-time');
        const resultMessage = document.getElementById('result-message');

        if (resultContainer) {
            resultContainer.classList.remove('hidden');
            resultContainer.style.setProperty('display', 'block', 'important');

            if (resultScore) {
                resultScore.textContent = `💮 きょうのスコア: ${scoreData.score} てん！`;
            }
            if (resultTime) {
                resultTime.textContent = scoreData.time_taken ? `かかった じかん: ${scoreData.time_taken} びょう` : '';
            }
            if (resultMessage) {
                resultMessage.textContent = 'きょうの チャレンジは すでに かんりょう しています。また あした ちょうせんしてね！ 💮';
            }
        }
    }

    /**
     * タイマー関連関数
     */
    function startTimer(durationSeconds = 60) {
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
        alert('じかんきれです！ さいてんします。');
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

    function getFallbackProblems() {
        return [
            { text: '6 × 4 = ', answer: 24 },
            { text: '7 × 8 = ', answer: 56 },
            { text: '45 + 28 = ', answer: 73 },
            { text: '82 - 35 = ', answer: 47 },
            { text: '9 × 3 = ', answer: 27 },
            { text: '54 + 19 = ', answer: 73 },
            { text: '63 - 27 = ', answer: 36 },
            { text: '8 × 7 = ', answer: 56 },
            { text: '38 + 44 = ', answer: 82 },
            { text: '91 - 48 = ', answer: 43 }
        ];
    }

    async function saveLearningScore(grade, score, timeTaken) {
        if (!supabaseClient) return;

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
                        subject: 'math',
                        score: Number(score),
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
            .trim();
    }
});