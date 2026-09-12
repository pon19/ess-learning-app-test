document.addEventListener('DOMContentLoaded', () => {
    const setupSection = document.getElementById('setup-section');
    const quizSection = document.getElementById('quiz-section');
    const japaneseTypeSelect = document.getElementById('japanese-type');
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

    const kanjiList = [
        { text: '「風」の よみかた：', answer: 'かぜ' },
        { text: '「家」の よみかた：', answer: 'いえ' },
        { text: '「海」の よみかた：', answer: 'うみ' },
        { text: '「谷」の よみかた：', answer: 'たに' },
        { text: '「野」の よみかた：', answer: 'の' },
        { text: '「原」の よみかた：', answer: 'はら' }
    ];

    const oppositeList = [
        { text: '「ひろい」の 反対：', answer: 'せまい' },
        { text: '「おもい」の 反対：', answer: 'かるい' },
        { text: '「あかるい」の 反対：', answer: 'くらい' },
        { text: '「とおい」の 反対：', answer: 'ちかい' },
        { text: '「つよい」の 反対：', answer: 'よわい' }
    ];

    const conjunctionList = [
        { text: 'あめが ふってきた。（  ）、かさを さす。', answer: 'だから' },
        { text: 'はしった。（  ）、まにおわなかった。', answer: 'しかし' },
        { text: 'べんきょうした。（  ）、100てんが とれた。', answer: 'だから' },
        { text: 'さがした。（  ）、みつからなかった。', answer: 'けれど' }
    ];

    startBtn.addEventListener('click', () => {
        const type = japaneseTypeSelect.value;
        const count = parseInt(problemCountSelect.value, 10);
        currentProblems = generateProblems(type, count);
        renderProblems(currentProblems);

        setupSection.classList.add('hidden');
        quizSection.classList.remove('hidden');
        resultContainer.classList.add('hidden');
    });

    resetBtn.addEventListener('click', resetQuiz);
    retryBtn.addEventListener('click', resetQuiz);

    function resetQuiz() {
        quizSection.classList.add('hidden');
        setupSection.classList.remove('hidden');
        resultContainer.classList.add('hidden');
    }

    quizForm.addEventListener('submit', (e) => {
        e.preventDefault();
        let score = 0;

        currentProblems.forEach((problem, index) => {
            const input = document.getElementById(`ans-${index}`);
            const userVal = input ? input.value.trim() : '';
            const isCorrect = (userVal === problem.answer);

            if (isCorrect) score++;

            const feedbackEl = document.getElementById(`feedback-${index}`);
            if (feedbackEl) {
                feedbackEl.innerHTML = isCorrect ? 
                    '<span class="correct">⭕ せいかい！</span>' : 
                    `<span class="incorrect">❌ こたえ: ${problem.answer}</span>`;
            }
        });

        const total = currentProblems.length;
        resultScore.textContent = `${total}もん うち ${score}もん せいかい！`;
        resultMessage.textContent = score === total ? '🎉 まんてん！ すばらしい！' : '👍 つぎも がんばろう！';
        resultContainer.classList.remove('hidden');
    });

    function generateProblems(type, count) {
        let pool = [];
        if (type === 'kanji_read') pool = kanjiList;
        else if (type === 'opposite') pool = oppositeList;
        else if (type === 'conjunction') pool = conjunctionList;
        else pool = [...kanjiList, ...oppositeList, ...conjunctionList];

        const shuffled = [...pool].sort(() => 0.5 - Math.random());
        return shuffled.slice(0, Math.min(count, shuffled.length));
    }

    function renderProblems(problems) {
        problemsContainer.innerHTML = '';
        problems.forEach((problem, index) => {
            const div = document.createElement('div');
            div.className = 'calc-item';
            div.innerHTML = `
                <div class="calc-expr-box">
                    <span class="problem-index">(${index + 1})</span>
                    <label for="ans-${index}" class="problem-text">${problem.text}</label>
                </div>
                <div class="calc-input-box">
                    <input type="text" id="ans-${index}" class="input-answer-num" placeholder="こたえ" autocomplete="off">
                </div>
                <div id="feedback-${index}" class="feedback-text"></div>
            `;
            problemsContainer.appendChild(div);
        });
    }
});