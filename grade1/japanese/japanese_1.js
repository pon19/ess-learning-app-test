let currentJapaneseProblems = [];

document.addEventListener('DOMContentLoaded', () => {
    // 問題の読み込み（または自動生成）
    loadJapaneseProblems();

    // 採点ボタン
    document.getElementById('checkBtn')?.addEventListener('click', checkAnswers);
});

/**
 * 1年生向け国語問題データ
 */
function loadJapaneseProblems() {
    currentJapaneseProblems = [
        {
            id: 1,
            type: 'particles', // 助詞問題
            question: 'わたし（ ） がっこうへ いきます。',
            options: ['は', 'を', 'へ'],
            answer: 'は'
        },
        {
            id: 2,
            type: 'kanji', // 漢字の読み
            question: '「山」の よみかたを ひらがなで かきましょう。',
            answer: 'やま'
        },
        {
            id: 3,
            type: 'opposite', // 反対のことば
            question: '「おおきい」の はんたいの ことばは？',
            answer: 'ちいさい'
        }
    ];

    renderProblems(currentJapaneseProblems);
}

/**
 * 問題の描画処理
 */
function renderProblems(problems) {
    const container = document.getElementById('japaneseProblemArea');
    if (!container) return;

    container.innerHTML = '';

    problems.forEach((p, index) => {
        const card = document.createElement('div');
        card.className = 'word-card';

        let inputHtml = '';
        if (p.type === 'particles') {
            // 選択肢（ラジオボタン形式またはセレクトボックス）
            const optionsHtml = p.options.map(opt => `
                <label style="margin-right: 15px; font-size: 1.3rem; cursor: pointer;">
                    <input type="radio" name="jp_ans_${index}" value="${opt}" style="transform: scale(1.3);"> ${opt}
                </label>
            `).join('');
            inputHtml = `<div style="margin-top: 10px;">${optionsHtml}</div>`;
        } else {
            // テキスト入力形式
            inputHtml = `
                <div style="margin-top: 10px;">
                    こたえ：<input type="text" id="jp_ans_${index}" class="input-eq-text" style="width: 160px; font-size: 1.4rem;" autocomplete="off">
                </div>
            `;
        }

        card.innerHTML = `
            <div class="word-text">
                <span class="problem-index">(${index + 1})</span>
                ${escapeHTML(p.question)}
            </div>
            ${inputHtml}
        `;
        container.appendChild(card);
    });
}

/**
 * 採点処理
 */
function checkAnswers() {
    let correctCount = 0;

    currentJapaneseProblems.forEach((p, index) => {
        let isCorrect = false;

        if (p.type === 'particles') {
            const selected = document.querySelector(`input[name="jp_ans_${index}"]:checked`);
            if (selected && selected.value === p.answer) {
                isCorrect = true;
            }
        } else {
            const inputEl = document.getElementById(`jp_ans_${index}`);
            if (inputEl) {
                const userAns = normalizeText(inputEl.value);
                const targetAns = normalizeText(p.answer);
                if (userAns === targetAns) {
                    isCorrect = true;
                    inputEl.style.borderColor = '#48bb78';
                    inputEl.style.backgroundColor = '#f0fff4';
                } else {
                    inputEl.style.borderColor = '#e53e3e';
                    inputEl.style.backgroundColor = '#fff5f5';
                }
            }
        }

        if (isCorrect) correctCount++;
    });

    const score = Math.round((correctCount / currentJapaneseProblems.length) * 100);
    const scoreBox = document.getElementById('scoreBox');
    if (scoreBox) {
        scoreBox.style.display = 'block';
        scoreBox.innerHTML = `💮 てんすう： ${score} てん (${currentJapaneseProblems.length}もんちゅう ${correctCount}もん せいかい) 💮`;
    }
}

/**
 * ひらがな・カタカナ・全角半角の表記揺れ防止
 */
function normalizeText(str) {
    if (!str) return '';
    return str
        .replace(/[Ａ-Ｚａ-ｚ０-９]/g, (s) => String.fromCharCode(s.charCodeAt(0) - 0xFEE0))
        .replace(/\s+/g, '')
        .trim();
}

function escapeHTML(str) {
    if (!str) return '';
    return str.replace(/[&<>'"]/g, tag => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
    }[tag] || tag));
}