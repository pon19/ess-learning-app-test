document.addEventListener('DOMContentLoaded', () => {
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

    // -------------------------------------------------------------
    // 文章題テンプレート（無理な計算にならないよう数字を生成する関数付き）
    // -------------------------------------------------------------
    const wordProblemTemplates = [
        // --- 1. 割り算（あまりあり） ---
        {
            category: 'div',
            generate: () => {
                const item = getRandomElement(['あめ', 'クッキー', 'チョコ', 'シール', '折り紙']);
                const unit = item === '折り紙' ? '枚' : '個';
                const countPerPerson = getRandomInt(3, 8); // 1人分の数
                const people = getRandomInt(3, 7); // 配れる人数（商）
                const remainder = getRandomInt(1, countPerPerson - 1); // あまり（割る数より必ず小さい）
                const total = countPerPerson * people + remainder; // 全体の数

                return {
                    category: 'div',
                    text: `${total}${unit}の${item}を、1人に${countPerPerson}${unit}ずつくばります。何人にくばれて、何${unit}あまりますか。`,
                    formula: `${total}÷${countPerPerson}=${people}あまり${remainder}`,
                    ansSho: people.toString(),
                    ansAmari: remainder.toString(),
                    unitSho: '人',
                    unitAmari: unit,
                    hasRemainder: true
                };
            }
        },
        // --- 2. 割り算（あまりなし） ---
        {
            category: 'div',
            generate: () => {
                const perGroup = getRandomInt(3, 9);
                const groups = getRandomInt(4, 9);
                const total = perGroup * groups;

                return {
                    category: 'div',
                    text: `${total}人の児童を、1グループ${perGroup}人ずつに分けると、何グループできますか。`,
                    formula: `${total}÷${perGroup}=${groups}`,
                    answer: groups.toString(),
                    unit: 'グループ',
                    hasRemainder: false
                };
            }
        },
        // --- 3. かけ算（2桁×1桁） ---
        {
            category: 'mul',
            generate: () => {
                const item = getRandomElement(['チョコボール', 'キャラメル', '消しゴム', '鉛筆']);
                const unit = item === '鉛筆' ? '本' : '個';
                const perBox = getRandomInt(12, 35);
                const boxes = getRandomInt(3, 6);
                const total = perBox * boxes;

                return {
                    category: 'mul',
                    text: `1箱に${perBox}${unit}入った${item}が${boxes}箱あります。${item}はぜんぶで何${unit}ありますか。`,
                    formula: `${perBox}×${boxes}=${total}`,
                    answer: total.toString(),
                    unit: unit,
                    hasRemainder: false
                };
            }
        },
        // --- 4. かけ算（何十×1桁） ---
        {
            category: 'mul',
            generate: () => {
                const item = getRandomElement(['ノート', 'ペン', 'ファイル', '消しゴム']);
                const price = getRandomInt(4, 9) * 10; // 40円〜90円
                const count = getRandomInt(4, 8);
                const total = price * count;

                return {
                    category: 'mul',
                    text: `1さつ${price}円の${item}を${count}さつ買いました。代金はいくらになりますか。`,
                    formula: `${price}×${count}=${total}`,
                    answer: total.toString(),
                    unit: '円',
                    hasRemainder: false
                };
            }
        },
        // --- 5. 小数（引き算） ---
        {
            category: 'decimal',
            generate: () => {
                const total10 = getRandomInt(6, 18); // 例: 0.6L 〜 1.8L
                const drink10 = getRandomInt(2, total10 - 1); // 必ず全体より小さい値
                const remain10 = total10 - drink10;

                const total = (total10 / 10).toFixed(1);
                const drink = (drink10 / 10).toFixed(1);
                const remain = (remain10 / 10).toFixed(1);

                return {
                    category: 'decimal',
                    text: `水とうに水が${total}L入っています。${drink}L飲むと、のこりは何Lになりますか。`,
                    formula: `${total}-${drink}=${remain}`,
                    answer: remain,
                    unit: 'L',
                    hasRemainder: false
                };
            }
        },
        // --- 6. 小数（足し算） ---
        {
            category: 'decimal',
            generate: () => {
                const a10 = getRandomInt(3, 9);
                const b10 = getRandomInt(4, 9);
                const sum10 = a10 + b10;

                const a = (a10 / 10).toFixed(1);
                const b = (b10 / 10).toFixed(1);
                const sum = (sum10 / 10).toFixed(1);

                return {
                    category: 'decimal',
                    text: `昨日テープを${a}m、今日テープを${b}m使いました。あわせて何m使いましたか。`,
                    formula: `${a}+${b}=${sum}`,
                    answer: sum,
                    unit: 'm',
                    hasRemainder: false
                };
            }
        },
        // --- 7. 時間と時刻 ---
        {
            category: 'time',
            generate: () => {
                const startHour = getRandomInt(1, 4); // 午後1時〜4時
                const startMin = getRandomElement([0, 10, 15, 20]);
                const duration = getRandomElement([20, 25, 30, 35, 40]);
                
                const endMinTotal = startMin + duration;
                const endHour = startHour + Math.floor(endMinTotal / 60);
                const endMin = endMinTotal % 60;

                const startMinStr = startMin === 0 ? '' : `${startMin}分`;
                const textMin = startMin === 0 ? '0分' : `${startMin}分`;

                return {
                    category: 'time',
                    text: `午後${startHour}時${textMin}から${duration}分間、図書館で勉強をしました。勉強が終わったのは午後何時何分ですか。`,
                    formula: `${startMin}+${duration}=${endMinTotal}`,
                    ansHour: endHour.toString(),
                    ansMin: endMin.toString(),
                    isTime: true
                };
            }
        }
    ];

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
     * ランダム問題生成関数
     */
    function generateRandomProblems(category, count) {
        let availableTemplates = wordProblemTemplates;
        if (category !== 'all') {
            availableTemplates = wordProblemTemplates.filter(t => t.category === category);
        }

        const problems = [];
        for (let i = 0; i < count; i++) {
            // カテゴリに合うテンプレートからランダムに選出し、数値を生成
            const template = getRandomElement(availableTemplates);
            problems.push(template.generate());
        }

        return problems;
    }

    /**
     * 問題描画（プレースホルダーをすべて「答え」に統一）
     */
    function renderProblems(problems, userAnswers = []) {
        problemsContainer.innerHTML = '';
        problems.forEach((problem, index) => {
            const card = document.createElement('div');
            card.className = 'word-problem-card';

            const savedVal = userAnswers[index];
            let answerInputHtml = '';

            if (problem.isTime) {
                // 時刻用入力欄（プレースホルダー：「答え」）
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
                // あまりのある計算用入力欄（プレースホルダー：「答え」）
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
                // 通常計算用入力欄（プレースホルダー：「答え」）
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