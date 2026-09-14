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
            generateNewProblems();
        }
    } else {
        // 【メニューからのアクセスなど】初期化して新規問題生成
        sessionStorage.removeItem('practice_math_problems');
        sessionStorage.removeItem('practice_math_answers');
        sessionStorage.removeItem('practice_math_settings');
        generateNewProblems();
    }

    // イベント設定：「全選択」「全解除」ボタン
    document.getElementById('selectAllBtn')?.addEventListener('click', () => {
        toggleAllCheckboxes(true);
    });

    document.getElementById('deselectAllBtn')?.addEventListener('click', () => {
        toggleAllCheckboxes(false);
    });

    // イベント設定：「問題を作る」ボタン
    document.getElementById('generateBtn')?.addEventListener('click', () => {
        generateNewProblems();
        resetScoreDisplay();
    });

    // イベント設定：「こたえあわせ」ボタン
    document.getElementById('checkBtn')?.addEventListener('click', checkAnswers);
});

/**
 * チェックボックスの一括切替
 */
function toggleAllCheckboxes(checked) {
    document.querySelectorAll('input[name="unit"]').forEach(cb => {
        cb.checked = checked;
    });
}

/**
 * チェックされた単元からランダムに問題を自動生成
 */
function generateNewProblems() {
    const checkedBoxes = Array.from(document.querySelectorAll('input[name="unit"]:checked'));
    const checkedUnits = checkedBoxes.map(el => el.value);
    const count = parseInt(document.getElementById('settingCount').value, 10);

    // 未選択エラーハンドリング
    if (checkedUnits.length === 0) {
        alert('たんげんを 1つ いじょう えらんでね！');
        return;
    }

    currentProblems = [];

    for (let i = 0; i < count; i++) {
        // チェックされた単元の中から1つをランダム選出
        const selectedUnit = checkedUnits[Math.floor(Math.random() * checkedUnits.length)];
        const problem = createProblemByUnit(selectedUnit);
        currentProblems.push(problem);
    }

    // 問題データと設定値を sessionStorage に保存
    sessionStorage.setItem('practice_math_problems', JSON.stringify(currentProblems));
    sessionStorage.setItem('practice_math_settings', JSON.stringify({
        units: checkedUnits,
        count
    }));
    sessionStorage.removeItem('practice_math_answers');

    renderProblems(currentProblems);
}

/**
 * 単元別の計算問題生成ロジック（1年生通年）
 */
function createProblemByUnit(unit) {
    let p1, p2, p3, answer;

    switch (unit) {
        case 'basic_add': // 10までのたしざん（くりあがりなし）
            answer = Math.floor(Math.random() * 9) + 2; // 2〜10
            p1 = Math.floor(Math.random() * (answer - 1)) + 1;
            p2 = answer - p1;
            return { displayText: `${p1} ＋ ${p2} ＝`, answer };

        case 'basic_sub': // 10までのひきざん（くりさがりなし）
            p1 = Math.floor(Math.random() * 9) + 2; // 2〜10
            p2 = Math.floor(Math.random() * (p1 - 1)) + 1;
            return { displayText: `${p1} － ${p2} ＝`, answer: p1 - p2 };

        case 'advanced_add': // くりあがりのあるたしざん（答え 11〜18）
            p1 = Math.floor(Math.random() * 8) + 2; // 2〜9
            p2 = Math.floor(Math.random() * (9 - (10 - p1) + 1)) + (10 - p1);
            return { displayText: `${p1} ＋ ${p2} ＝`, answer: p1 + p2 };

        case 'advanced_sub': // くりさがりのあるひきざん（11〜18から引く）
            answer = Math.floor(Math.random() * 8) + 2; // 答え 2〜9
            p2 = Math.floor(Math.random() * 8) + 2;     // 引く数 2〜9
            p1 = answer + p2;                           // 引かれる数 11〜18
            return { displayText: `${p1} － ${p2} ＝`, answer };

        case 'three_nums': // 3つの数の計算
            const isAddFirst = Math.random() > 0.5;
            p1 = Math.floor(Math.random() * 5) + 3;
            p2 = Math.floor(Math.random() * 3) + 1;
            p3 = Math.floor(Math.random() * 3) + 1;

            if (isAddFirst) {
                return { displayText: `${p1} ＋ ${p2} － ${p3} ＝`, answer: p1 + p2 - p3 };
            } else {
                return { displayText: `${p1} － ${p2} ＋ ${p3} ＝`, answer: p1 - p2 + p3 };
            }

        case 'large_nums': // 大きい数（100まで）
            if (Math.random() < 0.5) {
                // 何十 ＋ 何十 （例: 30 + 40）
                p1 = (Math.floor(Math.random() * 6) + 1) * 10;
                p2 = (Math.floor(Math.random() * (9 - p1 / 10)) + 1) * 10;
                return { displayText: `${p1} ＋ ${p2} ＝`, answer: p1 + p2 };
            } else {
                // 何十 ＋ 何 （例: 40 + 6）
                p1 = (Math.floor(Math.random() * 8) + 1) * 10;
                p2 = Math.floor(Math.random() * 9) + 1;
                return { displayText: `${p1} ＋ ${p2} ＝`, answer: p1 + p2 };
            }

        default:
            return { displayText: `1 ＋ 1 ＝`, answer: 2 };
    }
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
                <span>${p.displayText}</span>
            </div>
            <input type="number" id="answer_${index}" class="calc-input input-answer-num" data-index="${index}" pattern="\\d*" inputmode="numeric">
        `;
        calcGrid.appendChild(div);
    });

    document.querySelectorAll('.calc-input').forEach(input => {
        input.addEventListener('input', saveInputState);
    });
}

/**
 * 現在の入力欄の状態を sessionStorage に一時保存
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
 * リロード時に sessionStorage から復元
 */
function restoreSavedState() {
    const savedProblems = sessionStorage.getItem('practice_math_problems');
    const savedSettings = sessionStorage.getItem('practice_math_settings');

    if (!savedProblems) return false;

    // 1. 設定値（チェックボックスと問題数）の復元
    if (savedSettings) {
        const { units, count } = JSON.parse(savedSettings);
        if (units) {
            document.querySelectorAll('input[name="unit"]').forEach(cb => {
                cb.checked = units.includes(cb.value);
            });
        }
        if (document.getElementById('settingCount')) {
            document.getElementById('settingCount').value = count;
        }
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