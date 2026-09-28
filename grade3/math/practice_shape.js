document.addEventListener('DOMContentLoaded', () => {
    const setupSection = document.getElementById('setup-section');
    const quizSection = document.getElementById('quiz-section');
    const shapeTypeSelect = document.getElementById('shape-type');
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

    // --- 図形問題テンプレート generator ---
    const shapeProblemTemplates = [
        // 1. 二等辺三角形の辺の長さ（底辺が等長にならないようガードを追加）
        {
            category: 'triangle',
            generate: () => {
                const sameSide = getRandomInt(5, 12);
                
                // 底辺（baseSide）が sameSide と同じ値にならないようにループで再抽選
                let baseSide;
                do {
                    baseSide = getRandomInt(4, 10);
                } while (baseSide === sameSide);

                return {
                    text: '下の三角形は「二等辺三角形」です。あいている辺の長さは何cmですか。',
                    svg: `
                        <svg class="shape-svg" width="200" height="150" viewBox="0 0 200 150">
                            <!-- 三角形本体 -->
                            <polygon points="100,20 40,130 160,130" fill="#EBF8FF" stroke="#3182CE" stroke-width="3"/>
                            
                            <!-- 左斜辺の等長マーク（/） -->
                            <line x1="66" y1="71" x2="74" y2="79" stroke="#E53E3E" stroke-width="3"/>
                            
                            <!-- 右斜辺の等長マーク（\） -->
                            <line x1="126" y1="79" x2="134" y2="71" stroke="#E53E3E" stroke-width="3"/>

                            <!-- 辺の数値表示 -->
                            <text x="50" y="65" font-size="16" fill="#2D3748" font-weight="bold">${sameSide}cm</text>
                            <text x="135" y="65" font-size="16" fill="#E53E3E" font-weight="bold">？ cm</text>
                            <text x="95" y="145" font-size="16" fill="#2D3748" font-weight="bold">${baseSide}cm</text>
                        </svg>
                    `,
                    answer: sameSide.toString(),
                    unit: 'cm',
                    inputType: 'number'
                };
            }
        },
        // 2. 円の半径から直径を求める
        {
            category: 'circle',
            generate: () => {
                const radius = getRandomInt(3, 9);
                const diameter = radius * 2;
                return {
                    text: `半径が ${radius}cm の円があります。この円の「直径」は何cmですか。`,
                    svg: `
                        <svg class="shape-svg" width="160" height="160" viewBox="0 0 160 160">
                            <circle cx="80" cy="80" r="60" fill="#FEFCBF" stroke="#D69E2E" stroke-width="3"/>
                            <circle cx="80" cy="80" r="4" fill="#2D3748"/>
                            <line x1="80" y1="80" x2="140" y2="80" stroke="#E53E3E" stroke-width="2" stroke-dasharray="4"/>
                            <text x="100" y="75" font-size="14" fill="#E53E3E" font-weight="bold">${radius}cm</text>
                        </svg>
                    `,
                    answer: diameter.toString(),
                    unit: 'cm',
                    inputType: 'number'
                };
            }
        },
        // 3. 円の直径から半径を求める
        {
            category: 'circle',
            generate: () => {
                const radius = getRandomInt(3, 10);
                const diameter = radius * 2;
                return {
                    text: `直径が ${diameter}cm の円があります。この円の「半径」は何cmですか。`,
                    svg: `
                        <svg class="shape-svg" width="160" height="160" viewBox="0 0 160 160">
                            <circle cx="80" cy="80" r="60" fill="#E6FFFA" stroke="#319795" stroke-width="3"/>
                            <circle cx="80" cy="80" r="4" fill="#2D3748"/>
                            <line x1="20" y1="80" x2="140" y2="80" stroke="#319795" stroke-width="2"/>
                            <text x="70" y="75" font-size="14" fill="#319795" font-weight="bold">${diameter}cm</text>
                        </svg>
                    `,
                    answer: radius.toString(),
                    unit: 'cm',
                    inputType: 'number'
                };
            }
        },
        // 4. 三角形の種類の選択
        {
            category: 'triangle',
            generate: () => {
                const isEquilateral = Math.random() < 0.5;
                const sideA = getRandomInt(5, 9);
                const sideB = isEquilateral ? sideA : sideA;
                const sideC = isEquilateral ? sideA : getRandomInt(3, sideA - 1);

                return {
                    text: `3つの辺の長さが ${sideA}cm, ${sideB}cm, ${sideC}cm の三角形があります。この三角形の名前は何ですか。`,
                    svg: `
                        <svg class="shape-svg" width="180" height="140" viewBox="0 0 180 140">
                            <polygon points="90,20 30,120 150,120" fill="#FAF5FF" stroke="#805AD5" stroke-width="3"/>
                            <text x="45" y="65" font-size="13" fill="#2D3748">${sideA}cm</text>
                            <text x="125" y="65" font-size="13" fill="#2D3748">${sideB}cm</text>
                            <text x="80" y="135" font-size="13" fill="#2D3748">${sideC}cm</text>
                        </svg>
                    `,
                    answer: isEquilateral ? '正三角形' : '二等辺三角形',
                    options: ['二等辺三角形', '正三角形'],
                    inputType: 'select'
                };
            }
        },
        // 5. 箱の形（直方体・正六面体）の頂点・辺・面の数
        {
            category: 'box',
            generate: () => {
                const target = getRandomElement([
                    { name: '頂点（ちょうてん）', ans: '8' },
                    { name: '辺（へん）', ans: '12' },
                    { name: '面（めん）', ans: '6' }
                ]);

                return {
                    text: `下の箱（直方体）の ${target.name} はぜんぶでいくつありますか。`,
                    svg: `
                        <svg class="shape-svg" width="180" height="140" viewBox="0 0 180 140">
                            <path d="M 30 50 L 110 50 L 110 110 L 30 110 Z" fill="none" stroke="#4A5568" stroke-width="2"/>
                            <path d="M 70 20 L 150 20 L 150 80 L 70 80 Z" fill="none" stroke="#A0AEC0" stroke-width="2" stroke-dasharray="3"/>
                            <line x1="30" y1="50" x2="70" y2="20" stroke="#4A5568" stroke-width="2"/>
                            <line x1="110" y1="50" x2="150" y2="20" stroke="#4A5568" stroke-width="2"/>
                            <line x1="110" y1="110" x2="150" y2="80" stroke="#4A5568" stroke-width="2"/>
                            <line x1="30" y1="110" x2="70" y2="80" stroke="#A0AEC0" stroke-width="2" stroke-dasharray="3"/>
                        </svg>
                    `,
                    answer: target.ans,
                    unit: 'つ',
                    inputType: 'number'
                };
            }
        }
    ];

    restoreSessionState();

    startBtn.addEventListener('click', () => {
        const selectedCategory = shapeTypeSelect.value;
        const count = parseInt(problemCountSelect.value, 10);

        currentProblems = generateProblems(selectedCategory, count);
        saveSessionState({ problems: currentProblems, selectedCategory, count, submitted: false });
        renderProblems(currentProblems);

        setupSection.classList.add('hidden');
        quizSection.classList.remove('hidden');
        resultContainer.classList.add('hidden');
    });

    resetBtn.addEventListener('click', () => {
        sessionStorage.removeItem('grade3_practice_shape');
        quizSection.classList.add('hidden');
        setupSection.classList.remove('hidden');
        resultContainer.classList.add('hidden');
    });

    retryBtn.addEventListener('click', () => {
        sessionStorage.removeItem('grade3_practice_shape');
        quizSection.classList.add('hidden');
        setupSection.classList.remove('hidden');
        resultContainer.classList.add('hidden');
    });

    quizForm.addEventListener('submit', (e) => {
        e.preventDefault();

        let score = 0;
        const userAnswers = [];

        currentProblems.forEach((problem, index) => {
            let userVal = '';
            if (problem.inputType === 'select') {
                const checked = document.querySelector(`input[name="ans-${index}"]:checked`);
                userVal = checked ? checked.value : '';
            } else {
                const input = document.getElementById(`ans-${index}`);
                userVal = input ? input.value : '';
            }

            userAnswers.push(userVal);

            const isCorrect = (normalizeAnswer(userVal) === normalizeAnswer(problem.answer));
            if (isCorrect) score++;

            const feedbackEl = document.getElementById(`feedback-${index}`);
            if (feedbackEl) {
                if (isCorrect) {
                    feedbackEl.innerHTML = '<span class="correct">⭕ 正解！</span>';
                } else {
                    feedbackEl.innerHTML = `<span class="incorrect">❌ 残念！ 答え: ${problem.answer}${problem.unit || ''}</span>`;
                }
            }
        });

        const total = currentProblems.length;
        resultScore.textContent = `${total}問 うち ${score}問 正解！`;

        if (score === total) {
            resultMessage.textContent = '🎉 素晴らしい！ 図形マスターだね！';
        } else if (score >= total * 0.7) {
            resultMessage.textContent = '👍 お見事！ あと少しで 満点だよ！';
        } else {
            resultMessage.textContent = '💪 もう一度 チャレンジしてみよう！';
        }

        resultContainer.classList.remove('hidden');

        const selectedCategory = shapeTypeSelect.value;
        const count = parseInt(problemCountSelect.value, 10);
        saveSessionState({ problems: currentProblems, userAnswers, selectedCategory, count, submitted: true });
    });

    function generateProblems(category, count) {
        let available = shapeProblemTemplates;
        if (category !== 'all') {
            available = shapeProblemTemplates.filter(t => t.category === category);
        }

        const problems = [];
        for (let i = 0; i < count; i++) {
            const template = getRandomElement(available);
            problems.push(template.generate());
        }
        return problems;
    }

    function renderProblems(problems, userAnswers = []) {
        problemsContainer.innerHTML = '';
        problems.forEach((problem, index) => {
            const card = document.createElement('div');
            card.className = 'shape-problem-card';

            const savedVal = userAnswers[index] || '';

            let inputHtml = '';
            if (problem.inputType === 'select') {
                const optionsHtml = problem.options.map(opt => `
                    <label class="shape-option-label">
                        <input type="radio" name="ans-${index}" value="${opt}" ${savedVal === opt ? 'checked' : ''}>
                        ${opt}
                    </label>
                `).join('');

                inputHtml = `<div class="shape-options-grid">${optionsHtml}</div>`;
            } else {
                inputHtml = `
                    <input type="text" id="ans-${index}" class="input-answer-num" value="${escapeHTML(savedVal)}" placeholder="答え" autocomplete="off">
                    <span class="unit-text">${problem.unit || ''}</span>
                `;
            }

            card.innerHTML = `
                <div class="word-problem-text">
                    <strong>（${index + 1}）</strong> ${problem.text}
                </div>
                <div class="shape-display-area">
                    ${problem.svg}
                </div>
                <div class="word-input-container">
                    <div class="word-input-row">
                        <span class="word-input-label">答え：</span>
                        ${inputHtml}
                    </div>
                </div>
                <div id="feedback-${index}" class="feedback-text"></div>
            `;
            problemsContainer.appendChild(card);
        });
    }

    function saveSessionState(state) {
        sessionStorage.setItem('grade3_practice_shape', JSON.stringify(state));
    }

    function restoreSessionState() {
        const saved = sessionStorage.getItem('grade3_practice_shape');
        if (!saved) return;

        try {
            const state = JSON.parse(saved);
            if (state && state.problems && state.problems.length > 0) {
                currentProblems = state.problems;
                shapeTypeSelect.value = state.selectedCategory || 'all';
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