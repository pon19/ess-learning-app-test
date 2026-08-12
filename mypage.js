document.addEventListener('DOMContentLoaded', async () => {
    // 1. ログインチェック
    const user = await getCurrentUser();
    if (!user) {
        alert('ログインが必要です。');
        window.location.href = 'index.html';
        return;
    }

    // 2. DOM要素の取得
    const displayNameView = document.getElementById('displayNameView');
    const phoneView = document.getElementById('phoneView');
    const gradeView = document.getElementById('gradeView');
    const nicknameInput = document.getElementById('mypageNickname');
    const emailInput = document.getElementById('mypageEmail');
    const passwordInput = document.getElementById('mypagePassword');
    const updateForm = document.getElementById('updateProfileForm');
    const msg = document.getElementById('mypageMsg');
    const backBtn = document.getElementById('backBtn');

    if (emailInput) {
        emailInput.value = user.email || '';
    }

    // ----------------------------------------------------
    // 3. プロフィール情報 & 学年データの取得（自動進級処理含む）
    // ----------------------------------------------------
    const { displayName, gradeLabel } = await getUserProfileInfo(user.id);

    // DB から display_name, phone を取得
    const { data: profile, error } = await clientSupabase
        .from('profiles')
        .select('display_name, phone')
        .eq('id', user.id)
        .maybeSingle();

    if (error) {
        console.error('プロフィール取得エラー:', error);
    }

    // 画面表示へ反映
    if (displayNameView) displayNameView.textContent = profile?.display_name || '（未設定）';
    if (phoneView) phoneView.textContent = profile?.phone || '（未設定）';
    if (gradeView) gradeView.textContent = gradeLabel || '未設定';
    if (nicknameInput) nicknameInput.value = displayName || '';

    // ----------------------------------------------------
    // 4. プロフィール更新（ニックネーム・メール・パスワード）処理
    // ----------------------------------------------------
    updateForm?.addEventListener('submit', async (e) => {
        e.preventDefault();

        const newNickname = nicknameInput ? nicknameInput.value.trim() : '';
        const newEmail = emailInput ? emailInput.value.trim() : '';
        const newPassword = passwordInput ? passwordInput.value : '';

        if (!newNickname) {
            if (msg) {
                msg.style.color = 'red';
                msg.textContent = 'ニックネームを入力してください。';
            }
            return;
        }

        if (msg) {
            msg.style.color = 'black';
            msg.textContent = '保存中...';
        }

        try {
            // ① ニックネームの更新 (profiles テーブル)
            const { error: profileError } = await clientSupabase
                .from('profiles')
                .update({ nickname: newNickname })
                .eq('id', user.id);

            if (profileError) throw profileError;

            // ② メールアドレス・パスワードの更新 (Supabase Auth)
            const authUpdates = {};
            if (newEmail && newEmail !== user.email) authUpdates.email = newEmail;
            if (newPassword) authUpdates.password = newPassword;

            if (Object.keys(authUpdates).length > 0) {
                const { error: authError } = await clientSupabase.auth.updateUser(authUpdates);
                if (authError) throw authError;
            }

            if (msg) {
                msg.style.color = 'green';
                msg.textContent = '変更を保存しました！';
            }
            if (passwordInput) passwordInput.value = '';

        } catch (err) {
            console.error('更新エラー:', err);
            if (msg) {
                msg.style.color = 'red';
                msg.textContent = `エラー: ${err.message || '更新に失敗しました。'}`;
            }
        }
    });

    // ----------------------------------------------------
    // 5. 前のページへ戻るボタン処理
    // ----------------------------------------------------
    backBtn?.addEventListener('click', () => {
        if (document.referrer && document.referrer.includes(window.location.host)) {
            history.back();
        } else {
            window.location.href = 'index.html';
        }
    });
});