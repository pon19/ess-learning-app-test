let currentWordProblems = [];
let wordProblemTemplates = {}; // JSONから読み込んだテンプレートを格納

document.addEventListener('DOMContentLoaded', async () => {
    // ユーザー情報の表示
    const currentUser = await getCurrentUser();
    if (currentUser) {
        const nameBox = document.getElementById('userProfileName');
        if (nameBox) {
            const displayName = await getUserDisplayName(currentUser.id);
            nameBox.textContent = `なまえ： ${displayName} さん`;
        }
    }

    // 全選択・全解除ボタンのイベント設定
    document.getElementById('selectAllBtn')?.addEventListener('click', () => setAllCheckboxes(true));
    document.getElementById('deselectAllBtn')?.addEventListener('click', () => setAllCheckboxes(false));

    // 外部JSONテンプレートの読み込み
    await loadTemplatesFromJSON();

    // リロード判定
    const navEntries = performance.getEntriesByType('navigation');
    const isReload = navEntries.length > 0 && navEntries[0].type === 'reload';

    if (isReload) {
        const isRestored = restoreSavedState();
        if (!isRestored) generateNewProblems();
    } else {
        sessionStorage.removeItem('practice_word_problems');
        sessionStorage.removeItem('practice_word_answers');
        sessionStorage.removeItem('practice_word_settings');
        generateNewProblems();
    }

    // イベント登録
    document.getElementById('generateBtn')?.addEventListener('click', () => {
        generateNewProblems();
        resetScoreDisplay();
    });

    document.getElementById('checkBtn')?.addEventListener('click', checkAnswers);
});

/**
 * problems_template.json からテンプレートを読み込む
 */
async function loadTemplatesFromJSON() {
    try {
        // パスはファイル位置に合わせて調整してください
        const response = await fetch('../../problems_template.json');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();

        if (data.math?.grade1?.word_templates) {
            wordProblemTemplates = data.math.grade1.word_templates;
        } else {
            console.warn('JSON内に指定のテンプレート構造が見つかりません。');
        }
    } catch (error) {
        console.error('テンプレートJSONの読み込みに失敗しました:', error);
    }
}

function setAllCheckboxes(checked) {
    const checkboxes = document.querySelectorAll('input[name="unit"]');
    checkboxes.forEach(cb => cb.checked = checked);
}

/**
 * 選択されている単元の配列を取得
 */
function getSelectedUnits() {
    const checkboxes = document.querySelectorAll('input[name="unit"]:checked');
    return Array.from(checkboxes).map(cb => cb.value);
}

/**
 * ランダム文章問題の生成
 */
function generateNewProblems() {
    const selectedUnits = getSelectedUnits();

    // ⚠️ 単元が1つも選択されていない場合のガード処理
    if (selectedUnits.length === 0) {
        alert('たんげんを 1ツイジョウ えらんでね！');
        return;
    }

    const count = parseInt(document.getElementById('settingCount').value, 10);

    currentWordProblems = [];

    for (let i = 0; i < count; i++) {
        const unit = selectedUnits[Math.floor(Math.random() * selectedUnits.length)];
        const templates = wordProblemTemplates[unit] || wordProblemTemplates['basic_add'];

        if (!templates || templates.length === 0) continue;

        const tpl = templates[Math.floor(Math.random() * templates.length)];

        let problemData = buildProblemFromTemplate(unit, tpl);
        problemData.id = i + 1;
        currentWordProblems.push(problemData);
    }

    sessionStorage.setItem('practice_word_problems', JSON.stringify(currentWordProblems));
    sessionStorage.setItem('practice_word_settings', JSON.stringify({ selectedUnits, count }));
    sessionStorage.removeItem('practice_word_answers');

    renderWordProblems(currentWordProblems);
}

/**
 * テンプレートと単元から具体的な数値・文章・解法を生成
 */
