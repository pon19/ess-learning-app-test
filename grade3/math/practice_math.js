document.addEventListener('DOMContentLoaded', () => {
    const setupSection = document.getElementById('setup-section');
    const quizSection = document.getElementById('quiz-section');
    const calcTypeSelect = document.getElementById('calc-type');
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

    restoreSessionState();

    startBtn.addEventListener('click', () => {
        const calcType = calcTypeSelect.value;
        const count = parseInt(problemCountSelect.value, 10);

        currentProblems = generateProblems(calcType, count);
        saveSessionState({ problems: currentProblems, calcType, count, submitted: false });
        renderProblems(currentProblems);

        setupSection.classList.add('hidden');
        quizSection.classList.remove('hidden');
        resultContainer.classList.add('hidden');
    });

    resetBtn.addEventListener('click', () => {
        sessionStorage.removeItem('grade3_practice_math');
        quizSection.classList.add('hidden');
        setupSection.classList.remove('hidden');
        resultContainer.classList.add('hidden');
    });

    retryBtn.addEventListener('click', () => {
        sessionStorage.removeItem('grade3_practice_math');
        quizSection.classList.add('hidden');
        setupSection.classList.remove('hidden');
        resultContainer.classList.add('hidden');
    });

    quizForm.addEventListener('submit', (e) => {
        e.preventDefault();

        let score = 0;
        const userAnswers = [];

        currentProblems.forEach((problem, index) => {
            let isCorrect = false;

            if (problem.hasRemainder) {
                // あまりのある計算（入力欄2箇所）
                const inputSho = document.getElementById(`ans-${index}-sho`);
                const inputAmari = document.getElementById(`ans-${index}-amari`);
                
                const valSho = inputSho ? normalizeAnswer(inputSho.value) : '';
                const valAmari = inputAmari ? normalizeAnswer(inputAmari.value) : '';

                userAnswers.push({ sho: inputSho?.value || '', amari: inputAmari?.value || '' });

                const expectedSho = normalizeAnswer(problem.ansSho.toString());
                const expectedAmari = normalizeAnswer(problem.ansAmari.toString());

                isCorrect = (valSho === expectedSho && valAmari === expectedAmari);

            } else {
                // 通常の計算（入力欄1箇所）
                const input = document.getElementById(`ans-${index}`);
                const rawVal = input ? input.value : '';
                
                userAnswers.push(rawVal);

                const normalizedVal = normalizeAnswer(rawVal);
                const expectedVal = normalizeAnswer(problem.answer.toString());

                isCorrect = (normalizedVal === expectedVal);
            }

            if (isCorrect) score++;

            // フィードバック表示
            const feedbackEl = document.getElementById(`feedback-${index}`);
            if (feedbackEl) {
                if (isCorrect) {
                    feedbackEl.innerHTML = '<span class="correct">⭕ 正解！</span>';
                } else {
                    const correctText = problem.hasRemainder 
                        ? `${problem.ansSho} あまり ${problem.ansAmari}`
                        : problem.answer;
                    feedbackEl.innerHTML = `<span class="incorrect">❌ 残念！ 答え: ${correctText}</span>`;
                }
            }
        });

        const total = currentProblems.length;
        resultScore.textContent = `${total}問 うち ${score}問 正解！`;
        
        if (score === total) {
            resultMessage.textContent = '🎉 素晴らしい！ 満点！ 完璧だね！';
        } else if (score >= total * 0.7) {
            resultMessage.textContent = '👍 お見事！ あと少しで 満点だよ！';
        } else {
            resultMessage.textContent = '💪 あきらめずに もう一度 練習してみよう！';
        }

        resultContainer.classList.remove('hidden');

        const calcType = calcTypeSelect.value;
        const count = parseInt(problemCountSelect.value, 10);
        saveSessionState({ problems: currentProblems, userAnswers, calcType, count, submitted: true });
    });

    /**
     * 3年生用問題生成ロジック
     */
    function generateProblems(type, count) {
        const problems = [];
        const availableTypes = ['div_no_rem', 'div_rem', 'mul_2digit', 'add_sub_3digit', 'decimal_add_sub'];

        for (let i = 0; i < count; i++) {
            let selectedType = type;
            if (type === 'mix_3rd') {
                selectedType = availableTypes[getRandomInt(0, availableTypes.length - 1)];
            }

            if (selectedType === 'div_no_rem') {
                const b = getRandomInt(2, 9);
                const ans = getRandomInt(2, 9);
                const a = b * ans;
                problems.push({ text: `${a} ÷ ${b} = `, answer: ans.toString(), hasRemainder: false });

            } else if (selectedType === 'div_rem') {
                // あまりのある割り算（商とあまりを分離）
                const b = getRandomInt(2, 9);
                const ansSho = getRandomInt(1, 9);
                const ansAmari = getRandomInt(1, b - 1);
                const a = b * ansSho + ansAmari;

                problems.push({
                    text: `${a} ÷ ${b} = `,
                    ansSho: ansSho.toString(),
                    ansAmari: ansAmari.toString(),
                    hasRemainder: true
                });

            } else if (selectedType === 'mul_2digit') {
                const a = getRandomInt(12, 89);
                const b = getRandomInt(2, 9);
                problems.push({ text: `${a} × ${b} = `, answer: (a * b).toString(), hasRemainder: false });

            } else if (selectedType === 'add_sub_3digit') {
                const isAdd = Math.random() < 0.5;
                if (isAdd) {
                    const a = getRandomInt(100, 500);
                    const b = getRandomInt(100, 400);
                    problems.push({ text: `${a} + ${b} = `, answer: (a + b).toString(), hasRemainder: false });
                } else {
                    const a = getRandomInt(300, 900);
                    const b = getRandomInt(100, a - 100);
                    problems.push({ text: `${a} - ${b} = `, answer: (a - b).toString(), hasRemainder: false });
                }

            } else if (selectedType === 'decimal_add_sub') {
                const isAdd = Math.random() < 0.5;
                if (isAdd) {
                    const a = (getRandomInt(1, 49) / 10);
                    const b = (getRandomInt(1, 49) / 10);
                    const ans = Math.round((a + b) * 10) / 10;
                    problems.push({ text: `${a} + ${b} = `, answer: ans.toString(), hasRemainder: false });
                } else {
                    const a = (getRandomInt(20, 99) / 10);
                    const b = (getRandomInt(1, Math.floor(a * 10) - 1) / 10);
                    const ans = Math.round((a - b) * 10) / 10;
                    problems.push({ text: `${a} - ${b} = `, answer: ans.toString(), hasRemainder: false });
                }
            }
        }
        return problems;
    }

    /**
     * 問題描画（あまりあり・なしで入力欄を分岐）
     */
    function renderProblems(problems, userAnswers = []) {
        problemsContainer.innerHTML = '';
        problems.forEach((problem, index) => {
            const div = document.createElement('div');
            div.className = 'calc-item';
            
            const savedVal = userAnswers[index];

            let inputHtml = '';
            if (problem.hasRemainder) {
                // あまりのある計算用：入力欄2つ（プレースホルダー：「商」「あまり」）
                const savedSho = (typeof savedVal === 'object' && savedVal !== null) ? savedVal.sho : '';
                const savedAmari = (typeof savedVal === 'object' && savedVal !== null) ? savedVal.amari : '';

                /* practice_math.js のあまりのある計算用入力欄の修正 */
                inputHtml = `
                    <div class="calc-input-group">
                        <input type="text" id="ans-${index}-sho" class="input-answer-short" value="${escapeHTML(savedSho)}" placeholder="答え" autocomplete="off" inputmode="numeric">
                        <span class="unit-text-sm">あまり</span>
                        <input type="text" id="ans-${index}-amari" class="input-answer-short" value="${escapeHTML(savedAmari)}" placeholder="答え" autocomplete="off" inputmode="numeric">
                    </div>
                `;
            } else {
                // 通常の計算用：入力欄1つ
                const singleVal = (typeof savedVal === 'string') ? savedVal : '';
                inputHtml = `
                    <input type="text" id="ans-${index}" class="input-answer-num" value="${escapeHTML(singleVal)}" placeholder="?" autocomplete="off" inputmode="numeric">
                `;
            }

            div.innerHTML = `
                <div class="calc-expr-box">
                    <span class="problem-index">(${index + 1})</span>
                    <label class="problem-text">${problem.text}</label>
                </div>
                <div class="calc-input-box">
                    ${inputHtml}
                </div>
                <div id="feedback-${index}" class="feedback-text"></div>
            `;
            problemsContainer.appendChild(div);
        });
    }

    function saveSessionState(state) {
        sessionStorage.setItem('grade3_practice_math', JSON.stringify(state));
    }

    function restoreSessionState() {
        const saved = sessionStorage.getItem('grade3_practice_math');
        if (!saved) return;

        try {
            const state = JSON.parse(saved);
            if (state && state.problems && state.problems.length > 0) {
                currentProblems = state.problems;
                calcTypeSelect.value = state.calcType || 'div_no_rem';
                problemCountSelect.value = state.count || 10;

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