let currentWordProblems = [];

// 文章問題の生成テンプレート
const WORD_PROBLEM_TEMPLATES = {
    add: [
        { text: "{item}が {p1}こ あります。{item}を {p2}こ もらいました。あわせて いくつに なりますか。", items: ["りんご", "みかん", "キャンディー", "クッキー"], op: "+" },
        { text: "{person}さんが {p1}にん いました。あとから {p2}にん きました。みんなで なんにんに なりましたか。", items: ["こども", "おともだち"], op: "+" },
        { text: "赤い {item}が {p1}こ、青い {item}が {p2}こ あります。ぜんぶで いくつ ありますか。", items: ["ボール", "おはじき", "つみき"], op: "+" }
    ],
    sub: [
        { text: "{item}が {p1}こ あります。{p2}こ たべました。のこりは いくつですか。", items: ["いちご", "パン", "チョコレート"], op: "-" },
        { text: "こうえんに {person}が {p1}にん いました。{p2}にん かえりました。のこりは なんにんですか。", items: ["こども", "おともだち"], op: "-" },
        { text: "折り紙を {p1}まい もっていました。{p2}まい つかいました。のこりは なんまいですか。", items: ["おりがみ"], op: "-" }
    ]
};

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
 * ランダム文章問題の生成
 */
function generateNewProblems() {
    const opSetting = document.getElementById('settingOp').value;
    const count = parseInt(document.getElementById('settingCount').value, 10);

    currentWordProblems = [];

    for (let i = 0; i < count; i++) {
        let isAddition = opSetting === 'add' ? true : (opSetting === 'sub' ? false : Math.random() > 0.5);
        let list = isAddition ? WORD_PROBLEM_TEMPLATES.add : WORD_PROBLEM_TEMPLATES.sub;
        let tpl = list[Math.floor(Math.random() * list.length)];

        let p1, p2, answer, eqStr;
        if (isAddition) {
            p1 = Math.floor(Math.random() * 8) + 1;
            p2 = Math.floor(Math.random() * (10 - p1)) + 1; // 合計10以下
            answer = p1 + p2;
            eqStr = `${p1}+${p2}`;
        } else {
            p1 = Math.floor(Math.random() * 9) + 2;
            p2 = Math.floor(Math.random() * (p1 - 1)) + 1; // 答えが1以上
            answer = p1 - p2;
            eqStr = `${p1}-${p2}`;
        }

        let item = tpl.items[Math.floor(Math.random() * tpl.items.length)];
        let text = tpl.text
            .replace('{p1}', p1)
            .replace('{p2}', p2)
            .replace(/{item}/g, item)
            .replace(/{person}/g, item);

        currentWordProblems.push({
            id: i + 1,
            text,
            equation: eqStr,
            answer
        });
    }

    sessionStorage.setItem('practice_word_problems', JSON.stringify(currentWordProblems));
    sessionStorage.setItem('practice_word_settings', JSON.stringify({ opSetting, count }));
    sessionStorage.removeItem('practice_word_answers');

    renderWordProblems(currentWordProblems);
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
                <div class="equation-input-group" style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                    しき：<input type="text" id="wp_eq_${index}" class="input-eq-text wp-input" data-index="${index}" data-type="eq" inputmode="text" autocomplete="off" style="width: 120px;">
                    <div class="symbol-btn-group" style="display: inline-flex; gap: 6px;">
                        <button type="button" class="btn-symbol" onclick="insertSymbol('wp_eq_${index}', '+')">＋</button>
                        <button type="button" class="btn-symbol" onclick="insertSymbol('wp_eq_${index}', '-')">－</button>
                    </div>
                </div>
                <div style="margin-top: 8px;">
                    こたえ：<input type="number" id="wp_ans_${index}" class="input-answer-num wp-input" data-index="${index}" data-type="ans" inputmode="numeric" style="width: 80px;">
                </div>
            </div>
        `;
        wordProblemArea.appendChild(div);
    });

    // 入力監視イベント追加（入力時にセッション保存）
    document.querySelectorAll('.wp-input').forEach(input => {
        input.addEventListener('input', saveInputState);
    });
}

/**
 * 指定された入力欄のカーソル位置（または末尾）に記号を挿入する関数
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

    // 記号ボタンを押した時も入力を一時保存
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
        const { opSetting, count } = JSON.parse(savedSettings);
        if (document.getElementById('settingOp')) document.getElementById('settingOp').value = opSetting;
        if (document.getElementById('settingCount')) document.getElementById('settingCount').value = count;
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
 * 入力された文字列の全角英数・記号を半角に変換し、スペースを除去する関数
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