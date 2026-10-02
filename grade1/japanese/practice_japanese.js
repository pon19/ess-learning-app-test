let currentPracticeProblems = [];
let practiceDb = {}; // JSONから読み込んだ国語問題を格納

document.addEventListener('DOMContentLoaded', async () => {
    // ユーザー名表示
    if (typeof getCurrentUser === 'function') {
        try {
            const currentUser = await getCurrentUser();
            if (currentUser) {
                const nameBox = document.getElementById('userProfileName');
                if (nameBox && typeof getUserDisplayName === 'function') {
                    const displayName = await getUserDisplayName(currentUser.id);
                    nameBox.textContent = `なまえ： ${displayName} さん`;
                }
            }
        } catch (e) {
            console.error('ユーザー情報取得エラー:', e);
        }
    }

    // JSONテンプレートの読み込み
    await loadTemplatesFromJSON();

    // ボタンイベントの設定
    const generateBtn = document.getElementById('generateBtn');
    if (generateBtn) {
        generateBtn.addEventListener('click', (e) => {
            e.preventDefault();
            generateNewProblems();
            resetScoreDisplay();
        });
    }

    const checkBtn = document.getElementById('checkBtn');
    if (checkBtn) {
        checkBtn.addEventListener('click', checkAnswers);
    }

    // リロード判定と初回読み込み
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
});

/**
 * problems_template.json から国語データを読み込む
 */
async function loadTemplatesFromJSON() {
    try {
        const response = await fetch('../../problems_template.json');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();

        if (data.japanese?.grade1?.practice_db) {
            practiceDb = data.japanese.grade1.practice_db;
        } else {
            console.warn('JSON内に国語問題のデータ構造が見つかりません。');
        }
    } catch (error) {
        console.error('テンプレートJSONの読み込みに失敗しました:', error);
    }
}

/**
 * 問題のランダム生成
 */
function generateNewProblems() {
    const typeEl = document.getElementById('settingType');
    const countEl = document.getElementById('settingCount');

    const typeSetting = typeEl ? typeEl.value : 'all';
    const count = countEl ? parseInt(countEl.value, 10) : 10;

    let pool = [];
    if (typeSetting === 'all') {
        Object.values(practiceDb).forEach(group => {
            if (Array.isArray(group)) {
                pool.push(...group);
            }
        });
    } else if (practiceDb[typeSetting]) {
        pool = [...practiceDb[typeSetting]];
    }

    if (pool.length === 0) return;

    // シャッフル処理
    const shuffled = [...pool].sort(() => Math.random() - 0.5);
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

/**
 * 文字列の正規化（全角英数変換・スペース除去・ひらがな/カタカナ相互許容）
 */
function normalizeText(str) {
    if (!str) return '';
    
    let normalized = str
        .replace(/[Ａ-Ｚａ-ｚ０-９]/g, (s) => String.fromCharCode(s.charCodeAt(0) - 0xFEE0))
        .replace(/\s+/g, '')
        .trim();

    return normalized.replace(/[\u3041-\u3096]/g, (ch) => 
        String.fromCharCode(ch.charCodeAt(0) + 0x60)
    );
}

function escapeHTML(str) {
    if (!str) return '';
    return str.replace(/[&<>'"]/g, tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag));
}