document.addEventListener('DOMContentLoaded', async () => {
    checkAuthState();

    const modal = document.getElementById('authModal');
    const closeModalBtn = document.getElementById('closeModalBtn');
    const modalTabs = document.getElementById('modalTabs');
    const msg = document.getElementById('authMessage');

    // フォーム群
    const loginForm = document.getElementById('loginForm');
    const signupForm = document.getElementById('signupForm');
    const resetRequestForm = document.getElementById('resetRequestForm');
    const findEmailNotice = document.getElementById('findEmailNotice');
    const updatePasswordForm = document.getElementById('updatePasswordForm');
    const forceNicknameForm = document.getElementById('forceNicknameForm');

    // モーダル開く
    document.getElementById('openAuthModalBtn')?.addEventListener('click', () => {
        showForm(loginForm);
        modal.style.display = 'flex';
    });

    // モーダル閉じる
    closeModalBtn?.addEventListener('click', () => modal.style.display = 'none');

    // 画面切り替え用共通ヘルパー
    function showForm(targetForm) {
        if (msg) msg.textContent = '';
        
        if (closeModalBtn) closeModalBtn.style.display = 'block';
        if (modalTabs) modalTabs.style.display = 'flex';

        [loginForm, signupForm, resetRequestForm, findEmailNotice, updatePasswordForm, forceNicknameForm].forEach(f => {
            if (f) f.style.display = 'none';
        });

        if (targetForm) targetForm.style.display = 'block';

        if (targetForm === forceNicknameForm) {
            if (closeModalBtn) closeModalBtn.style.display = 'none';
            if (modalTabs) modalTabs.style.display = 'none';
        }
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

    // 画面切り替えリンク
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
            await checkAuthState();
        }
    });

    // ----------------------------------------------------
    // 2. 新規登録処理（学年データの保存を追加）
    // ----------------------------------------------------
    signupForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const submitBtn = signupForm.querySelector('button[type="submit"]');
        if (submitBtn && submitBtn.disabled) return;

        const name = document.getElementById('signupName')?.value.trim() || 'ななしさん';
        const nickname = document.getElementById('signupNickname')?.value.trim() || name;
        
        // ★学年と現在年度の取得
        const rawGrade = document.getElementById('signupGrade')?.value;
        const selectedGrade = rawGrade ? parseInt(rawGrade, 10) : 1;
        const currentAcademicYear = getCurrentAcademicYear();

        const rawPhone = document.getElementById('signupPhone')?.value || '';
        const phone = rawPhone.replace(/[^\d]/g, ''); 
        const email = document.getElementById('signupEmail')?.value.trim();
        const password = document.getElementById('signupPassword')?.value;

        if (phone.length < 10 || phone.length > 11) {
            msg.style.color = 'red';
            msg.textContent = 'エラー: 携帯番号を 正しく 入力してください。';
            return;
        }

        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.textContent = 'とうろく中...';
        }

        msg.style.color = 'black';
        msg.textContent = '登録中...';

        try {
            const { data, error } = await clientSupabase.auth.signUp({ email, password });

            if (error) {
                msg.style.color = 'red';
                msg.textContent = `エラー: ${error.message}`;
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.textContent = '登録する';
                }
                return;
            }

            if (data?.user) {
                // ★profilesテーブルに grade と grade_updated_at を保存
                await clientSupabase.from('profiles').insert([{
                    id: data.user.id,
                    display_name: name,
                    nickname: nickname,
                    phone: phone,
                    grade: selectedGrade,
                    grade_updated_at: currentAcademicYear
                }]);
            }

            msg.style.color = 'green';
            msg.textContent = 'とうろくが かんりょうしました！';

            setTimeout(async () => {
                if (modal) modal.style.display = 'none';
                await checkAuthState();
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.textContent = '登録する';
                }
            }, 1000);

        } catch (err) {
            console.error(err);
            msg.style.color = 'red';
            msg.textContent = '登録処理中にエラーが発生しました。';
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = '登録する';
            }
        }
    });

    // ----------------------------------------------------
    // 3. ニックネーム強制更新処理
    // ----------------------------------------------------
    forceNicknameForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const newNickname = document.getElementById('forceNicknameInput').value.trim();
        if (!newNickname) return;

        const user = await getCurrentUser();
        if (!user) return;

        msg.style.color = 'black';
        msg.textContent = '保存中...';

        const { error } = await clientSupabase
            .from('profiles')
            .upsert({ 
                id: user.id, 
                nickname: newNickname 
            }, { onConflict: 'id' });

        if (error) {
            msg.style.color = 'red';
            msg.textContent = `エラー: ${error.message}`;
        } else {
            msg.style.color = 'green';
            msg.textContent = 'ニックネームを とうろくしました！';
            setTimeout(() => {
                modal.style.display = 'none';
                checkAuthState();
            }, 1000);
        }
    });

    // ----------------------------------------------------
    // 4. パスワード再設定メール送信
    // ----------------------------------------------------
    resetRequestForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('resetEmail').value;
        msg.style.color = 'black';
        msg.textContent = '送信中...';

        const { error } = await clientSupabase.auth.resetPasswordForEmail(email, {
            redirectTo: window.location.href.split('?')[0].split('#')[0]
        });

        if (error) {
            msg.style.color = 'red';
            msg.textContent = `エラー: ${error.message}`;
        } else {
            msg.style.color = 'green';
            msg.textContent = '再設定用のメールを送信しました。';
        }
    });

    // ----------------------------------------------------
    // 5. パスワード更新
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
            msg.textContent = 'パスワードを変更しました！';
            setTimeout(() => showForm(loginForm), 1500);
        }
    });

    // 監視イベント
    clientSupabase.auth.onAuthStateChange(async (event) => {
        if (event === 'PASSWORD_RECOVERY') {
            modal.style.display = 'flex';
            showForm(updatePasswordForm);
        }
    });
    
    // 未ログイン時の学年選択ブロック処理
    const activeGradeCards = document.querySelectorAll('.grade-card.active');
    activeGradeCards.forEach(card => {
        card.addEventListener('click', async (e) => {
            const { data: { session } } = await clientSupabase.auth.getSession();

            if (!session) {
                e.preventDefault();
                alert('がくねんを えらぶまえに、「ログイン / しんきとうろく」をしてね！');

                const modal = document.getElementById('authModal');
                const loginForm = document.getElementById('loginForm');
                if (modal && loginForm) {
                    showForm(loginForm);
                    modal.style.display = 'flex';
                }
            }
        });
    });
    
    // ログアウト処理
    document.getElementById('topLogoutBtn')?.addEventListener('click', async () => {
        await clientSupabase.auth.signOut();
        checkAuthState();
    });
});

