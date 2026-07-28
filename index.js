const SUPABASE_URL = 'https://haljhrrjjignjjqrxezm.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhhbGpocnJqamlnbmpqcXJ4ZXptIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUxOTY0OTQsImV4cCI6MjEwMDc3MjQ5NH0.SH4lp7DnQKfYh1LxMHGTIIQwh2TNi6aatYn_z6kGOZA'; // ご自身のanon key

const clientSupabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

document.addEventListener('DOMContentLoaded', async () => {
    checkAuthState();

    // モーダルの開閉イベント
    const modal = document.getElementById('authModal');
    document.getElementById('openAuthModalBtn')?.addEventListener('click', () => modal.style.display = 'flex');
    document.getElementById('closeModalBtn')?.addEventListener('click', () => modal.style.display = 'none');

    // タブ切り替え
    const tabLogin = document.getElementById('tabLogin');
    const tabSignup = document.getElementById('tabSignup');
    const loginForm = document.getElementById('loginForm');
    const signupForm = document.getElementById('signupForm');

    tabLogin?.addEventListener('click', () => {
        tabLogin.style.color = '#3182ce';
        tabLogin.style.borderBottom = '2px solid #3182ce';
        tabSignup.style.color = '#718096';
        tabSignup.style.borderBottom = 'none';
        loginForm.style.display = 'block';
        signupForm.style.display = 'none';
    });

    tabSignup?.addEventListener('click', () => {
        tabSignup.style.color = '#3182ce';
        tabSignup.style.borderBottom = '2px solid #3182ce';
        tabLogin.style.color = '#718096';
        tabLogin.style.borderBottom = 'none';
        signupForm.style.display = 'block';
        loginForm.style.display = 'none';
    });

    // ログイン処理
    loginForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;
        const msg = document.getElementById('authMessage');

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

    // 新規登録処理（Auth作成 ＋ profilesテーブルへの名前保存）
    signupForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('signupName').value;
        const email = document.getElementById('signupEmail').value;
        const password = document.getElementById('signupPassword').value;
        const msg = document.getElementById('authMessage');

        msg.style.color = 'black';
        msg.textContent = 'とうろく中...';

        // 1. Supabase Auth にユーザー作成
        const { data, error } = await clientSupabase.auth.signUp({ 
            email, 
            password 
        });

        if (error) {
            msg.style.color = 'red';
            msg.textContent = `エラー: ${error.message}`;
            return;
        }

        // 2. 作成されたユーザーの ID を使って profiles テーブルに名前を保存
        if (data.user) {
            const { error: profileError } = await clientSupabase
                .from('profiles')
                .upsert([
                    { 
                        id: data.user.id, 
                        display_name: name 
                    }
                ]);

            if (profileError) {
                console.error('プロフィール保存エラー:', profileError.message);
                msg.style.color = 'red';
                msg.textContent = `プロフィール保存エラー: ${profileError.message}`;
                return;
            }
        }

        msg.style.color = 'green';
        msg.textContent = 'とうろくが かんりょうしました！';
        
        setTimeout(async () => {
            modal.style.display = 'none';
            // 状態を再取得して画面更新
            await checkAuthState();
        }, 1000);
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
        // ログイン済み
        if (userInfoArea) userInfoArea.style.display = 'block';
        if (authBtnArea) authBtnArea.style.display = 'none';

        // プロフィール名取得
        const { data: profile } = await clientSupabase
            .from('profiles')
            .select('display_name')
            .eq('id', session.user.id)
            .single();

        const name = profile?.display_name || 'ゲスト';
        if (welcomeMessage) welcomeMessage.textContent = `ようこそ、${name} さん！`;
    } else {
        // 未ログイン
        if (userInfoArea) userInfoArea.style.display = 'none';
        if (authBtnArea) authBtnArea.style.display = 'block';
    }
}