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

    // 初回ロード時の自動生成
    generateNewProblems();

    // イベント設定
    document.getElementById('generateBtn')?.addEventListener('click', () => {
        generateNewProblems();
        resetScoreDisplay();
    });

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
        div.style.cssText = 'display:flex; align-items:center; justify-content:space-between; padding:12px 0; border-bottom:1px solid #e2e8f0; font-size:1.3rem; font-weight:bold;';
        div.innerHTML = `
            <div>
                <span style="color:#718096; font-size:1rem; margin-right:10px;">(${index + 1})</span>
                <span>${p.p1} ${p.operator} ${p.p2} ＝</span>
            </div>
            <input type="number" id="answer_${index}" style="width:70px; height:40px; font-size:1.3rem; text-align:center; border:2px solid #cbd5e0; border-radius:8px;" pattern="\\d*">
        `;
        calcGrid.appendChild(div);
    });
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
        scoreBox.style.padding = '15px';
        scoreBox.style.marginTop = '20px';
        scoreBox.style.background = '#e6fffa';
        scoreBox.style.border = '2px solid #319795';
        scoreBox.style.color = '#234e52';
        scoreBox.style.fontSize = '1.2rem';
        scoreBox.style.fontWeight = 'bold';
        scoreBox.style.borderRadius = '8px';
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