// ====================================================
// ログイン状態判定・学年バッジ付きメッセージ表示
// ====================================================
async function checkAuthState() {
    const { data: { session } } = await clientSupabase.auth.getSession();
    const userInfoArea = document.getElementById('userInfoArea');
    const authBtnArea = document.getElementById('authBtnArea');
    const welcomeMessage = document.getElementById('welcomeMessage');
    const modal = document.getElementById('authModal');
    const forceNicknameForm = document.getElementById('forceNicknameForm');

    if (session) {
        if (userInfoArea) userInfoArea.style.display = 'block';
        if (authBtnArea) authBtnArea.style.display = 'none';

        // ★ common.js の getUserProfileInfo で学年情報含め自動進級チェック
        const { displayName, gradeLabel } = await getUserProfileInfo(session.user.id);

        // ニックネーム未設定チェック
        const { data: profile } = await clientSupabase
            .from('profiles')
            .select('nickname')
            .eq('id', session.user.id)
            .maybeSingle();

        if (!profile || !profile.nickname || profile.nickname.trim() === '') {
            if (modal && forceNicknameForm) {
                modal.style.display = 'flex';
                const closeModalBtn = document.getElementById('closeModalBtn');
                const modalTabs = document.getElementById('modalTabs');
                if (closeModalBtn) closeModalBtn.style.display = 'none';
                if (modalTabs) modalTabs.style.display = 'none';

                document.querySelectorAll('#authModal form, #findEmailNotice').forEach(f => f.style.display = 'none');
                forceNicknameForm.style.display = 'block';
            }
        } else {
            if (modal) modal.style.display = 'none';
            // ★ 学年バッジをつけてメッセージを表示
            const gradeBadge = gradeLabel ? `<span style="background: #319795; color: white; font-size: 13px; padding: 2px 8px; border-radius: 12px; margin-left: 6px; vertical-align: middle;">${gradeLabel}</span>` : '';
            if (welcomeMessage) {
                welcomeMessage.innerHTML = `ようこそ、${escapeHtml(displayName)} さん！ ${gradeBadge}`;
            }
        }
    } else {
        if (userInfoArea) userInfoArea.style.display = 'none';
        if (authBtnArea) authBtnArea.style.display = 'block';
    }
}