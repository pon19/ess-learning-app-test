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

    // --- 2年生向け 図形問題テンプレート generator ---
    const shapeProblemTemplates = [
        // 1. 三角形・四角形の名前当て問題
        {
            category: 'triangle_quad',
            generate: () => {
                const isTriangle = Math.random() < 0.5;
                const name = isTriangle ? '三角形' : '四角形';
                const svgContent = isTriangle
                    ? `<polygon points="90,20 30,120 150,120" fill="#EBF8FF" stroke="#3182CE" stroke-width="3"/>`
                    : `<polygon points="30,30 150,30 160,120 20,110" fill="#E6FFFA" stroke="#319795" stroke-width="3"/>`;

                return {
                    text: '直線で かこまれた 下の 形の 名前は 何ですか。',
                    svg: `
                        <svg class="shape-svg" width="180" height="140" viewBox="0 0 180 140">
                            ${svgContent}
                        </svg>
                    `,
                    answer: name,
                    options: ['三角形', '四角形'],
                    inputType: 'select'
                };
            }
        },
        // 2. 三角形・四角形の頂点や辺の数
        {
            category: 'triangle_quad',
            generate: () => {
                const isTriangle = Math.random() < 0.5;
                const shapeName = isTriangle ? '三角形' : '四角形';
                const target = getRandomElement([
                    { name: 'ちょうてん（頂点）', ans: isTriangle ? '3' : '4' },
                    { name: 'へん（辺）', ans: isTriangle ? '3' : '4' }
                ]);

                const svgContent = isTriangle
                    ? `<polygon points="90,20 30,120 150,120" fill="#FAF5FF" stroke="#805AD5" stroke-width="3"/>`
                    : `<polygon points="30,30 150,30 150,110 30,110" fill="#FEFCBF" stroke="#D69E2E" stroke-width="3"/>`;

                return {
                    text: `${shapeName} の ${target.name} はぜんぶでいくつありますか。`,
                    svg: `
                        <svg class="shape-svg" width="180" height="140" viewBox="0 0 180 140">
                            ${svgContent}
                        </svg>
                    `,
                    answer: target.ans,
                    unit: 'こ',
                    inputType: 'number'
                };
            }
        },
        // 3. 長方形・正方形の判別
        {
            category: 'rectangle_square',
            generate: () => {
                const isSquare = Math.random() < 0.5;
                const shapeName = isSquare ? '正方形' : '長方形';
                
                return {
                    text: isSquare 
                        ? '4つの かどが みんな 直角で、4つの へんの 長さが みんな 等しい 形は何ですか。'
                        : '4つの かどが みんな 直角で、向かいあう へんの 長さが 等しい 形は何ですか。',
                    svg: isSquare ? `
                        <svg class="shape-svg" width="160" height="140" viewBox="0 0 160 140">
                            <rect x="40" y="20" width="100" height="100" fill="#FEFCBF" stroke="#D69E2E" stroke-width="3"/>
                        </svg>
                    ` : `
                        <svg class="shape-svg" width="180" height="140" viewBox="0 0 180 140">
                            <rect x="20" y="35" width="140" height="70" fill="#EBF8FF" stroke="#3182CE" stroke-width="3"/>
                        </svg>
                    `,
                    answer: shapeName,
                    options: ['長方形', '正方形'],
                    inputType: 'select'
                };
            }
        },
        // 4. 正方形の直角の数
        {
            category: 'rectangle_square',
            generate: () => {
                return {
                    text: '長方形や 正方形には、「直角（ちょっかく）」は ぜんぶで いくつ ありますか。',
                    svg: `
                        <svg class="shape-svg" width="160" height="140" viewBox="0 0 160 140">
                            <rect x="30" y="25" width="100" height="90" fill="#E6FFFA" stroke="#319795" stroke-width="3"/>
                            <!-- 直角マーク -->
                            <path d="M 30 35 L 40 35 L 40 25" fill="none" stroke="#E53E3E" stroke-width="2"/>
                            <path d="M 120 25 L 120 35 L 130 35" fill="none" stroke="#E53E3E" stroke-width="2"/>
                            <path d="M 30 105 L 40 105 L 40 115" fill="none" stroke="#E53E3E" stroke-width="2"/>
                            <path d="M 120 115 L 120 105 L 130 105" fill="none" stroke="#E53E3E" stroke-width="2"/>
                        </svg>
                    `,
                    answer: '4',
                    unit: 'こ',
                    inputType: 'number'
                };
            }
        },
        // 5. 箱の形（めん・へん・ちょうてんの数）
        {
            category: 'box',
            generate: () => {
                const target = getRandomElement([
                    { name: 'ちょうてん（頂点）', ans: '8' },
                    { name: 'へん（辺）', ans: '12' },
                    { name: 'めん（面）', ans: '6' }
                ]);

                return {
                    text: `サイコロや ひごで つくった 箱の形（サイコロの形）の ${target.name} はぜんぶでいくつありますか。`,
                    svg: `
                        <svg class="shape-svg" width="180" height="140" viewBox="0 0 180 140">
                            <path d="M 40 40 L 110 40 L 110 110 L 40 110 Z" fill="none" stroke="#4A5568" stroke-width="2"/>
                            <path d="M 70 20 L 140 20 L 140 90 L 70 90 Z" fill="none" stroke="#A0AEC0" stroke-width="2" stroke-dasharray="3"/>
                            <line x1="40" y1="40" x2="70" y2="20" stroke="#4A5568" stroke-width="2"/>
                            <line x1="110" y1="40" x2="140" y2="20" stroke="#4A5568" stroke-width="2"/>
                            <line x1="110" y1="110" x2="140" y2="90" stroke="#4A5568" stroke-width="2"/>
                            <line x1="40" y1="110" x2="70" y2="90" stroke="#A0AEC0" stroke-width="2" stroke-dasharray="3"/>
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
        sessionStorage.removeItem('grade2_practice_shape');
        quizSection.classList.add('hidden');
        setupSection.classList.remove('hidden');
        resultContainer.classList.add('hidden');
    });

    retryBtn.addEventListener('click', () => {
        sessionStorage.removeItem('grade2_practice_shape');
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
            resultMessage.textContent = '🎉 素晴らしい！ ずけいマスターだね！';
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
        sessionStorage.setItem('grade2_practice_shape', JSON.stringify(state));
    }

    function restoreSessionState() {
        const saved = sessionStorage.getItem('grade2_practice_shape');
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