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
    const gradeView = document.getElementById('gradeView'); // ★学年表示エリア
    const nicknameInput = document.getElementById('mypageNickname');
    const emailInput = document.getElementById('mypageEmail');
    const profileForm = document.getElementById('profileForm');
    const msg = document.getElementById('mypageMsg');
    const btnBackHome = document.getElementById('btnBackHome');

    // メールアドレスは Auth 情報から取得
    if (emailInput) {
        emailInput.value = user.email || '';
    }

    // ----------------------------------------------------
    // 3. プロフィール情報 & 学年データの取得（自動進級チェック含む）
    // ----------------------------------------------------
    // common.js の getUserProfileInfo を呼び出すことで自動進級処理が実行される
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

    // 画面に取得データをセット
    if (profile) {
        if (displayNameView) displayNameView.textContent = profile.display_name || '（未設定）';
        if (phoneView) phoneView.textContent = profile.phone || '（未設定）';
    }

    // ★ 学年ラベルを反映（例: "小学1年生"）
    if (gradeView) {
        gradeView.textContent = gradeLabel || '未設定';
    }

    // 変更可能なニックネーム入力欄に初期値をセット
    if (nicknameInput) {
        nicknameInput.value = displayName || '';
    }

    // ----------------------------------------------------
    // 4. プロフィール更新（ニックネーム変更）処理
    // ----------------------------------------------------
    profileForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const newNickname = nicknameInput.value.trim();
        if (!newNickname) {
            msg.style.color = 'red';
            msg.textContent = 'ニックネームを入力してください。';
            return;
        }

        msg.style.color = 'black';
        msg.textContent = '保存中...';

        const { error: updateError } = await clientSupabase
            .from('profiles')
            .update({ nickname: newNickname })
            .eq('id', user.id);

        if (updateError) {
            msg.style.color = 'red';
            msg.textContent = `更新エラー: ${updateError.message}`;
        } else {
            msg.style.color = 'green';
            msg.textContent = 'プロフィールを更新しました！';
            
            // ヘッダーの表示名を更新するためにリロード
            setTimeout(() => {
                window.location.reload();
            }, 1000);
        }
    });

    // ----------------------------------------------------
    // 5. トップページへ戻るボタン
    // ----------------------------------------------------
    btnBackHome?.addEventListener('click', () => {
        window.location.href = 'index.html';
    });
});