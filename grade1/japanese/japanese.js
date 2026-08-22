// グローバル変数
let currentParticleProblems = []; 
let currentKanjiProblems = []; 
let currentUser = null;    

// ====================================================
// 1. 初期化処理
// ====================================================
document.addEventListener('DOMContentLoaded', async () => {
    const supabaseClient = typeof clientSupabase !== 'undefined' ? clientSupabase : (typeof supabase !== 'undefined' ? supabase : null);

    // ユーザー情報の取得と本日回答済みチェック
    if (supabaseClient) {
        try {
            const { data: { user } } = await supabaseClient.auth.getUser();
            if (user) {
                currentUser = user;
                const nameBox = document.getElementById('userProfileName');
                if (nameBox) {
                    const displayName = await getUserDisplayName(currentUser.id);
                    nameBox.textContent = `なまえ： ${displayName} さん`;
                }

                // ★ 本日すでに送信済みかチェック (subject: 'japanese')
                const todayScore = await checkTodaySubmitted(currentUser.id, 1);
                if (todayScore) {
                    showAlreadySubmittedView(todayScore);
                    return;
                }
            }
        } catch (err) {
            console.error('ユーザー認証・初期チェックエラー:', err);
        }
    }

    // 答え合わせボタンのイベント設定
    document.getElementById('checkBtn')?.addEventListener('click', checkAnswersAndSave);

    // 今日の問題を読み込み（DBまたは予備問題）
    await loadTodayProblems();
});

// ====================================================
// 2. 本日の送信履歴を取得（重複チェック）
// ====================================================
async function checkTodaySubmitted(userId, grade) {
    const supabaseClient = typeof clientSupabase !== 'undefined' ? clientSupabase : (typeof supabase !== 'undefined' ? supabase : null);
    if (!supabaseClient) return null;

    try {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const todayStr = `${year}-${month}-${day}`;

        const { data, error } = await supabaseClient
            .from('learning_scores_test')
            .select('*')
            .eq('user_id', userId)
            .eq('grade', grade)
            .eq('subject', 'japanese')
            .eq('created_date', todayStr)
            .maybeSingle();

        if (error) {
            console.error('履歴チェックエラー:', error);
            return null;
        }
        return data;
    } catch (e) {
        console.error('履歴チェック例外エラー:', e);
        return null;
    }
}

// ====================================================
// 3. 回答済みの場合の画面表示制御
// ====================================================
function showAlreadySubmittedView(scoreData) {
    const particleArea = document.getElementById('particleArea');
    const kanjiArea = document.getElementById('kanjiArea');
    const checkBtn = document.getElementById('checkBtn');
    const scoreBox = document.getElementById('scoreBox');

    const sectionTitles = document.querySelectorAll('.section-title');
    sectionTitles.forEach(title => title.style.setProperty('display', 'none', 'important'));

    if (particleArea) particleArea.style.setProperty('display', 'none', 'important');
    if (kanjiArea) kanjiArea.style.setProperty('display', 'none', 'important');
    if (checkBtn) checkBtn.style.setProperty('display', 'none', 'important');

    if (scoreBox) {
        scoreBox.style.display = 'block';
        scoreBox.innerHTML = `
            <h2>💮 きょうの こくご チャレンジは すでに かんりょう しています！</h2>
            <p style="font-size: 1.25rem; font-weight: bold; margin: 15px 0; color: #2b6cb0;">
                てんすう： ${scoreData.score} てん
            </p>
            <p style="color: #4a5568; margin-top: 10px;">また あした ちょうせんしてね！ 💮</p>
        `;
    }
}

// ====================================================
// 4. 今日の問題を取得
// ====================================================
async function loadTodayProblems() {
    // 予備問題を初期表示データとする
    currentParticleProblems = getFallbackParticleProblems();
    currentKanjiProblems = getFallbackKanjiProblems();

    renderParticleProblems(currentParticleProblems);
    renderKanjiProblems(currentKanjiProblems);
}

// ====================================================
// 5. 助詞（は・を・へ）問題の描画（ラジオボタン形式）
// ====================================================
function renderParticleProblems(problems) {
    const area = document.getElementById('particleArea');
    if (!area) return;
    area.innerHTML = '';

    problems.forEach((p, index) => {
        const div = document.createElement('div');
        div.className = 'word-card';
        
        const optionsHtml = p.options.map(opt => `
            <label style="margin-right: 20px; font-size: 1.4rem; font-weight: bold; cursor: pointer;">
                <input type="radio" name="part_${index}" value="${opt}" style="transform: scale(1.4); margin-right: 6px;"> ${opt}
            </label>
        `).join('');

        div.innerHTML = `
            <div class="word-text" style="font-size: 1.4rem; margin-bottom: 12px;">
                <span class="problem-index">(${index + 1})</span> ${escapeHTML(p.text)}
            </div>
            <div style="margin-left: 24px;">${optionsHtml}</div>
        `;
        area.appendChild(div);
    });
}

