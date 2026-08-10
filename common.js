// ====================================================
// 共通設定 & Supabase 初期化
// ====================================================
const SUPABASE_URL = 'https://ygixztswzvcguzxwdzvo.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlnaXh6dHN3enZjZ3V6eHdkenZvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU3MzEwMjgsImV4cCI6MjEwMTMwNzAyOH0._ouVAKbboVoNvD1uw-uhSoIeN6eiQviZojjRDpW_NXE';

const clientSupabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

function escapeHtml(str) {
    if (!str) return '';
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

async function getCurrentUser() {
    const { data: { session } } = await clientSupabase.auth.getSession();
    return session ? session.user : null;
}

function getBasePath() {
    const path = window.location.pathname;
    if (path.includes('/grade1/')) {
        return '../';
    }
    return './';
}

async function handleLogout(redirectUrl) {
    const basePath = getBasePath();
    const targetUrl = redirectUrl || `${basePath}index.html`;
    await clientSupabase.auth.signOut();
    window.location.href = targetUrl;
}

// ----------------------------------------------------
// 学年判定 ＆ 自動進級（4月1日更新）ロジック
// ----------------------------------------------------
function getCurrentAcademicYear() {
    const today = new Date();
    // 1月〜3月の場合は前年が年度（例: 2026年2月 -> 2025年度）
    return today.getMonth() < 3 ? today.getFullYear() - 1 : today.getFullYear();
}

function formatGradeLabel(gradeNum) {
    if (!gradeNum) return '';
    if (gradeNum <= 6) return `小学${gradeNum}年生`;
    if (gradeNum <= 9) return `中学${gradeNum - 6}年生`;
    if (gradeNum <= 12) return `高校${gradeNum - 9}年生`;
    return '一般';
}

/**
 * ユーザー情報取得 ＋ 自動進級チェック
 */
async function getUserProfileInfo(userId) {
    if (!userId) return { displayName: 'ゲスト', gradeLabel: '', rawGrade: 1 };

    const { data: profile } = await clientSupabase
        .from('profiles')
        .select('display_name, nickname, grade, grade_updated_at')
        .eq('id', userId)
        .maybeSingle();

    if (!profile) return { displayName: 'ゲスト', gradeLabel: '', rawGrade: 1 };

    let currentGrade = profile.grade || 1;
    let lastUpdatedYear = profile.grade_updated_at || getCurrentAcademicYear();
    const currentAcademicYear = getCurrentAcademicYear();

    // 4月1日を過ぎて新しい年度になっており、かつ未更新の場合
    if (currentAcademicYear > lastUpdatedYear) {
        const yearsPassed = currentAcademicYear - lastUpdatedYear;
        currentGrade += yearsPassed;
        lastUpdatedYear = currentAcademicYear;

        // DBへ自動進級結果を保存
        await clientSupabase
            .from('profiles')
            .update({
                grade: currentGrade,
                grade_updated_at: lastUpdatedYear
            })
            .eq('id', userId);
    }

    const displayName = profile.nickname || profile.display_name || 'ゲスト';
    const gradeLabel = formatGradeLabel(currentGrade);

    return { displayName, gradeLabel, rawGrade: currentGrade };
}

// ====================================================
// 全ページ共通：ヘッダー自動描画処理
// ====================================================
document.addEventListener('DOMContentLoaded', async () => {
    const globalHeader = document.getElementById('globalHeader');
    if (!globalHeader) return;

    const basePath = getBasePath();
    const user = await getCurrentUser();

    if (user) {
        const { displayName, gradeLabel } = await getUserProfileInfo(user.id);
        const gradeBadge = gradeLabel ? `<span style="background: #319795; color: white; font-size: 13px; padding: 3px 8px; border-radius: 12px; margin-left: 6px; vertical-align: middle; font-weight: bold;">${gradeLabel}</span>` : '';

        globalHeader.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; background: #edf2f7; padding: 12px 18px; border-radius: 10px; margin-bottom: 20px;">
                <div style="font-weight: bold; color: #2b6cb0; font-size: 18px; display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
                    <span style="font-size: 20px;">👤</span> ${escapeHtml(displayName)} さん ${gradeBadge}
                </div>
                <div>
                    <a href="${basePath}mypage.html" style="display: inline-block; background: #3182ce; color: white; border: none; padding: 8px 14px; border-radius: 6px; text-decoration: none; font-size: 14px; font-weight: bold; margin-right: 5px;">マイページ</a>
                    <button id="commonLogoutBtn" style="background: #e53e3e; color: white; border: none; padding: 8px 14px; border-radius: 6px; cursor: pointer; font-size: 14px; font-weight: bold;">ログアウト</button>
                </div>
            </div>
        `;

        document.getElementById('commonLogoutBtn')?.addEventListener('click', () => {
            handleLogout(`${basePath}index.html`);
        });
    } else {
        globalHeader.innerHTML = `
            <div style="display: flex; justify-content: flex-end; align-items: center; background: #edf2f7; padding: 12px 18px; border-radius: 10px; margin-bottom: 20px;">
                <a href="${basePath}index.html" style="background: #3182ce; color: white; border: none; padding: 8px 14px; border-radius: 6px; text-decoration: none; font-size: 14px; font-weight: bold;">🔐 ログイン / トップへ</a>
            </div>
        `;
    }
});