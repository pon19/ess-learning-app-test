// ====================================================
// 共通設定 & Supabase 初期化
// ====================================================
const SUPABASE_URL = 'https://lviknsfnmlejkxfnczyy.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx2aWtuc2ZubWxlamt4Zm5jenl5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUzMjMxNTYsImV4cCI6MjEwMDg5OTE1Nn0.rc1IPcEgcEEQLxaPUZ9uaOSvYy68fOlx1Ml-cfU4jOg';

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
 * ユーザーの表示名を取得する関数
 * @param {string} userId 
 * @returns {Promise<string>} 表示名（見つからない場合は'ゲスト'）
 */
async function getUserDisplayName(userId) {
    if (!userId) return 'ゲスト';
    
    const { data: profile } = await clientSupabase
        .from('profiles')
        .select('display_name')
        .eq('id', userId)
        .maybeSingle();

    return profile?.display_name || 'ゲスト';
}

/**
 * 共通ログアウト処理
 * @param {string} redirectUrl ログアウト後の遷移先（デフォルト: トップページ）
 */
async function handleLogout(redirectUrl = '/index.html') {
    await clientSupabase.auth.signOut();
    window.location.href = redirectUrl;
}