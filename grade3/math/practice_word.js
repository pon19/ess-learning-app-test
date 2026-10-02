document.addEventListener('DOMContentLoaded', async () => {
    const setupSection = document.getElementById('setup-section');
    const quizSection = document.getElementById('quiz-section');
    const wordTypeSelect = document.getElementById('word-type');
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
    let wordTemplates = [];

    // JSONテンプレートの読み込み
    await loadTemplatesFromJSON();

    restoreSessionState();

    startBtn.addEventListener('click', () => {
        const selectedCategory = wordTypeSelect.value;
        const count = parseInt(problemCountSelect.value, 10);

        currentProblems = generateRandomProblems(selectedCategory, count);
        saveSessionState({ problems: currentProblems, selectedCategory, count, submitted: false });
        renderProblems(currentProblems);

        setupSection.classList.add('hidden');
        quizSection.classList.remove('hidden');
        resultContainer.classList.add('hidden');
    });

    resetBtn.addEventListener('click', () => {
        sessionStorage.removeItem('grade3_practice_word');
        quizSection.classList.add('hidden');
        setupSection.classList.remove('hidden');
        resultContainer.classList.add('hidden');
    });

    retryBtn.addEventListener('click', () => {
        sessionStorage.removeItem('grade3_practice_word');
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

            if (problem.isTime) {
                const inputHour = document.getElementById(`ans-${index}-hour`);
                const inputMin = document.getElementById(`ans-${index}-min`);

                const valHour = inputHour ? normalizeAnswer(inputHour.value) : '';
                const valMin = inputMin ? normalizeAnswer(inputMin.value) : '';

                userAnswers.push({ hour: inputHour?.value || '', min: inputMin?.value || '' });

                const expectedHour = normalizeAnswer(problem.ansHour);
                const expectedMin = normalizeAnswer(problem.ansMin);

                isCorrect = (valHour === expectedHour && valMin === expectedMin);

            } else if (problem.hasRemainder) {
                const inputSho = document.getElementById(`ans-${index}-sho`);
                const inputAmari = document.getElementById(`ans-${index}-amari`);

                const valSho = inputSho ? normalizeAnswer(inputSho.value) : '';
                const valAmari = inputAmari ? normalizeAnswer(inputAmari.value) : '';

                userAnswers.push({ sho: inputSho?.value || '', amari: inputAmari?.value || '' });

                const expectedSho = normalizeAnswer(problem.ansSho);
                const expectedAmari = normalizeAnswer(problem.ansAmari);

                isCorrect = (valSho === expectedSho && valAmari === expectedAmari);

            } else {
                const input = document.getElementById(`ans-${index}`);
                const rawVal = input ? input.value : '';

                userAnswers.push(rawVal);

                const normalizedVal = normalizeAnswer(rawVal);
                const expectedVal = normalizeAnswer(problem.answer);

                isCorrect = (normalizedVal === expectedVal);
            }

            if (isCorrect) score++;

            const feedbackEl = document.getElementById(`feedback-${index}`);
            if (feedbackEl) {
                if (isCorrect) {
                    feedbackEl.innerHTML = '<span class="correct">⭕ 正解！</span>';
                } else {
                    let correctText = '';
                    if (problem.isTime) {
                        correctText = `${problem.ansHour}時 ${problem.ansMin}分`;
                    } else if (problem.hasRemainder) {
                        correctText = `${problem.ansSho}${problem.unitSho} あまり ${problem.ansAmari}${problem.unitAmari}`;
                    } else {
                        correctText = `${problem.answer}${problem.unit || ''}`;
                    }
                    feedbackEl.innerHTML = `<span class="incorrect">❌ 残念！ 答え: ${correctText} (式: ${problem.formula})</span>`;
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

        const selectedCategory = wordTypeSelect.value;
        const count = parseInt(problemCountSelect.value, 10);
        saveSessionState({ problems: currentProblems, userAnswers, selectedCategory, count, submitted: true });
    });

    /**
     * JSONデータの読み込み
     */
    async function loadTemplatesFromJSON() {
        try {
            const response = await fetch('../../problems_template.json');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();

            if (data.math?.grade3?.word_templates) {
                wordTemplates = data.math.grade3.word_templates;
            } else {
                console.warn('JSON内に3年生の文章題テンプレートが見つかりません。');
            }
        } catch (error) {
            console.error('テンプレートJSONの読み込みに失敗しました:', error);
        }
    }

    /**
     * テンプレートから具体問題を生成するヘルパー関数
     */
    function instantiateProblem(template) {
        const { category, pattern, text, items } = template;

        if (category === 'div' && pattern === 'remainder') {
            const item = getRandomElement(items || ['あめ', 'クッキー', 'チョコ']);
            const unit = item === '折り紙' ? '枚' : '個';
            const countPerPerson = getRandomInt(3, 8);
            const people = getRandomInt(3, 7);
            const remainder = getRandomInt(1, countPerPerson - 1);
            const total = countPerPerson * people + remainder;

            const problemText = text
                .replace(/{total}/g, total)
                .replace(/{countPerPerson}/g, countPerPerson)
                .replace(/{item}/g, item)
                .replace(/{unit}/g, unit);

            return {
                category: 'div',
                text: problemText,
                formula: `${total}÷${countPerPerson}=${people}あまり${remainder}`,
                ansSho: people.toString(),
                ansAmari: remainder.toString(),
                unitSho: '人',
                unitAmari: unit,
                hasRemainder: true
            };
        } else if (category === 'div' && pattern === 'exact') {
            const perGroup = getRandomInt(3, 9);
            const groups = getRandomInt(4, 9);
            const total = perGroup * groups;

            const problemText = text
                .replace('{total}', total)
                .replace('{perGroup}', perGroup);

            return {
                category: 'div',
                text: problemText,
                formula: `${total}÷${perGroup}=${groups}`,
                answer: groups.toString(),
                unit: 'グループ',
                hasRemainder: false
            };
        } else if (category === 'mul' && pattern === 'two_digit') {
            const item = getRandomElement(items || ['チョコボール', '消しゴム']);
            const unit = item === '鉛筆' ? '本' : '個';
            const perBox = getRandomInt(12, 35);
            const boxes = getRandomInt(3, 6);
            const total = perBox * boxes;

            const problemText = text
                .replace('{perBox}', perBox)
                .replace(/{item}/g, item)
                .replace(/{unit}/g, unit)
                .replace('{boxes}', boxes);

            return {
                category: 'mul',
                text: problemText,
                formula: `${perBox}×${boxes}=${total}`,
                answer: total.toString(),
                unit: unit,
                hasRemainder: false
            };
        } else if (category === 'mul' && pattern === 'tens') {
            const item = getRandomElement(items || ['ノート', 'ペン']);
            const price = getRandomInt(4, 9) * 10;
            const count = getRandomInt(4, 8);
            const total = price * count;

            const problemText = text
                .replace('{price}', price)
                .replace('{item}', item)
                .replace('{count}', count);

            return {
                category: 'mul',
                text: problemText,
                formula: `${price}×${count}=${total}`,
                answer: total.toString(),
                unit: '円',
                hasRemainder: false
            };
        } else if (category === 'decimal' && pattern === 'sub') {
            const total10 = getRandomInt(6, 18);
            const drink10 = getRandomInt(2, total10 - 1);
            const remain10 = total10 - drink10;

            const total = (total10 / 10).toFixed(1);
            const drink = (drink10 / 10).toFixed(1);
            const remain = (remain10 / 10).toFixed(1);

            const problemText = text
                .replace('{total}', total)
                .replace('{drink}', drink);

            return {
                category: 'decimal',
                text: problemText,
                formula: `${total}-${drink}=${remain}`,
                answer: remain,
                unit: 'L',
                hasRemainder: false
            };
        } else if (category === 'decimal' && pattern === 'add') {
            const a10 = getRandomInt(3, 9);
            const b10 = getRandomInt(4, 9);
            const sum10 = a10 + b10;

            const a = (a10 / 10).toFixed(1);
            const b = (b10 / 10).toFixed(1);
            const sum = (sum10 / 10).toFixed(1);

            const problemText = text
                .replace('{a}', a)
                .replace('{b}', b);

            return {
                category: 'decimal',
                text: problemText,
                formula: `${a}+${b}=${sum}`,
                answer: sum,
                unit: 'm',
                hasRemainder: false
            };
        } else if (category === 'time' && pattern === 'duration') {
            const startHour = getRandomInt(1, 4);
            const startMin = getRandomElement([0, 10, 15, 20]);
            const duration = getRandomElement([20, 25, 30, 35, 40]);

            const endMinTotal = startMin + duration;
            const endHour = startHour + Math.floor(endMinTotal / 60);
            const endMin = endMinTotal % 60;

            const textMin = startMin === 0 ? '0分' : `${startMin}分`;

            const problemText = text
                .replace('{startHour}', startHour)
                .replace('{textMin}', textMin)
                .replace('{duration}', duration);

            return {
                category: 'time',
                text: problemText,
                formula: `${startMin}+${duration}=${endMinTotal}`,
                ansHour: endHour.toString(),
                ansMin: endMin.toString(),
                isTime: true
            };
        }
        return null;
    }

    /**
     * ランダム問題生成関数
     */
    function generateRandomProblems(category, count) {
        let availableTemplates = wordTemplates;
        if (category !== 'all') {
            availableTemplates = wordTemplates.filter(t => t.category === category);
        }

        const problems = [];
        for (let i = 0; i < count; i++) {
            if (availableTemplates.length === 0) break;
            const template = getRandomElement(availableTemplates);
            const problem = instantiateProblem(template);
            if (problem) {
                problems.push(problem);
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
            const card = document.createElement('div');
            card.className = 'word-problem-card';

            const savedVal = userAnswers[index];
            let answerInputHtml = '';

            if (problem.isTime) {
                const savedHour = (typeof savedVal === 'object' && savedVal !== null) ? savedVal.hour : '';
                const savedMin = (typeof savedVal === 'object' && savedVal !== null) ? savedVal.min : '';

                answerInputHtml = `
                    <div class="calc-input-group">
                        <input type="text" id="ans-${index}-hour" class="input-answer-time" value="${escapeHTML(savedHour)}" placeholder="答え" autocomplete="off" inputmode="numeric">
                        <span class="unit-text">時</span>
                        <input type="text" id="ans-${index}-min" class="input-answer-time" value="${escapeHTML(savedMin)}" placeholder="答え" autocomplete="off" inputmode="numeric">
                        <span class="unit-text">分</span>
                    </div>
                `;
            } else if (problem.hasRemainder) {
                const savedSho = (typeof savedVal === 'object' && savedVal !== null) ? savedVal.sho : '';
                const savedAmari = (typeof savedVal === 'object' && savedVal !== null) ? savedVal.amari : '';

                answerInputHtml = `
                    <div class="calc-input-group">
                        <input type="text" id="ans-${index}-sho" class="input-answer-short" value="${escapeHTML(savedSho)}" placeholder="答え" autocomplete="off" inputmode="numeric">
                        <span class="unit-text">${problem.unitSho || ''}</span>
                        <span class="unit-text-sm">あまり</span>
                        <input type="text" id="ans-${index}-amari" class="input-answer-short" value="${escapeHTML(savedAmari)}" placeholder="答え" autocomplete="off" inputmode="numeric">
                        <span class="unit-text">${problem.unitAmari || ''}</span>
                    </div>
                `;
            } else {
                const singleVal = (typeof savedVal === 'string') ? savedVal : '';
                answerInputHtml = `
                    <input type="text" id="ans-${index}" class="input-answer-num" value="${escapeHTML(singleVal)}" placeholder="答え" autocomplete="off">
                    <span class="unit-text">${problem.unit || ''}</span>
                `;
            }

            card.innerHTML = `
                <div class="word-problem-text">
                    <strong>（${index + 1}）</strong> ${problem.text}
                </div>
                <div class="word-input-container">
                    <div class="word-input-row">
                        <span class="word-input-label">答え：</span>
                        ${answerInputHtml}
                    </div>
                </div>
                <div id="feedback-${index}" class="feedback-text"></div>
            `;
            problemsContainer.appendChild(card);
        });
    }

    function saveSessionState(state) {
        sessionStorage.setItem('grade3_practice_word', JSON.stringify(state));
    }

    function restoreSessionState() {
        const saved = sessionStorage.getItem('grade3_practice_word');
        if (!saved) return;

        try {
            const state = JSON.parse(saved);
            if (state && state.problems && state.problems.length > 0) {
                currentProblems = state.problems;
                wordTypeSelect.value = state.selectedCategory || 'all';
                problemCountSelect.value = state.count || 5;

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

    function getRandomElement(arr) {
        return arr[Math.floor(Math.random() * arr.length)];
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