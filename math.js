// ====================================================
// Supabase 設定
// ====================================================
const SUPABASE_URL = 'https://haljhrrjjignjjqrxezm.supabase.co';
// ★★★ ご自身の anon key を貼り付けてください ★★★
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhhbGpocnJqamlnbmpqcXJ4ZXptIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUxOTY0OTQsImV4cCI6MjEwMDc3MjQ5NH0.SH4lp7DnQKfYh1LxMHGTIIQwh2TNi6aatYn_z6kGOZA';

// Supabaseクライアントの初期化
const clientSupabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// 状態管理変数
let currentUser = null;
let currentCalcAnswers = [];
let currentWordAnswers = [];

// ====================================================
// ページ読み込み時の初期化
// ====================================================
document.addEventListener('DOMContentLoaded', () => {
    // 1. 問題の初期生成
    generateProblems();

    // 2. イベントリスナーの登録
    document.getElementById('checkBtn')?.addEventListener('click', checkAnswersAndSave);
    document.getElementById('resetBtn')?.addEventListener('click', generateProblems);
    document.getElementById('logoutBtn')?.addEventListener('click', handleLogout);

    // 3. 認証状態の監視（セッション復元完了を待ってからプロフィールを取得）
    clientSupabase.auth.onAuthStateChange(async (event, session) => {
        if (session) {
            currentUser = session.user;
            
            // ログアウトボタンを表示
            const logoutBtn = document.getElementById('logoutBtn');
            if (logoutBtn) logoutBtn.style.display = 'block';

            // プロフィール取得 ＆ 成績履歴読み込み
            await fetchUserProfile(currentUser.id);
            await loadScoreHistory();
        } else if (event === 'SIGNED_OUT' || (event === 'INITIAL_SESSION' && !session)) {
            // 未ログインが確定した場合のみリダイレクト
            alert('ログインが必要です。トップページへ もどります。');
            window.location.href = 'index.html';
        }
    });
});

// ====================================================
// 1. 認証 ＆ プロフィール表示 ＆ ログアウト処理
// ====================================================
async function fetchUserProfile(userId) {
    const { data: profile, error } = await clientSupabase
        .from('profiles')
        .select('display_name')
        .eq('id', userId)
        .maybeSingle();

    if (error) {
        console.error('プロフィール取得エラー:', error.message);
        return;
    }

    const nameText = (profile && profile.display_name) ? `なまえ：${profile.display_name}` : 'なまえ：ゲスト';

    const nameBox1 = document.getElementById('userNameDisplay');
    const nameBox2 = document.getElementById('userProfileName');
    if (nameBox1) nameBox1.textContent = nameText;
    if (nameBox2) nameBox2.textContent = nameText;
}

// ログアウト処理
async function handleLogout() {
    await clientSupabase.auth.signOut();
    window.location.href = 'index.html';
}

