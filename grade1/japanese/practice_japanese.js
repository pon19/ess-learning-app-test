let currentPracticeProblems = [];

// 問題データベース（ランダム抽選用）
const PRACTICE_DB = {
    particle: [
        { text: "わたし（ ） がっこうへ いきます。", options: ["は", "を", "へ"], answer: "は", type: "radio" },
        { text: "ごはん（ ） たべます。", options: ["は", "を", "へ"], answer: "を", type: "radio" },
        { text: "こうえん（ ） あそびに いきます。", options: ["は", "を", "へ"], answer: "へ", type: "radio" },
        { text: "ほん（ ） よみます。", options: ["は", "を", "へ"], answer: "を", type: "radio" },
        { text: "ねこ（ ） かわいいです。", options: ["は", "を", "へ"], answer: "は", type: "radio" },
        { text: "おともだち（ ） てがみを かきます。", options: ["は", "を", "へ"], answer: "へ", type: "radio" }
    ],
    kanji: [
        { text: "「山」の よみかた", answer: "やま", type: "text" },
        { text: "「川」の よみかた", answer: "かわ", type: "text" },
        { text: "「木」の よみかた", answer: "き", type: "text" },
        { text: "「日」の よみかた", answer: "ひ", type: "text" },
        { text: "「月」の よみかた", answer: "つき", type: "text" },
        { text: "「水」の よみかた", answer: "みず", type: "text" },
        { text: "「火」の よみかた", answer: "ひ", type: "text" }
    ],
    opposite: [
        { text: "「おおきい」の はんたいの ことば", answer: "ちいさい", type: "text" },
        { text: "「うえ」の はんたいの ことば", answer: "した", type: "text" },
        { text: "「ながい」の はんたいの ことば", answer: "みじかい", type: "text" },
        { text: "「まえ」の はんたいの ことば", answer: "うしろ", type: "text" },
        { text: "「たかい」の はんたいの ことば", answer: "ひくい", type: "text" }
    ]
};

document.addEventListener('DOMContentLoaded', async () => {
    // ユーザー名表示
    const currentUser = await getCurrentUser();
    if (currentUser) {
        const nameBox = document.getElementById('userProfileName');
        if (nameBox) {
            const displayName = await getUserDisplayName(currentUser.id);
            nameBox.textContent = `なまえ： ${displayName} さん`;
        }
    }

    // リロード判定
    const navEntries = performance.getEntriesByType('navigation');
    const isReload = navEntries.length > 0 && navEntries[0].type === 'reload';

    if (isReload) {
        const isRestored = restoreSavedState();
        if (!isRestored) generateNewProblems();
    } else {
        sessionStorage.removeItem('practice_jp_problems');
        sessionStorage.removeItem('practice_jp_answers');
        generateNewProblems();
    }

    // ボタンイベント
    document.getElementById('generateBtn')?.addEventListener('click', () => {
        generateNewProblems();
        resetScoreDisplay();
    });

    document.getElementById('checkBtn')?.addEventListener('click', checkAnswers);
});

/**
 * 問題のランダム生成
 */
function generateNewProblems() {
    const typeSetting = document.getElementById('settingType').value;
    const count = parseInt(document.getElementById('settingCount').value, 10);

    let pool = [];
    if (typeSetting === 'all') {
        pool = [...PRACTICE_DB.particle, ...PRACTICE_DB.kanji, ...PRACTICE_DB.opposite];
    } else {
        pool = [...PRACTICE_DB[typeSetting]];
    }

    // シャッフル
    const shuffled = pool.sort(() => Math.random() - 0.5);
    currentPracticeProblems = shuffled.slice(0, Math.min(count, shuffled.length));

    sessionStorage.setItem('practice_jp_problems', JSON.stringify(currentPracticeProblems));
    sessionStorage.removeItem('practice_jp_answers');

    renderProblems(currentPracticeProblems);
}

/**
 * 画面描画
 */
