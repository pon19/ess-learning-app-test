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
        let text = tpl.text.replace('{p1}', p1).replace('{p2}', p2).replace('{item}', item).replace('{person}', item);

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
 * 画面描画
 */
function renderWordProblems(wordProblems) {
    const area = document.getElementById('wordProblemArea');
    if (!area) return;
    area.innerHTML = '';

    wordProblems.forEach((wp, index) => {
        const div = document.createElement('div');
        div.style.cssText = 'padding:15px; margin-bottom:15px; background-color:#f7fafc; border-radius:8px; border:1px solid #e2e8f0;';

        div.innerHTML = `
            <div style="font-size: 1.2rem; font-weight: bold; margin-bottom: 15px; line-height: 1.5;">
                <span style="color: #718096; font-size: 1rem; margin-right: 5px;">(${index + 1})</span>
                ${wp.text}
            </div>
            <div style="display: flex; gap: 15px; align-items: center; justify-content: flex-end; font-size: 1.2rem; font-weight: bold; flex-wrap: wrap;">
                しき：<input type="text" id="wp_eq_${index}" class="wp-input" data-index="${index}" data-type="eq" style="width: 120px; height: 40px; font-size: 1.2rem; text-align: center; border: 2px solid #cbd5e0; border-radius: 8px;">
                こたえ：<input type="number" id="wp_ans_${index}" class="wp-input" data-index="${index}" data-type="ans" style="width: 70px; height: 40px; font-size: 1.2rem; text-align: center; border: 2px solid #cbd5e0; border-radius: 8px;">
            </div>
        `;
        area.appendChild(div);
    });

    document.querySelectorAll('.wp-input').forEach(input => {
        input.addEventListener('input', saveInputState);
    });
}

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
 * 採点処理（数値を優先判定）
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

        // 式の入力判定（半角・全角記号を正規化して比較）
        if (eqInput) {
            let userEq = eqInput.value.replace(/\s+/g, '').replace(/＋/g, '+').replace(/－/g, '-');
            if (userEq === wp.equation) {
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
        scoreBox.style.padding = '15px';
        scoreBox.style.marginTop = '20px';
        scoreBox.style.background = '#e6fffa';
        scoreBox.style.border = '2px solid #319795';
        scoreBox.style.color = '#234e52';
        scoreBox.style.fontSize = '1.2rem';
        scoreBox.style.fontWeight = 'bold';
        scoreBox.style.borderRadius = '8px';
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