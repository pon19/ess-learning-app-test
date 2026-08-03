// ====================================================
// 共通設定 & Supabase 初期化
// ====================================================
// TODO: 新しいSupabaseプロジェクトのURLとキーに書き換えてください
const SUPABASE_URL = 'https://ygixztswzvcguzxwdzvo.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlnaXh6dHN3enZjZ3V6eHdkenZvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU3MzEwMjgsImV4cCI6MjEwMTMwNzAyOH0._ouVAKbboVoNvD1uw-uhSoIeN6eiQviZojjRDpW_NXE';

// グローバルで利用できるSupabaseクライアント
const clientSupabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/**
 * ログイン中のユーザー情報を取得する関数
 * @returns {Promise<Object|null>} ユーザーオブジェクトまたはnull
 */
async function getCurrentUser() {
    const { data: { session } } = await clientSupabase.auth.getSession();
    return session ? session.user : null;
}

/**
 * ユーザーの表示名（ニックネーム優先）を取得する関数
 * @param {string} userId 
 * @returns {Promise<string>} ニックネームまたは名前（見つからない場合は'ゲスト'）
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
 * 共通ログアウト処理
 * @param {string} redirectUrl ログアウト後の遷移先（デフォルト: トップページ）
 */
async function handleLogout(redirectUrl = '/index.html') {
    await clientSupabase.auth.signOut();
    window.location.href = redirectUrl;
}