// ====================================================
// 2. 問題生成ロジック（CSSクラス名をスタイルシートへ最適化）
// ====================================================
function generateProblems() {
    // 画面のリセット
    const scoreBox = document.getElementById('scoreBox');
    if (scoreBox) scoreBox.style.display = 'none';

    // ---- A. 計算問題 (10問) ----
    const calcGrid = document.getElementById('calcGrid');
    if (!calcGrid) return;
    
    calcGrid.innerHTML = '';
    currentCalcAnswers = [];

    for (let i = 0; i < 10; i++) {
        const isAddition = Math.random() > 0.3; // 70% たし算, 30% ひき算
        let num1, num2, ans, op;

        if (isAddition) {
            num1 = Math.floor(Math.random() * 9) + 1;
            num2 = Math.floor(Math.random() * 9) + 1;
            ans = num1 + num2;
            op = '＋';
        } else {
            num1 = Math.floor(Math.random() * 9) + 2;
            num2 = Math.floor(Math.random() * (num1 - 1)) + 1;
            ans = num1 - num2;
            op = '－';
        }

        currentCalcAnswers.push(ans);

        const card = document.createElement('div');
        card.className = 'calc-box'; // style.cssに合わせ「calc-box」へ修正
        card.innerHTML = `
            <span>(${i + 1}) ${num1} ${op} ${num2} ＝</span>
            <input type="number" class="input-num" id="calcInput_${i}">
        `;
        calcGrid.appendChild(card);
    }

    // ---- B. 文章問題 (1問) ----
    const wordArea = document.getElementById('wordProblemArea');
    if (!wordArea) return;

    wordArea.innerHTML = '';
    currentWordAnswers = [];

    const wordTemplates = [
        {
            text: "りんごが {a}こ あります。おとうとから {b}こ もらいました。あわせて なんこに なりましたか。",
            emoji: "🍎",
            op: "＋",
            getParams: () => {
                const a = Math.floor(Math.random() * 5) + 2;
                const b = Math.floor(Math.random() * 5) + 1;
                return { a, b, ans: a + b };
            }
        },
        {
            text: "こうえんに こどもが {a}にん いました。 {b}にん おうちに かえりました。のこりは なんにん ですか。",
            emoji: "👦👧",
            op: "－",
            getParams: () => {
                const a = Math.floor(Math.random() * 6) + 4;
                const b = Math.floor(Math.random() * (a - 1)) + 1;
                return { a, b, ans: a - b };
            }
        }
    ];

    const selected = wordTemplates[Math.floor(Math.random() * wordTemplates.length)];
    const p = selected.getParams();
    currentWordAnswers.push(p.ans);

    const problemText = selected.text.replace('{a}', p.a).replace('{b}', p.b);

    const wordCard = document.createElement('div');
    wordCard.className = 'problem-card'; // style.cssに合わせ「problem-card」へ修正
    wordCard.innerHTML = `
        <div class="problem-header">
            <div class="problem-num">1</div>
            <div class="problem-text">${problemText}</div>
        </div>
        <div class="illustration-box">
            ${selected.emoji.repeat(Math.min(p.a, 8))}
        </div>
        <div class="formula-area">
            <span class="formula-label">しき：</span>
            <input type="text" class="input-num" style="width: 100px; font-size: 16px;" placeholder="${p.a}${selected.op}${p.b}">
            <span style="margin-left: 15px;">こたえ：</span>
            <input type="number" class="input-num" id="wordInput_0">
        </div>
    `;
    wordArea.appendChild(wordCard);
}

// ====================================================
// 3. 採点 ＆ Supabaseへの成績自動保存
// ====================================================
async function checkAnswersAndSave() {
    let score = 0;

    // 計算問題の採点
    currentCalcAnswers.forEach((ans, i) => {
        const input = document.getElementById(`calcInput_${i}`);
        if (input && parseInt(input.value) === ans) {
            score += 10;
        }
    });

    // 文章問題の採点
    const wordInput = document.getElementById(`wordInput_0`);
    if (wordInput && parseInt(wordInput.value) === currentWordAnswers[0]) {
        score += 10;
    }

    // 100点満点表記に調整
    const finalScore = Math.round((score / 110) * 100);

    // 画面に点数を表示
    const scoreBox = document.getElementById('scoreBox');
    if (scoreBox) {
        scoreBox.style.display = 'block';
        scoreBox.className = 'score-display'; // スタイル用クラスの追加
        scoreBox.style.background = '#e6fffa';
        scoreBox.style.border = '2px solid #319795';
        scoreBox.style.color = '#234e52';
        scoreBox.innerHTML = `💮 てんすう： <strong>${finalScore}</strong> てん 💮`;
    }

    // ログイン中の場合、Supabase (math_scores_pb) に保存
    if (currentUser) {
        const { error } = await clientSupabase
            .from('math_scores_pb')
            .insert([
                {
                    user_id: currentUser.id,
                    score: finalScore
                }
            ]);

        if (error) {
            console.error('成績保存エラー:', error.message);
        } else {
            // 履歴一覧を更新
            loadScoreHistory();
        }
    }
}

// ====================================================
// 4. 成績履歴の読み込みと表示
// ====================================================
async function loadScoreHistory() {
    const historyList = document.getElementById('historyList');
    if (!historyList || !currentUser) return;

    const { data, error } = await clientSupabase
        .from('math_scores_pb')
        .select('*')
        .eq('user_id', currentUser.id)
        .order('created_at', { ascending: false })
        .limit(5);

    if (error) {
        console.error('履歴取得エラー:', error.message);
        return;
    }

    if (data && data.length > 0) {
        historyList.innerHTML = data.map(item => {
            const date = new Date(item.created_at).toLocaleString('ja-JP', {
                month: 'numeric',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
            return `<div style="padding: 8px 0; border-bottom: 1px dashed #e2e8f0; font-size: 14px;">
                📅 <strong>${date}</strong> — 点数: <span style="color: #dd6b20; font-weight: bold;">${item.score}点</span>
            </div>`;
        }).join('');
    } else {
        historyList.innerHTML = '<p style="color:#718096; margin:0; font-size:14px;">まだ きろくが ありません。</p>';
    }
}