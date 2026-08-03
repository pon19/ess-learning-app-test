document.addEventListener('DOMContentLoaded', async () => {
    // ログインチェック
    const user = await getCurrentUser();
    if (!user) {
        alert('ログインが必要です。');
        window.location.href = 'index.html';
        return;
    }

    const displayNameView = document.getElementById('displayNameView');
    const phoneView = document.getElementById('phoneView');
    const nicknameInput = document.getElementById('mypageNickname');
    const emailInput = document.getElementById('mypageEmail');
    const passwordInput = document.getElementById('mypagePassword');
    const updateForm = document.getElementById('updateProfileForm');
    const msg = document.getElementById('mypageMsg');

    // 1. 現在の情報を画面に反映
    emailInput.value = user.email || '';

    const { data: profile, error } = await clientSupabase
        .from('profiles')
        .select('display_name, nickname, phone')
        .eq('id', user.id)
        .maybeSingle();

    if (profile) {
        displayNameView.textContent = profile.display_name || '（未設定）';
        phoneView.textContent = profile.phone || '（未設定）';
        nicknameInput.value = profile.nickname || '';
    }

    // 2. 変更保存処理
    updateForm?.addEventListener('submit', async (e) => {
        e.preventDefault();

        const newNickname = nicknameInput.value.trim();
        const newEmail = emailInput.value.trim();
        const newPassword = passwordInput.value;

        if (!newNickname) {
            msg.style.color = 'red';
            msg.textContent = 'ニックネームを入力してください。';
            return;
        }

        msg.style.color = 'black';
        msg.textContent = '保存中...';

        try {
            // ① ニックネームの更新 (profiles テーブル)
            const { error: profileError } = await clientSupabase
                .from('profiles')
                .update({ nickname: newNickname })
                .eq('id', user.id);

            if (profileError) throw profileError;

            // ② メールアドレス・パスワードの更新 (Supabase Auth)
            const authUpdates = {};
            if (newEmail !== user.email) authUpdates.email = newEmail;
            if (newPassword) authUpdates.password = newPassword;

            if (Object.keys(authUpdates).length > 0) {
                const { error: authError } = await clientSupabase.auth.updateUser(authUpdates);
                if (authError) throw authError;
            }

            msg.style.color = 'green';
            msg.textContent = '変更を保存しました！';
            passwordInput.value = ''; // パスワード欄をクリア

        } catch (err) {
            console.error('更新エラー:', err);
            msg.style.color = 'red';
            msg.textContent = `エラー: ${err.message || '更新に失敗しました。'}`;
        }
    });
});