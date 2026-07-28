// ====================================================
// Supabase 設定
// ====================================================
const SUPABASE_URL = 'https://haljhrrjjignjjqrxezm.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhhbGpocnJqamlnbmpqcXJ4ZXptIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUxOTY0OTQsImV4cCI6MjEwMDc3MjQ5NH0.SH4lp7DnQKfYh1LxMHGTIIQwh2TNi6aatYn_z6kGOZA'; // ご自身の anon public キーを貼り付けてください

// Supabaseクライアントの初期化（設定済みのものを使用）
const clientSupabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// 画面読み込み時に名前とログイン状態を取得
async function loadUserProfile() {
    const nameDisplay = document.getElementById('userNameDisplay'); // 名前表示用の要素

    // ログイン中のユーザー情報を取得
    const { data: { session }, error: sessionError } = await clientSupabase.auth.getSession();

    if (sessionError || !session) {
        console.log("未ログイン状態のためindex.htmlへ移動します");
        // 未ログインの場合はトップページへ戻す（必要に応じて）
        // window.location.href = 'index.html';
        return;
    }

    const userId = session.user.id;

    // profiles テーブルから display_name を取得
    const { data: profile, error: profileError } = await clientSupabase
        .from('profiles')
        .select('display_name')
        .eq('id', userId)
        .maybeSingle();

    if (profileError) {
        console.error("プロフィール取得エラー:", profileError.message);
        if (nameDisplay) nameDisplay.textContent = 'なまえ：エラー';
        return;
    }

    if (profile && profile.display_name) {
        if (nameDisplay) nameDisplay.textContent = `なまえ：${profile.display_name}`;
    } else {
        if (nameDisplay) nameDisplay.textContent = 'なまえ：ゲスト';
    }
}

// ページ読み込み完了時に実行
document.addEventListener('DOMContentLoaded', () => {
    loadUserProfile();
});

// 状態管理変数
let currentUser = null;
let currentCalcAnswers = [];
let currentWordAnswers = [];

// ====================================================
// ページ読み込み時の初期化
// ====================================================
document.addEventListener('DOMContentLoaded', async () => {
    // ログイン状態のチェックとプロフィール取得
    await checkAuth();

    // 問題の初期生成
    generateProblems();

    // イベントリスナーの登録
    document.getElementById('checkBtn')?.addEventListener('click', checkAnswersAndSave);
    document.getElementById('resetBtn')?.addEventListener('click', generateProblems);
    document.getElementById('logoutBtn')?.addEventListener('click', handleLogout);
});

// ====================================================
// 1. 認証 ＆ プロフィール表示 ＆ リダイレクト処理
// ====================================================
async function checkAuth() {
    const { data: { session } } = await clientSupabase.auth.getSession();

    if (session) {
        currentUser = session.user;

        // ログアウトボタンを表示
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) logoutBtn.style.display = 'block';

        // profiles テーブルからユーザー名を取得
        const { data: profile } = await clientSupabase
            .from('profiles')
            .select('display_name')
            .eq('id', currentUser.id)
            .single();

        if (profile && profile.display_name) {
            const nameBox = document.getElementById('userProfileName');
            if (nameBox) nameBox.textContent = `なまえ：${profile.display_name}`;
        }

        // 成績履歴の読み込み
        loadScoreHistory();
    } else {
        // 未ログインの場合はトップページ（index.html）へ自動リダイレクト
        alert('ログインが必要です。トップページへ もどります。');
        window.location.href = 'index.html';
    }
}

// ログアウト処理
async function handleLogout() {
    await clientSupabase.auth.signOut();
    window.location.href = 'index.html';
}

// ====================================================
// 2. 問題生成ロジック
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
        card.className = 'calc-card';
        card.innerHTML = `
            <span class="calc-num">(${i + 1})</span>
            <span>${num1} ${op} ${num2} ＝</span>
            <input type="number" class="calc-input" id="calcInput_${i}">
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
            op: "+",
            getParams: () => {
                const a = Math.floor(Math.random() * 5) + 2;
                const b = Math.floor(Math.random() * 5) + 1;
                return { a, b, ans: a + b };
            }
        },
        {
            text: "公園に こどもが {a}にん いました。 {b}にん おうちに かえりました。のこりは なんにん ですか。",
            op: "-",
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
    wordCard.className = 'word-card';
    wordCard.innerHTML = `
        <p style="font-size: 1.1rem; margin-bottom: 12px; line-height: 1.6;">${problemText}</p>
        <div style="display:flex; align-items:center; gap:8px;">
            <span>しき：</span>
            <input type="text" style="width:120px; padding:6px; font-size:1rem; border:1px solid #ccc; border-radius:4px;" placeholder="例: ${p.a}${selected.op}${p.b}">
            <span>こたえ：</span>
            <input type="number" class="calc-input" id="wordInput_0">
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

    // 100点満点表記に調整（全問正解で100点）
    const finalScore = Math.round((score / 110) * 100);

    // 画面に点数を表示
    const scoreBox = document.getElementById('scoreBox');
    if (scoreBox) {
        scoreBox.style.display = 'block';
        scoreBox.innerHTML = `<h2>💮 てんすう： ${finalScore} てん 💮</h2>`;
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
            return `<div style="padding: 6px 0; border-bottom: 1px dashed #eee;">
                📅 ${date} — <strong>${item.score} 点</strong>
            </div>`;
        }).join('');
    } else {
        historyList.innerHTML = '<p style="color:#718096; margin:0;">まだ きろくが ありません。</p>';
    }
}