function buildProblemFromTemplate(unit, tpl) {
    let p1, p2, p3, answer, eqStr, text;
    let items = tpl.items || [];
    let item = items.length > 0 ? items[Math.floor(Math.random() * items.length)] : '';

    switch (unit) {
        case 'basic_add':
            p1 = Math.floor(Math.random() * 8) + 1;
            p2 = Math.floor(Math.random() * (10 - p1)) + 1;
            answer = p1 + p2;
            eqStr = `${p1}+${p2}`;
            break;

        case 'basic_sub':
            p1 = Math.floor(Math.random() * 9) + 2;
            p2 = Math.floor(Math.random() * (p1 - 1)) + 1;
            answer = p1 - p2;
            eqStr = `${p1}-${p2}`;
            break;

        case 'advanced_add':
            p1 = Math.floor(Math.random() * 8) + 3; // 3〜10
            p2 = Math.floor(Math.random() * 8) + (11 - p1); // 合計11〜18
            answer = p1 + p2;
            eqStr = `${p1}+${p2}`;
            break;

        case 'advanced_sub':
            answer = Math.floor(Math.random() * 8) + 2; // 2〜9
            p2 = Math.floor(Math.random() * 8) + (11 - answer); // 繰り下がりが発生する引き去り数
            p1 = answer + p2; // 11〜18
            eqStr = `${p1}-${p2}`;
            break;

        case 'three_nums':
            if (tpl.type === 'three_add') {
                p1 = Math.floor(Math.random() * 4) + 1;
                p2 = Math.floor(Math.random() * 4) + 1;
                p3 = Math.floor(Math.random() * 4) + 1;
                answer = p1 + p2 + p3;
                eqStr = `${p1}+${p2}+${p3}`;
            } else if (tpl.type === 'three_sub') {
                p1 = Math.floor(Math.random() * 5) + 6; // 6〜10
                p2 = Math.floor(Math.random() * 3) + 1;
                p3 = Math.floor(Math.random() * (p1 - p2 - 1)) + 1;
                answer = p1 - p2 - p3;
                eqStr = `${p1}-${p2}-${p3}`;
            } else {
                p1 = Math.floor(Math.random() * 5) + 3;
                p2 = Math.floor(Math.random() * 4) + 1;
                p3 = Math.floor(Math.random() * (p1 + p2 - 1)) + 1;
                answer = p1 + p2 - p3;
                eqStr = `${p1}+${p2}-${p3}`;
            }
            break;

        case 'compare':
            p1 = Math.floor(Math.random() * 5) + 5; // 大きい方
            p2 = Math.floor(Math.random() * (p1 - 1)) + 1; // 小さい方
            answer = p1 - p2;
            eqStr = `${p1}-${p2}`;
            break;
    }

    text = tpl.text
        .replace('{p1}', p1)
        .replace('{p2}', p2)
        .replace('{p3}', p3)
        .replace(/{item}/g, item)
        .replace(/{person}/g, item);

    return { text, equation: eqStr, answer };
}

/**
 * 文章問題の描画（＋ / － ボタン対応）
 */
function renderWordProblems(wordProblems) {
    const wordProblemArea = document.getElementById('wordProblemArea');
    if (!wordProblemArea) return;

    wordProblemArea.innerHTML = '';

    wordProblems.forEach((wp, index) => {
        const div = document.createElement('div');
        div.className = 'word-card';

        div.innerHTML = `
            <div class="word-text">
                <span class="problem-index">(${index + 1})</span>
                ${escapeHTML(wp.text)}
            </div>
            <div class="word-formula-group">
                <div class="equation-input-group">
                    しき：<input type="text" id="wp_eq_${index}" class="input-eq-text wp-input" data-index="${index}" data-type="eq" inputmode="text" autocomplete="off">
                    <div class="symbol-btn-group">
                        <button type="button" class="btn-symbol" onclick="insertSymbol('wp_eq_${index}', '+')">＋</button>
                        <button type="button" class="btn-symbol" onclick="insertSymbol('wp_eq_${index}', '-')">－</button>
                    </div>
                </div>
                <div class="answer-input-group">
                    こたえ：<input type="number" id="wp_ans_${index}" class="input-answer-num wp-input" data-index="${index}" data-type="ans" inputmode="numeric">
                </div>
            </div>
        `;
        wordProblemArea.appendChild(div);
    });

    document.querySelectorAll('.wp-input').forEach(input => {
        input.addEventListener('input', saveInputState);
    });
}

/**
 * 指定された入力欄のカーソル位置に記号を挿入
 */