// ====================================================
// 6. 漢字読み問題の描画（テキスト入力形式）
// ====================================================
function renderKanjiProblems(problems) {
    const area = document.getElementById('kanjiArea');
    if (!area) return;
    area.innerHTML = '';

    problems.forEach((p, index) => {
        const div = document.createElement('div');
        div.className = 'word-card';

        div.innerHTML = `
            <div class="word-text" style="font-size: 1.4rem; margin-bottom: 12px;">
                <span class="problem-index">(${index + 1})</span> 「<strong>${escapeHTML(p.kanji)}</strong>」の よみかた
            </div>
            <div style="margin-left: 24px; font-size: 1.3rem;">
                こたえ：<input type="text" id="kanji_ans_${index}" class="input-eq-text" style="width: 150px; font-size: 1.4rem;" autocomplete="off">
            </div>
        `;
        area.appendChild(div);
    });
}

// ====================================================
// 7. 答え合わせ ＆ 成績保存
// ====================================================
async function checkAnswersAndSave() {
    const checkBtn = document.getElementById('checkBtn');
    if (checkBtn) checkBtn.disabled = true;

    let correctCount = 0;
    const totalCount = currentParticleProblems.length + currentKanjiProblems.length;

    // 助詞採点
    currentParticleProblems.forEach((p, index) => {
        const selected = document.querySelector(`input[name="part_${index}"]:checked`);
        if (selected && selected.value === p.answer) {
            correctCount++;
        }
    });

    // 漢字採点
    currentKanjiProblems.forEach((p, index) => {
        const inputEl = document.getElementById(`kanji_ans_${index}`);
        if (!inputEl) return;
        inputEl.disabled = true;

        const userAns = normalizeText(inputEl.value);
        if (userAns === normalizeText(p.answer)) {
            correctCount++;
            inputEl.style.borderColor = '#48bb78';
            inputEl.style.backgroundColor = '#f0fff4';
        } else {
            inputEl.style.borderColor = '#e53e3e';
            inputEl.style.backgroundColor = '#fff5f5';
        }
    });

    const score = Math.round((correctCount / totalCount) * 100);

    const scoreBox = document.getElementById('scoreBox');
    if (scoreBox) {
        scoreBox.style.display = 'block';
        scoreBox.innerHTML = `💮 てんすう： ${score} てん (${totalCount}もんちゅう ${correctCount}もん せいかい) 💮`;
    }

    const supabaseClient = typeof clientSupabase !== 'undefined' ? clientSupabase : (typeof supabase !== 'undefined' ? supabase : null);
    if (currentUser && supabaseClient) {
        try {
            await supabaseClient
                .from('learning_scores_test')
                .insert([{
                    user_id: currentUser.id,
                    grade: 1,
                    subject: 'japanese',
                    score: score,
                    total_questions: totalCount
                }]);
        } catch (e) {
            console.error('成績保存エラー:', e);
        }
    }
}

// ====================================================
// 予備問題データ
// ====================================================
function getFallbackParticleProblems() {
    return [
        { text: "わたし（ ） がっこうへ いきます。", options: ["は", "を", "へ"], answer: "は" },
        { text: "ごはん（ ） たべます。", options: ["は", "を", "へ"], answer: "を" },
        { text: "こうえん（ ） あそびに いきます。", options: ["は", "を", "へ"], answer: "へ" },
        { text: "ほん（ ） よみます。", options: ["は", "を", "へ"], answer: "を" },
        { text: "ねこ（ ） かわいいです。", options: ["は", "を", "へ"], answer: "は" }
    ];
}

function getFallbackKanjiProblems() {
    return [
        { kanji: "山", answer: "やま" },
        { kanji: "川", answer: "かわ" },
        { kanji: "木", answer: "き" },
        { kanji: "日", answer: "ひ" },
        { kanji: "月", answer: "つき" }
    ];
}

function normalizeText(str) {
    if (!str) return '';
    return str.replace(/[Ａ-Ｚａ-ｚ０-９]/g, (s) => String.fromCharCode(s.charCodeAt(0) - 0xFEE0)).replace(/\s+/g, '').trim();
}

function escapeHTML(str) {
    if (!str) return '';
    return str.replace(/[&<>'"]/g, tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag));
}