function renderProblems(problems) {
    const container = document.getElementById('japaneseProblemArea');
    if (!container) return;

    container.innerHTML = '';

    problems.forEach((p, index) => {
        const div = document.createElement('div');
        div.className = 'word-card';

        let inputHtml = '';
        if (p.type === 'radio') {
            const optionsHtml = p.options.map(opt => `
                <label style="margin-right: 20px; font-size: 1.4rem; font-weight: bold; cursor: pointer;">
                    <input type="radio" name="jp_practice_${index}" value="${opt}" class="jp-input" data-index="${index}" style="transform: scale(1.4); margin-right: 6px;"> ${opt}
                </label>
            `).join('');
            inputHtml = `<div style="margin-top: 10px; margin-left: 20px;">${optionsHtml}</div>`;
        } else {
            inputHtml = `
                <div style="margin-top: 10px; margin-left: 20px; font-size: 1.3rem;">
                    こたえ：<input type="text" id="jp_input_${index}" class="input-eq-text jp-input" data-index="${index}" style="width: 160px; font-size: 1.4rem;" autocomplete="off">
                </div>
            `;
        }

        div.innerHTML = `
            <div class="word-text" style="font-size: 1.4rem;">
                <span class="problem-index">(${index + 1})</span> ${escapeHTML(p.text)}
            </div>
            ${inputHtml}
        `;
        container.appendChild(div);
    });

    // 入力監視（セッション保存）
    document.querySelectorAll('.jp-input').forEach(input => {
        input.addEventListener('change', saveInputState);
        input.addEventListener('input', saveInputState);
    });
}

/**
 * 入力状態の保存
 */
function saveInputState() {
    const answers = {};
    currentPracticeProblems.forEach((p, index) => {
        if (p.type === 'radio') {
            const selected = document.querySelector(`input[name="jp_practice_${index}"]:checked`);
            if (selected) answers[index] = selected.value;
        } else {
            const inputEl = document.getElementById(`jp_input_${index}`);
            if (inputEl) answers[index] = inputEl.value;
        }
    });
    sessionStorage.setItem('practice_jp_answers', JSON.stringify(answers));
}

/**
 * 状態復元
 */
function restoreSavedState() {
    const savedProblems = sessionStorage.getItem('practice_jp_problems');
    if (!savedProblems) return false;

    currentPracticeProblems = JSON.parse(savedProblems);
    renderProblems(currentPracticeProblems);

    const savedAnswers = sessionStorage.getItem('practice_jp_answers');
    if (savedAnswers) {
        const answers = JSON.parse(savedAnswers);
        Object.keys(answers).forEach(index => {
            const val = answers[index];
            const p = currentPracticeProblems[index];
            if (p && p.type === 'radio') {
                const radio = document.querySelector(`input[name="jp_practice_${index}"][value="${val}"]`);
                if (radio) radio.checked = true;
            } else {
                const inputEl = document.getElementById(`jp_input_${index}`);
                if (inputEl) inputEl.value = val;
            }
        });
    }
    return true;
}

/**
 * 採点
 */
function checkAnswers() {
    let correctCount = 0;

    currentPracticeProblems.forEach((p, index) => {
        let isCorrect = false;

        if (p.type === 'radio') {
            const selected = document.querySelector(`input[name="jp_practice_${index}"]:checked`);
            if (selected && selected.value === p.answer) {
                isCorrect = true;
            }
        } else {
            const inputEl = document.getElementById(`jp_input_${index}`);
            if (inputEl) {
                const userAns = normalizeText(inputEl.value);
                if (userAns === normalizeText(p.answer)) {
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

    const score = Math.round((correctCount / currentPracticeProblems.length) * 100);
    const scoreBox = document.getElementById('scoreBox');
    if (scoreBox) {
        scoreBox.style.display = 'block';
        scoreBox.innerHTML = `💮 てんすう： ${score} てん (${currentPracticeProblems.length}もんちゅう ${correctCount}もん せいかい) 💮`;
    }
}

function resetScoreDisplay() {
    const scoreBox = document.getElementById('scoreBox');
    if (scoreBox) {
        scoreBox.style.display = 'none';
        scoreBox.innerHTML = '';
    }
}

function normalizeText(str) {
    if (!str) return '';
    return str.replace(/[Ａ-Ｚａ-ｚ０-９]/g, (s) => String.fromCharCode(s.charCodeAt(0) - 0xFEE0)).replace(/\s+/g, '').trim();
}

function escapeHTML(str) {
    if (!str) return '';
    return str.replace(/[&<>'"]/g, tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag));
}