function insertSymbol(inputId, symbol) {
    const input = document.getElementById(inputId);
    if (!input) return;

    input.focus();

    const start = input.selectionStart ?? input.value.length;
    const end = input.selectionEnd ?? input.value.length;

    const val = input.value;
    input.value = val.substring(0, start) + symbol + val.substring(end);

    const newPos = start + symbol.length;
    input.setSelectionRange(newPos, newPos);

    saveInputState();
}

window.insertSymbol = insertSymbol;

/**
 * 入力状態の自動保持
 */
function saveInputState() {
    const answers = {};
    document.querySelectorAll('.wp-input').forEach(input => {
        const idx = input.getAttribute('data-index');
        const type = input.getAttribute('data-type');
        if (!answers[idx]) answers[idx] = {};
        answers[idx][type] = input.value;
    });
    sessionStorage.setItem('practice_word_answers', JSON.stringify(answers));
}

/**
 * リロード時の状態復元
 */
function restoreSavedState() {
    const savedProblems = sessionStorage.getItem('practice_word_problems');
    const savedSettings = sessionStorage.getItem('practice_word_settings');

    if (!savedProblems) return false;

    if (savedSettings) {
        const { selectedUnits, count } = JSON.parse(savedSettings);
        if (selectedUnits) {
            const checkboxes = document.querySelectorAll('input[name="unit"]');
            checkboxes.forEach(cb => {
                cb.checked = selectedUnits.includes(cb.value);
            });
        }
        if (document.getElementById('settingCount') && count) {
            document.getElementById('settingCount').value = count;
        }
    }

    currentWordProblems = JSON.parse(savedProblems);
    renderWordProblems(currentWordProblems);

    const savedAnswers = sessionStorage.getItem('practice_word_answers');
    if (savedAnswers) {
        const answers = JSON.parse(savedAnswers);
        Object.keys(answers).forEach(idx => {
            const eqInput = document.getElementById(`wp_eq_${idx}`);
            const ansInput = document.getElementById(`wp_ans_${idx}`);
            if (eqInput && answers[idx].eq) eqInput.value = answers[idx].eq;
            if (ansInput && answers[idx].ans) ansInput.value = answers[idx].ans;
        });
    }

    return true;
}

/**
 * 採点処理
 */
function checkAnswers() {
    let correctCount = 0;

    currentWordProblems.forEach((wp, index) => {
        const ansInput = document.getElementById(`wp_ans_${index}`);
        const eqInput = document.getElementById(`wp_eq_${index}`);
        if (!ansInput) return;

        const userAns = parseInt(ansInput.value, 10);
        let isAnsCorrect = !isNaN(userAns) && userAns === wp.answer;

        if (isAnsCorrect) {
            correctCount++;
            ansInput.style.borderColor = '#48bb78';
            ansInput.style.backgroundColor = '#f0fff4';
        } else {
            ansInput.style.borderColor = '#e53e3e';
            ansInput.style.backgroundColor = '#fff5f5';
        }

        if (eqInput) {
            const normalizedUserEq = normalizeEquation(eqInput.value);
            const normalizedTargetEq = normalizeEquation(wp.equation);

            if (normalizedUserEq === normalizedTargetEq) {
                eqInput.style.borderColor = '#48bb78';
                eqInput.style.backgroundColor = '#f0fff4';
            } else {
                eqInput.style.borderColor = '#e53e3e';
                eqInput.style.backgroundColor = '#fff5f5';
            }
        }
    });

    const score = Math.round((correctCount / currentWordProblems.length) * 100);
    const scoreBox = document.getElementById('scoreBox');
    if (scoreBox) {
        scoreBox.style.display = 'block';
        scoreBox.innerHTML = `💮 てんすう： ${score} てん (${currentWordProblems.length}もんちゅう ${correctCount}もん せいかい) 💮`;
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
 * 入力された文字列の全角英数・記号を半角に変換し、スペースを除去
 */
function normalizeEquation(str) {
    if (!str) return '';
    return str
        .replace(/[Ａ-Ｚａ-ｚ０-９]/g, (s) => String.fromCharCode(s.charCodeAt(0) - 0xFEE0))
        .replace(/＋/g, '+')
        .replace(/[－ー-]/g, '-')
        .replace(/\s+/g, '');
}

/**
 * エスケープ処理
 */
function escapeHTML(str) {
    if (!str) return '';
    return str.replace(/[&<>'"]/g, tag => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        "'": '&#39;',
        '"': '&quot;'
    }[tag] || tag));
}