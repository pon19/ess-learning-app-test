let currentProblems = [];

document.addEventListener('DOMContentLoaded', async () => {
    // ユーザー情報の表示処理
    const currentUser = await getCurrentUser();
    if (currentUser) {
        const nameBox = document.getElementById('userProfileName');
        if (nameBox) {
            const displayName = await getUserDisplayName(currentUser.id);
            nameBox.textContent = `なまえ： ${displayName} さん`;
        }
    }

    // ページ遷移（リロードか直リンク・メニュー遷移か）の判定
    const navEntries = performance.getEntriesByType('navigation');
    const isReload = navEntries.length > 0 && navEntries[0].type === 'reload';

    if (isReload) {
        // 【リロード時】保存された問題状態を復元する
        const isRestored = restoreSavedState();
        if (!isRestored) {
            // 保存データがない場合の保険として新規生成
            generateNewProblems();
        }
    } else {
        // 【メニューからのアクセスなど】セッションストレージをリセットして初期状態（新規問題生成）にする
        sessionStorage.removeItem('practice_math_problems');
        sessionStorage.removeItem('practice_math_answers');
        sessionStorage.removeItem('practice_math_settings');
        generateNewProblems();
    }

    // イベント設定：「問題を作る」ボタン
    document.getElementById('generateBtn')?.addEventListener('click', () => {
        generateNewProblems();
        resetScoreDisplay();
    });

    // イベント設定：「こたえあわせ」ボタン
    document.getElementById('checkBtn')?.addEventListener('click', checkAnswers);
});

/**
 * ユーザー設定値を取得して計算問題を自動生成
 */
function generateNewProblems() {
    const opSetting = document.getElementById('settingOp').value;
    const maxVal = parseInt(document.getElementById('settingRange').value, 10);
    const count = parseInt(document.getElementById('settingCount').value, 10);

    currentProblems = [];

    for (let i = 0; i < count; i++) {
        let isAddition = true;
        if (opSetting === 'add') {
            isAddition = true;
        } else if (opSetting === 'sub') {
            isAddition = false;
        } else {
            isAddition = Math.random() > 0.5;
        }

        if (isAddition) {
            // 足し算：答えが maxVal 以下になるように調整
            const p1 = Math.floor(Math.random() * (maxVal - 1)) + 1;
            const p2 = Math.floor(Math.random() * (maxVal - p1)) + 1;
            currentProblems.push({ p1, p2, operator: '＋', answer: p1 + p2 });
        } else {
            // 引き算：答えが 0 以上かつ p1 <= maxVal になるように調整
            const p1 = Math.floor(Math.random() * maxVal) + 1;
            const p2 = Math.floor(Math.random() * p1) + 1;
            currentProblems.push({ p1, p2, operator: '－', answer: p1 - p2 });
        }
    }

    // 問題データと設定値を sessionStorage に保存
    sessionStorage.setItem('practice_math_problems', JSON.stringify(currentProblems));
    sessionStorage.setItem('practice_math_settings', JSON.stringify({
        opSetting,
        maxVal,
        count
    }));
    // 前回の入力内容・採点結果は消去
    sessionStorage.removeItem('practice_math_answers');

    renderProblems(currentProblems);
}

/**
 * 問題の描画処理
 */
function renderProblems(problems) {
    const calcGrid = document.getElementById('calcGrid');
    if (!calcGrid) return;
    calcGrid.innerHTML = '';

    problems.forEach((p, index) => {
        const div = document.createElement('div');
        div.className = 'calc-item';
        div.innerHTML = `
            <div>
                <span class="problem-index">(${index + 1})</span>
                <span>${p.p1} ${p.operator} ${p.p2} ＝</span>
            </div>
            <input type="number" id="answer_${index}" class="calc-input input-answer-num" data-index="${index}" pattern="\\d*" inputmode="numeric">
        `;
        calcGrid.appendChild(div);
    });

    // 入力欄のイベント登録（入力されるたびに状態を自動保存）
    document.querySelectorAll('.calc-input').forEach(input => {
        input.addEventListener('input', saveInputState);
    });
}

/**
 * 現在の入力欄の状態を sessionStorage に一時保存する
 */
function saveInputState() {
    const answers = {};
    document.querySelectorAll('.calc-input').forEach(input => {
        const idx = input.getAttribute('data-index');
        answers[idx] = input.value;
    });
    sessionStorage.setItem('practice_math_answers', JSON.stringify(answers));
}

/**
 * リロード時に sessionStorage から問題・設定・入力欄を復元する
 */
function restoreSavedState() {
    const savedProblems = sessionStorage.getItem('practice_math_problems');
    const savedSettings = sessionStorage.getItem('practice_math_settings');

    if (!savedProblems) return false;

    // 1. 設定値の復元
    if (savedSettings) {
        const { opSetting, maxVal, count } = JSON.parse(savedSettings);
        if (document.getElementById('settingOp')) document.getElementById('settingOp').value = opSetting;
        if (document.getElementById('settingRange')) document.getElementById('settingRange').value = maxVal;
        if (document.getElementById('settingCount')) document.getElementById('settingCount').value = count;
    }

    // 2. 問題の復元
    currentProblems = JSON.parse(savedProblems);
    renderProblems(currentProblems);

    // 3. 入力値の復元
    const savedAnswers = sessionStorage.getItem('practice_math_answers');
    if (savedAnswers) {
        const answers = JSON.parse(savedAnswers);
        Object.keys(answers).forEach(idx => {
            const input = document.getElementById(`answer_${idx}`);
            if (input) {
                input.value = answers[idx];
            }
        });
    }

    return true;
}

/**
 * 採点処理
 */
function checkAnswers() {
    let correctCount = 0;
    currentProblems.forEach((problem, index) => {
        const inputEl = document.getElementById(`answer_${index}`);
        if (!inputEl) return;
        const userAnswer = parseInt(inputEl.value, 10);

        if (!isNaN(userAnswer) && userAnswer === problem.answer) {
            correctCount++;
            inputEl.style.borderColor = '#48bb78';
            inputEl.style.backgroundColor = '#f0fff4';
        } else {
            inputEl.style.borderColor = '#e53e3e';
            inputEl.style.backgroundColor = '#fff5f5';
        }
    });

    const score = Math.round((correctCount / currentProblems.length) * 100);
    const scoreBox = document.getElementById('scoreBox');
    if (scoreBox) {
        scoreBox.style.display = 'block';
        scoreBox.innerHTML = `💮 てんすう： ${score} てん (${currentProblems.length}もんちゅう ${correctCount}もん せいかい) 💮`;
    }
}

/**
 * 得点表示リセット
 */
function resetScoreDisplay() {
    const scoreBox = document.getElementById('scoreBox');
    if (scoreBox) {
        scoreBox.style.display = 'none';
        scoreBox.innerHTML = '';
    }
}