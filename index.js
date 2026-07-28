const SUPABASE_URL = 'https://haljhrrjjignjjqrxezm.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhhbGpocnJqamlnbmpqcXJ4ZXptIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUxOTY0OTQsImV4cCI6MjEwMDc3MjQ5NH0.SH4lp7DnQKfYh1LxMHGTIIQwh2TNi6aatYn_z6kGOZA';

const clientSupabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

document.addEventListener('DOMContentLoaded', async () => {
    checkAuthState();

    const modal = document.getElementById('authModal');
    const msg = document.getElementById('authMessage');

    // フォーム・案内表示要素群
    const loginForm = document.getElementById('loginForm');
    const signupForm = document.getElementById('signupForm');
    const resetRequestForm = document.getElementById('resetRequestForm');
    const findEmailNotice = document.getElementById('findEmailNotice');
    const updatePasswordForm = document.getElementById('updatePasswordForm');

    // モーダルの開閉イベント
    document.getElementById('openAuthModalBtn')?.addEventListener('click', () => {
        showForm(loginForm);
        modal.style.display = 'flex';
    });
    document.getElementById('closeModalBtn')?.addEventListener('click', () => modal.style.display = 'none');

    // 表示切り替えヘルパー関数
    function showForm(targetForm) {
        if (msg) msg.textContent = '';
        [loginForm, signupForm, resetRequestForm, findEmailNotice, updatePasswordForm].forEach(f => {
            if (f) f.style.display = 'none';
        });
        if (targetForm) targetForm.style.display = 'block';
    }

    // タブ切り替え
    const tabLogin = document.getElementById('tabLogin');
    const tabSignup = document.getElementById('tabSignup');

    tabLogin?.addEventListener('click', () => {
        tabLogin.style.color = '#3182ce';
        tabLogin.style.borderBottom = '2px solid #3182ce';
        tabSignup.style.color = '#718096';
        tabSignup.style.borderBottom = 'none';
        showForm(loginForm);
    });

    tabSignup?.addEventListener('click', () => {
        tabSignup.style.color = '#3182ce';
        tabSignup.style.borderBottom = '2px solid #3182ce';
        tabLogin.style.color = '#718096';
        tabLogin.style.borderBottom = 'none';
        showForm(signupForm);
    });

    // 画面切り替えリンクイベント
    document.getElementById('showResetLink')?.addEventListener('click', (e) => {
        e.preventDefault();
        showForm(resetRequestForm);
    });

    document.getElementById('showFindEmailLink')?.addEventListener('click', (e) => {
        e.preventDefault();
        showForm(findEmailNotice);
    });

    document.querySelectorAll('.btnBackToLogin').forEach(btn => {
        btn.addEventListener('click', () => showForm(loginForm));
    });

    // ----------------------------------------------------
    // 1. ログイン処理
    // ----------------------------------------------------
    loginForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;

        msg.style.color = 'black';
        msg.textContent = 'ログイン中...';

        const { error } = await clientSupabase.auth.signInWithPassword({ email, password });
        if (error) {
            msg.style.color = 'red';
            msg.textContent = `エラー: ${error.message}`;
        } else {
            msg.textContent = '';
            modal.style.display = 'none';
            checkAuthState();
        }
    });

    // ----------------------------------------------------
    // 2. 新規登録処理
    // ----------------------------------------------------
    signupForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('signupName').value.trim();
        const rawPhone = document.getElementById('signupPhone').value;
        // ハイフンやスペースを除去して数字だけ抽出 (例: "090-1234-5678" -> "09012345678")
        const phone = rawPhone.replace(/[^\d]/g, ''); 
        const email = document.getElementById('signupEmail').value.trim();
        const password = document.getElementById('signupPassword').value;

        // 簡単な電話番号チェック（10桁または11桁の数字か確認）
        if (phone.length < 10 || phone.length > 11) {
            msg.style.color = 'red';
            msg.textContent = 'エラー: 携帯番号を 正しく 入力してください。';
            return;
        }

        msg.style.color = 'black';
        msg.textContent = '登録中...';

        // 1. Supabase Auth にユーザー作成（メール＋パスワード）
        const { data, error } = await clientSupabase.auth.signUp({ email, password });

        if (error) {
            msg.style.color = 'red';
            msg.textContent = `エラー: ${error.message}`;
            return;
        }

        // 2. profiles テーブルに「なまえ」と「電話番号」を紐づけて保存
        if (data.user) {
            const { error: profileError } = await clientSupabase
                .from('profiles')
                .upsert([{ 
                    id: data.user.id, 
                    display_name: name,
                    phone: phone
                }]);

            if (profileError) {
                console.error('プロフィール保存エラー:', profileError.message);
            }
        }

        msg.style.color = 'green';
        msg.textContent = '登録 完了！';

        setTimeout(async () => {
            modal.style.display = 'none';
            await checkAuthState();
        }, 1000);
    });

    // ----------------------------------------------------
    // 3. パスワード再設定メールの送信要求
    // ----------------------------------------------------
    resetRequestForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('resetEmail').value;

        msg.style.color = 'black';
        msg.textContent = '送信中...';

        const { error } = await clientSupabase.auth.resetPasswordForEmail(email, {
            redirectTo: window.location.href
        });

        if (error) {
            msg.style.color = 'red';
            msg.textContent = `エラー: ${error.message}`;
        } else {
            msg.style.color = 'green';
            msg.textContent = '再設定用のメールを送信しました。メール内のリンクを開いてください。';
        }
    });

    // ----------------------------------------------------
    // 4. パスワード更新処理 (再設定メールのリンクから復帰時)
    // ----------------------------------------------------
    updatePasswordForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const newPassword = document.getElementById('newPasswordInput').value;

        msg.style.color = 'black';
        msg.textContent = 'パスワード更新中...';

        const { error } = await clientSupabase.auth.updateUser({ password: newPassword });

        if (error) {
            msg.style.color = 'red';
            msg.textContent = `エラー: ${error.message}`;
        } else {
            msg.style.color = 'green';
            msg.textContent = 'パスワードを変更しました！新しいパスワードでログインしてください。';
            setTimeout(() => {
                showForm(loginForm);
            }, 1500);
        }
    });

    // ----------------------------------------------------
    // 5. メールリンクからの復帰イベント（PASSWORD_RECOVERY）を監視
    // ----------------------------------------------------
    clientSupabase.auth.onAuthStateChange(async (event, session) => {
        if (event === 'PASSWORD_RECOVERY') {
            modal.style.display = 'flex';
            showForm(updatePasswordForm);
        }
    });

    // ログアウト処理
    document.getElementById('topLogoutBtn')?.addEventListener('click', async () => {
        await clientSupabase.auth.signOut();
        checkAuthState();
    });
});

// ログイン状態チェック関数
async function checkAuthState() {
    const { data: { session } } = await clientSupabase.auth.getSession();
    const userInfoArea = document.getElementById('userInfoArea');
    const authBtnArea = document.getElementById('authBtnArea');
    const welcomeMessage = document.getElementById('welcomeMessage');

    if (session) {
        if (userInfoArea) userInfoArea.style.display = 'block';
        if (authBtnArea) authBtnArea.style.display = 'none';

        const { data: profile } = await clientSupabase
            .from('profiles')
            .select('display_name')
            .eq('id', session.user.id)
            .single();

        const name = profile?.display_name || 'ゲスト';
        if (welcomeMessage) welcomeMessage.textContent = `ようこそ、${name} さん！`;
    } else {
        if (userInfoArea) userInfoArea.style.display = 'none';
        if (authBtnArea) authBtnArea.style.display = 'block';
    }
}