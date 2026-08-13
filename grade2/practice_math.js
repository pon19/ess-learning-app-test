document.addEventListener('DOMContentLoaded', () => {
    const setupSection = document.getElementById('setup-section');
    const quizSection = document.getElementById('quiz-section');
    const calcTypeSelect = document.getElementById('calc-type');
    const kukuOptions = document.getElementById('kuku-options');
    const kukuDanSelect = document.getElementById('kuku-dan');
    const problemCountSelect = document.getElementById('problem-count');
    const startBtn = document.getElementById('start-btn');
    const quizForm = document.getElementById('quiz-form');
    const problemsContainer = document.getElementById('problems-container');
    const resultContainer = document.getElementById('result-container');
    const resultScore = document.getElementById('result-score');
    const resultMessage = document.getElementById('result-message');
    const retryBtn = document.getElementById('retry-btn');
    const resetBtn = document.getElementById('reset-btn');

    let currentProblems = [];

    // 種別変更時に九九の段選択オプションを表示/非表示切り替え
    calcTypeSelect.addEventListener('change', () => {
        if (calcTypeSelect.value === 'kuku') {
            kukuOptions.classList.remove('hidden');
        } else {
            kukuOptions.classList.add('hidden');
        }
    });

    // セッションストレージからの状態復元
    restoreSessionState();

    // 開始ボタン押下
    startBtn.addEventListener('click', () => {
        const calcType = calcTypeSelect.value;
        const count = parseInt(problemCountSelect.value, 10);
        const kukuDan = kukuDanSelect.value;

        currentProblems = generateProblems(calcType, count, kukuDan);
        saveSessionState({ problems: currentProblems, calcType, count, kukuDan, submitted: false });
        renderProblems(currentProblems);

        setupSection.classList.add('hidden');
        quizSection.classList.remove('hidden');
        resultContainer.classList.add('hidden');
    });

    // リセットボタン
    resetBtn.addEventListener('click', () => {
        sessionStorage.removeItem('grade2_practice_math');
        quizSection.classList.add('hidden');
        setupSection.classList.remove('hidden');
        resultContainer.classList.add('hidden');
    });

    // もう一度挑戦ボタン
    retryBtn.addEventListener('click', () => {
        sessionStorage.removeItem('grade2_practice_math');
        quizSection.classList.add('hidden');
        setupSection.classList.remove('hidden');
        resultContainer.classList.add('hidden');
    });

    // 採点処理
    quizForm.addEventListener('submit', (e) => {
        e.preventDefault();

        let score = 0;
        const userAnswers = [];

        currentProblems.forEach((problem, index) => {
            const input = document.getElementById(`ans-${index}`);
            const rawVal = input ? input.value : '';
            const normalizedVal = normalizeAnswer(rawVal);
            const isCorrect = (normalizedVal === problem.answer.toString());

            if (isCorrect) score++;

            userAnswers.push(rawVal);

            // 正誤メッセージ表示
            const feedbackEl = document.getElementById(`feedback-${index}`);
            if (feedbackEl) {
                if (isCorrect) {
                    feedbackEl.innerHTML = '<span class="correct">⭕ せいかい！</span>';
                } else {
                    feedbackEl.innerHTML = `<span class="incorrect">❌ ざんねん！ こたえ: ${problem.answer}${problem.unit || ''}</span>`;
                }
            }
        });

        // スコア表示
        const total = currentProblems.length;
        resultScore.textContent = `${total}もん うち ${score}もん せいかい！`;
        
        if (score === total) {
            resultMessage.textContent = '🎉 すごい！ まんてん！ かんぺきだね！';
        } else if (score >= total * 0.7) {
            resultMessage.textContent = '👍 お見事！ あとすこしで まんてんだよ！';
        } else {
            resultMessage.textContent = '💪 あきらめずに もういちど れんしゅうしてみよう！';
        }

        resultContainer.classList.remove('hidden');

        const calcType = calcTypeSelect.value;
        const count = parseInt(problemCountSelect.value, 10);
        const kukuDan = kukuDanSelect.value;
        saveSessionState({ problems: currentProblems, userAnswers, calcType, count, kukuDan, submitted: true });
    });

    /**
     * 問題生成ロジック
     */
    function generateProblems(type, count, kukuDan) {
        const problems = [];

        for (let i = 0; i < count; i++) {
            if (type === 'kuku') {
                const num1 = kukuDan === 'all' ? getRandomInt(1, 9) : parseInt(kukuDan, 10);
                const num2 = getRandomInt(1, 9);
                problems.push({
                    text: `${num1} × ${num2} = `,
                    answer: (num1 * num2).toString(),
                    unit: ''
                });
            } else if (type === 'add_2digit') {
                const num1 = getRandomInt(10, 89);
                const num2 = getRandomInt(10, 99 - num1);
                problems.push({
                    text: `${num1} + ${num2} = `,
                    answer: (num1 + num2).toString(),
                    unit: ''
                });
            } else if (type === 'sub_2digit') {
                const num1 = getRandomInt(20, 99);
                const num2 = getRandomInt(10, num1 - 1);
                problems.push({
                    text: `${num1} - ${num2} = `,
                    answer: (num1 - num2).toString(),
                    unit: ''
                });
            } else if (type === 'mix_2digit') {
                const isAdd = Math.random() < 0.5;
                if (isAdd) {
                    const num1 = getRandomInt(10, 89);
                    const num2 = getRandomInt(10, 99 - num1);
                    problems.push({ text: `${num1} + ${num2} = `, answer: (num1 + num2).toString(), unit: '' });
                } else {
                    const num1 = getRandomInt(20, 99);
                    const num2 = getRandomInt(10, num1 - 1);
                    problems.push({ text: `${num1} - ${num2} = `, answer: (num1 - num2).toString(), unit: '' });
                }
            } else if (type === 'unit_calc') {
                // 長さ・かさの単位問題
                const isLength = Math.random() < 0.5;
                if (isLength) {
                    const cm = getRandomInt(1, 8);
                    const mm = getRandomInt(1, 9);
                    problems.push({
                        text: `${cm}cm ${mm}mm は なんミリメートル（mm）？ `,
                        answer: (cm * 10 + mm).toString(),
                        unit: 'mm'
                    });
                } else {
                    const l = getRandomInt(1, 5);
                    const dl = getRandomInt(1, 9);
                    problems.push({
                        text: `${l}L ${dl}dL は なんデシリットル（dL）？ `,
                        answer: (l * 10 + dl).toString(),
                        unit: 'dL'
                    });
                }
            }
        }
        return problems;
    }

    /**
     * 問題描画
     */
    function renderProblems(problems, userAnswers = []) {
        problemsContainer.innerHTML = '';
        problems.forEach((problem, index) => {
            const div = document.createElement('div');
            // クラス名を .calc-item に変更してカードデザインを適用
            div.className = 'calc-item';
            
            const savedVal = userAnswers[index] || '';

            div.innerHTML = `
                <div class="calc-expr-box">
                    <span class="problem-index">(${index + 1})</span>
                    <label for="ans-${index}" class="problem-text">${problem.text}</label>
                </div>
                <div class="calc-input-box">
                    <input type="text" id="ans-${index}" class="input-answer-num" value="${escapeHTML(savedVal)}" placeholder="?" autocomplete="off" inputmode="numeric" pattern="[0-9]*">
                    <span class="unit-text">${problem.unit || ''}</span>
                </div>
                <div id="feedback-${index}" class="feedback-text"></div>
            `;
            problemsContainer.appendChild(div);
        });
    }

    /**
     * セッション保存/復元
     */
    function saveSessionState(state) {
        sessionStorage.setItem('grade2_practice_math', JSON.stringify(state));
    }

    function restoreSessionState() {
        const saved = sessionStorage.getItem('grade2_practice_math');
        if (!saved) return;

        try {
            const state = JSON.parse(saved);
            if (state && state.problems && state.problems.length > 0) {
                currentProblems = state.problems;
                calcTypeSelect.value = state.calcType || 'kuku';
                problemCountSelect.value = state.count || 10;
                if (state.kukuDan) kukuDanSelect.value = state.kukuDan;

                if (calcTypeSelect.value === 'kuku') {
                    kukuOptions.classList.remove('hidden');
                }

                renderProblems(currentProblems, state.userAnswers);
                setupSection.classList.add('hidden');
                quizSection.classList.remove('hidden');

                if (state.submitted) {
                    quizForm.dispatchEvent(new Event('submit'));
                }
            }
        } catch (e) {
            console.error('セッション復元エラー:', e);
        }
    }

    /**
     * 全角数字・スペースを半角数字に変換
     */
    function normalizeAnswer(str) {
        if (!str) return '';
        return str
            .replace(/[０-９]/g, s => String.fromCharCode(s.charCodeAt(0) - 0xfee0))
            .replace(/\s+/g, '')
            .trim();
    }

    function getRandomInt(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    function escapeHTML(str) {
        if (!str) return '';
        return str.replace(/[&<>'"]/g, 
            tag => ({
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                "'": '&#39;',
                '"': '&quot;'
            }[tag] || tag)
        );
    }
});