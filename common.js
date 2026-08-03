// ====================================================
// 共通設定 & Supabase 初期化
// ====================================================
const SUPABASE_URL = 'https://ygixztswzvcguzxwdzvo.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlnaXh6dHN3enZjZ3V6eHdkenZvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU3MzEwMjgsImV4cCI6MjEwMTMwNzAyOH0._ouVAKbboVoNvD1uw-uhSoIeN6eiQviZojjRDpW_NXE';

const clientSupabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/**
 * ログイン中のユーザー情報を取得する関数
 */
async function getCurrentUser() {
    const { data: { session } } = await clientSupabase.auth.getSession();
    return session ? session.user : null;
}

/**
 * ユーザーの表示名（ニックネーム優先）を取得する関数
 */
async function getUserDisplayName(userId) {
    if (!userId) return 'ゲスト';
    
    const { data: profile } = await clientSupabase
        .from('profiles')
        .select('display_name, nickname')
        .eq('id', userId)
        .maybeSingle();

    return profile?.nickname || profile?.display_name || 'ゲスト';
}

/**
 * 階層（フォルダ）に応じたベースパス（./ か ../）を取得する関数
 */
function getBasePath() {
    // URLのパスに grade1 など サブフォルダが含まれているかチェック
    const path = window.location.pathname;
    if (path.includes('/grade1/')) {
        return '../';
    }
    return './';
}

/**
 * 共通ログアウト処理
 */
async function handleLogout(redirectUrl) {
    const basePath = getBasePath();
    const targetUrl = redirectUrl || `${basePath}index.html`;
    await clientSupabase.auth.signOut();
    window.location.href = targetUrl;
}

// ====================================================
// 全ページ共通：ヘッダーナビゲーション自動描写処理
// ====================================================
document.addEventListener('DOMContentLoaded', async () => {
    const globalHeader = document.getElementById('globalHeader');
    if (!globalHeader) return;

    const basePath = getBasePath(); // 現在の階層に合わせたパスを取得
    const user = await getCurrentUser();

    if (user) {
        const displayName = await getUserDisplayName(user.id);
        globalHeader.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; background: #edf2f7; padding: 10px 15px; border-radius: 8px; margin-bottom: 20px;">
                <div style="font-weight: bold; color: #2b6cb0; font-size: 14px;">
                    👤 ${displayName} さん
                </div>
                <div>
                    <a href="${basePath}mypage.html" style="display: inline-block; background: #3182ce; color: white; border: none; padding: 6px 12px; border-radius: 6px; text-decoration: none; font-size: 13px; font-weight: bold; margin-right: 5px;">マイページ</a>
                    <button id="commonLogoutBtn" style="background: #e53e3e; color: white; border: none; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 13px;">ログアウト</button>
                </div>
            </div>
        `;

        document.getElementById('commonLogoutBtn')?.addEventListener('click', () => {
            handleLogout(`${basePath}index.html`);
        });
    } else {
        // 未ログイン時
        globalHeader.innerHTML = `
            <div style="display: flex; justify-content: flex-end; align-items: center; background: #edf2f7; padding: 10px 15px; border-radius: 8px; margin-bottom: 20px;">
                <a href="${basePath}index.html" style="background: #3182ce; color: white; border: none; padding: 6px 12px; border-radius: 6px; text-decoration: none; font-size: 13px; font-weight: bold;">🔐 ログイン / トップへ</a>
            </div>
        `;
    }
});