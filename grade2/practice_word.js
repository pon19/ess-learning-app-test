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

    // セッション復元
    restoreSessionState();

    // 開始ボタン
    startBtn.addEventListener('click', () => {
        const type = wordTypeSelect.value;
        const count = parseInt(problemCountSelect.value, 10);

        currentProblems = generateWordProblems(type, count);
        saveSessionState({ problems: currentProblems, type, count, submitted: false });
        renderProblems(currentProblems);

        setupSection.classList.add('hidden');
        quizSection.classList.remove('hidden');
        resultContainer.classList.add('hidden');
    });

    // やりなおすボタン
    resetBtn.addEventListener('click', () => {
        sessionStorage.removeItem('grade2_practice_word');
        quizSection.classList.add('hidden');
        setupSection.classList.remove('hidden');
        resultContainer.classList.add('hidden');
    });

    // もう一度挑戦ボタン
    retryBtn.addEventListener('click', () => {
        sessionStorage.removeItem('grade2_practice_word');
        quizSection.classList.add('hidden');
        setupSection.classList.remove('hidden');
        resultContainer.classList.add('hidden');
    });

    // 採点処理
    quizForm.addEventListener('submit', (e) => {
        e.preventDefault();

        let totalScore = 0;
        const userAnswers = [];

        currentProblems.forEach((p, index) => {
            const eqInput = document.getElementById(`eq-${index}`);
            const ansInput = document.getElementById(`ans-${index}`);

            const userEq = eqInput ? eqInput.value : '';
            const userAns = ansInput ? ansInput.value : '';

            const normalizedUserEq = normalizeEquation(userEq);
            const normalizedExpectedEq = normalizeEquation(p.equation);

            const isEqCorrect = (normalizedUserEq === normalizedExpectedEq);
            const isAnsCorrect = (normalizeAnswer(userAns) === p.answer.toString());

            const isCorrect = isEqCorrect && isAnsCorrect;
            if (isCorrect) totalScore++;

            userAnswers.push({ eq: userEq, ans: userAns });

            // フィードバック描画
            const feedbackEl = document.getElementById(`feedback-${index}`);
            if (feedbackEl) {
                if (isCorrect) {
                    feedbackEl.innerHTML = '<span class="correct">⭕ せいかい！</span>';
                } else {
                    let msg = '<span class="incorrect">❌ ざんねん！<br>';
                    if (!isEqCorrect) msg += `【正しい式】 ${escapeHTML(p.displayEq || p.equation)}<br>`;
                    if (!isAnsCorrect) msg += `【正しいこたえ】 ${p.answer}${escapeHTML(p.unit)}`;
                    msg += '</span>';
                    feedbackEl.innerHTML = msg;
                }
            }
        });

        // スコア表示
        const total = currentProblems.length;
        resultScore.textContent = `${total}もん うち ${totalScore}もん せいかい！`;

        if (totalScore === total) {
            resultMessage.textContent = '🎉 すごい！ まんてん！ かんぺきだね！';
        } else if (totalScore >= total * 0.6) {
            resultMessage.textContent = '👍 惜しい！ 式と こたえを もう一度たしかめてみよう！';
        } else {
            resultMessage.textContent = '💪 あきらめずに もう一度 ちょうせんしてみよう！';
        }

        resultContainer.classList.remove('hidden');

        const type = wordTypeSelect.value;
        const count = parseInt(problemCountSelect.value, 10);
        saveSessionState({ problems: currentProblems, userAnswers, type, count, submitted: true });
    });

    /**
     * 文章題生成機能
     */
    function generateWordProblems(type, count) {
        const problems = [];
        const availableTypes = ['kuku_word', 'step2_word', 'unit_word'];

        for (let i = 0; i < count; i++) {
            let selectedType = type;
            if (type === 'mix_word') {
                selectedType = availableTypes[getRandomInt(0, availableTypes.length - 1)];
            }

            if (selectedType === 'kuku_word') {
                const items = [
                    { name: 'りんご', unit: 'こ', dish: 'お皿' },
                    { name: 'クッキー', unit: 'こ', dish: 'ふくろ' },
                    { name: 'キャンディー', unit: 'こ', dish: 'はこ' },
                    { name: '鉛筆', unit: 'ほん', dish: 'ケース' }
                ];
                const item = items[getRandomInt(0, items.length - 1)];
                const perNum = getRandomInt(2, 9);
                const countNum = getRandomInt(2, 9);

                problems.push({
                    text: `1つの ${item.dish} に ${item.name} が ${perNum}${item.unit} ずつ はいっています。${item.dish} が ${countNum}つ あります。ぜんぶで ${item.name} は なんにん（なん${item.unit}）ありますか。`,
                    equation: `${perNum}*${countNum}`,
                    displayEq: `${perNum} × ${countNum}`,
                    answer: perNum * countNum,
                    unit: item.unit
                });

            } else if (selectedType === 'step2_word') {
                const isAddThenSub = Math.random() < 0.5;
                if (isAddThenSub) {
                    const start = getRandomInt(10, 30);
                    const add = getRandomInt(5, 20);
                    const sub = getRandomInt(3, start + add - 5);
                    problems.push({
                        text: `公園に 子どもが ${start}人 いました。あとから ${add}人 やってきました。そのあと ${sub}人 かえりました。いま 公園には 子どもが 何人 いますか。`,
                        equation: `${start}+${add}-${sub}`,
                        displayEq: `${start} + ${add} - ${sub}`,
                        answer: start + add - sub,
                        unit: '人'
                    });
                } else {
                    const start = getRandomInt(20, 40);
                    const sub = getRandomInt(5, 15);
                    const add = getRandomInt(5, 20);
                    problems.push({
                        text: `バスに ${start}人 のっています。バス停で ${sub}人 おりて、${add}人 のってきました。いま バスには 何人 のっていますか。`,
                        equation: `${start}-${sub}+${add}`,
                        displayEq: `${start} - ${sub} + ${add}`,
                        answer: start - sub + add,
                        unit: '人'
                    });
                }

            } else if (selectedType === 'unit_word') {
                const isLength = Math.random() < 0.5;
                if (isLength) {
                    const l1 = getRandomInt(10, 40);
                    const l2 = getRandomInt(10, 40);
                    problems.push({
                        text: `あかい テープの ながさは ${l1}cm、あおい テープの ながさは ${l2}cm です。2つの テープを あわせると ながさは 何cm になりますか。`,
                        equation: `${l1}+${l2}`,
                        displayEq: `${l1} + ${l2}`,
                        answer: l1 + l2,
                        unit: 'cm'
                    });
                } else {
                    const v1 = getRandomInt(2, 6);
                    const v2 = getRandomInt(1, 3);
                    problems.push({
                        text: `水そうに 水が ${v1}L はいっています。そこに ${v2}L の 水を くわえました。水そうの 水は ぜんぶで 何L になりましたか。`,
                        equation: `${v1}+${v2}`,
                        displayEq: `${v1} + ${v2}`,
                        answer: v1 + v2,
                        unit: 'L'
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
            div.className = 'problem-card';

            const savedEq = userAnswers[index] ? userAnswers[index].eq : '';
            const savedAns = userAnswers[index] ? userAnswers[index].ans : '';

            div.innerHTML = `
                <p class="problem-statement"><strong>(${index + 1})</strong> ${escapeHTML(problem.text)}</p>
                <div class="input-group-word">
                    <div class="field-row">
                        <label for="eq-${index}">しき:</label>
                        <input type="text" id="eq-${index}" class="form-control eq-input" value="${escapeHTML(savedEq)}" autocomplete="off" placeholder="れい: 3x4">
                    </div>
                    <div class="field-row">
                        <label for="ans-${index}">こたえ:</label>
                        <input type="text" id="ans-${index}" class="form-control ans-input" value="${escapeHTML(savedAns)}" autocomplete="off" inputmode="numeric">
                        <span class="unit-label">${escapeHTML(problem.unit)}</span>
                    </div>
                </div>
                <div id="feedback-${index}" class="feedback-text"></div>
            `;
            problemsContainer.appendChild(div);
        });
    }

    /**
     * 式の正規化判定処理
     */
    function normalizeEquation(eq) {
        if (!eq) return '';
        return eq
            .replace(/[０-９]/g, s => String.fromCharCode(s.charCodeAt(0) - 0xfee0)) // 全角数字 -> 半角
            .replace(/[＋]/g, '+')
            .replace(/[−ー-]/g, '-')
            .replace(/[✕×xX]/g, '*') // 九九の各種かけ算記号を統一
            .replace(/[÷/]/g, '/')   // 割り算記号の統一
            .replace(/\s+/g, '')     // スペース除去
            .trim();
    }

    function normalizeAnswer(str) {
        if (!str) return '';
        return str
            .replace(/[０-９]/g, s => String.fromCharCode(s.charCodeAt(0) - 0xfee0))
            .replace(/\s+/g, '')
            .trim();
    }

    function saveSessionState(state) {
        sessionStorage.setItem('grade2_practice_word', JSON.stringify(state));
    }

    function restoreSessionState() {
        const saved = sessionStorage.getItem('grade2_practice_word');
        if (!saved) return;

        try {
            const state = JSON.parse(saved);
            if (state && state.problems && state.problems.length > 0) {
                currentProblems = state.problems;
                wordTypeSelect.value = state.type || 'kuku_word';
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