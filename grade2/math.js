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
    let startTime = null;
    let elapsedTime = 0;
    
    // ==========================================
    // 1. グローバル変数（タイマー管理用）
    // ==========================================
    let timerInterval = null; // setInterval の識別ID
    let remainingSeconds = 60; // デフォルトの制限時間（秒）

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
    startTimer();

    // 採点＆提出処理
    challengeForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        stopTimer();

        submitBtn.disabled = true;
        let score = 0;

        currentProblems.forEach((problem, index) => {
            const input = document.getElementById(`ans-${index}`);
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

        // スコア結果の表示
        const calculatedScore = score * (100 / currentProblems.length);
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
    });

    // ==========================================
    // 3. タイマー開始関数（実時間計算ベース）
    // ==========================================
    /**
     * @param {number} durationSeconds - 制限時間（デフォルト60秒）
     */
    function startTimer(durationSeconds = 60) {
      // ① 開始前に必ず既存タイマーを停止（二重起動防止）
      stopTimer();

      const timerDisplay = document.getElementById('timer'); // HTMLのタイマー表示要素
      const startTime = Date.now();
      const endTime = startTime + durationSeconds * 1000; // 終了すべき時刻（ミリ秒）

      // 初期表示
      if (timerDisplay) {
        timerDisplay.textContent = durationSeconds;
      }

      // ② 250msごとに実時間をチェックして表示を更新（タブ切り替え時のズレ防止）
      timerInterval = setInterval(() => {
        const now = Date.now();
        const timeLeft = Math.max(0, Math.ceil((endTime - now) / 1000));

        // タイマー表示の更新
        if (timerDisplay) {
          timerDisplay.textContent = timeLeft;
        }

        // ③ 0秒になったら停止して終了処理を実行
        if (timeLeft <= 0) {
          stopTimer();
          handleTimeUp(); // タイムアップ時の処理を実行
        }
      }, 250);
    }

    // ==========================================
    // 2. タイマー停止関数（二重起動防止・リセット用）
    // ==========================================
    function stopTimer() {
      if (timerInterval !== null) {
        clearInterval(timerInterval);
        timerInterval = null;
      }
    }
    
    // ==========================================
    // 4. タイムアップ時の処理
    // ==========================================
    function handleTimeUp() {
      // 回答入力欄の無効化や、結果画面を表示する関数を呼び出す
      alert('じかんきれです！');
      // ※既存のゲーム終了関数（例: finishGame(), showResultModal() 等）があればここで実行します
    }

    /**
     * DBから本日の問題を取得
     */
    async function fetchDailyProblems(grade) {
        if (typeof supabase === 'undefined') return null;

        try {
            const todayStr = new Date().toISOString().split('T')[0];
            const { data, error } = await supabase
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
     * スコア保存処理
     */
    async function saveLearningScore(grade, score, timeTaken) {
        if (typeof supabase === 'undefined') return;

        try {
            const user = (await supabase.auth.getUser())?.data?.user;
            const userId = user ? user.id : null;

            await supabase
                .from('learning_scores_test')
                .insert([
                    {
                        user_id: userId,
                        grade: grade,
                        score: score,
                        time_taken: timeTaken,
                        created_at: new Date().toISOString()
                    }
                ]);
        } catch (e) {
            console.error('スコア保存エラー:', e);
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