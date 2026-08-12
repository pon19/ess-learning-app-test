// ====================================================
// 共通設定 & Supabase 初期化
// ====================================================
const SUPABASE_URL = 'https://ygixztswzvcguzxwdzvo.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlnaXh6dHN3enZjZ3V6eHdkenZvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU3MzEwMjgsImV4cCI6MjEwMTMwNzAyOH0._ouVAKbboVoNvD1uw-uhSoIeN6eiQviZojjRDpW_NXE';

const clientSupabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// 判定用のミリ秒定数
const TWELVE_HOURS_MS = 12 * 60 * 60 * 1000;         // 12時間
const FIVE_DAYS_MS    = 5 * 24 * 60 * 60 * 1000;     // 5日間

function escapeHtml(str) {
    if (!str) return '';
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

/**
 * フォルダ構成に依存せず、トップ階層（index.html）への相対パスを自動計算
 */
function getBasePath() {
    const fileName = window.location.pathname.split('/').pop();
    // トップページ直下にいる場合
    if (fileName === '' || fileName === 'index.html' || fileName === 'mypage.html') {
        return './';
    }
    // サブフォルダ内にいる場合は 1つ上の階層を参照
    return '../';
}

/**
 * トップページ判定
 * 1. window.IS_TOP_PAGE フラグが存在するかチェック（最も確実に判定）
 * 2. パス末尾が / または index.html かチェック（フォールバック）
 */
function isTopPage() {
    if (window.IS_TOP_PAGE === true) {
        return true;
    }

    const path = window.location.pathname.toLowerCase();
    const fileName = path.split('/').pop();

    // GitHub Pages などで末尾が / や index.html、またはリポジトリ直下の場合の判定
    return fileName === '' || fileName === 'index.html' || path.endsWith('/');
}

/**
 * ミリ秒タイムスタンプを「YYYY/MM/DD HH:mm」形式に変換
 */
function formatLastAccessTime(timestampStr) {
    if (!timestampStr) return '記録なし';
    const date = new Date(parseInt(timestampStr, 10));
    if (isNaN(date.getTime())) return '記録なし';

    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    const hh = String(date.getHours()).padStart(2, '0');
    const mi = String(date.getMinutes()).padStart(2, '0');

    return `${yyyy}/${mm}/${dd} ${hh}:${mi}`;
}

/**
 * アクセス時刻の確認とリダイレクト・ログアウト制御
 */
async function getCurrentUser() {
    const { data: { session } } = await clientSupabase.auth.getSession();
    if (!session) {
        localStorage.removeItem('last_access_time');
        return null;
    }

    const now = Date.now();
    const lastAccessStr = localStorage.getItem('last_access_time');
    const basePath = getBasePath();

    if (lastAccessStr) {
        const lastAccess = parseInt(lastAccessStr, 10);
        const elapsed = now - lastAccess;

        // 【条件1】5日（120時間）以上経過している場合 -> 自動ログアウト
        if (elapsed > FIVE_DAYS_MS) {
            localStorage.removeItem('last_access_time');
            await clientSupabase.auth.signOut();
            alert('前回のアクセスから5日以上経過したためログアウトしました。');
            if (!isTopPage()) {
                window.location.href = `${basePath}index.html`;
            }
            return null;
        }

        // 【条件2】12時間以上経過している場合 -> トップページへ移動
        if (elapsed > TWELVE_HOURS_MS && !isTopPage()) {
            alert('前回のアクセスから12時間以上経過したため、トップページに戻ります。');
            window.location.href = `${basePath}index.html`;
            return session.user;
        }
    }

    // 【更新処理】トップページを開いている時のみ日時を最新化
    if (isTopPage() || !lastAccessStr) {
        localStorage.setItem('last_access_time', now.toString());
    }

    return session.user;
}

async function handleLogout(redirectUrl) {
    const basePath = getBasePath();
    const targetUrl = redirectUrl || `${basePath}index.html`;
    localStorage.removeItem('last_access_time');
    await clientSupabase.auth.signOut();
    window.location.href = targetUrl;
}

// ----------------------------------------------------
// 学年判定 ＆ 自動進級（4月1日更新）ロジック
// ----------------------------------------------------
function getCurrentAcademicYear() {
    const today = new Date();
    return today.getMonth() < 3 ? today.getFullYear() - 1 : today.getFullYear();
}

function formatGradeLabel(gradeNum) {
    if (!gradeNum) return '';
    if (gradeNum <= 6) return `小学${gradeNum}年生`;
    if (gradeNum <= 9) return `中学${gradeNum - 6}年生`;
    if (gradeNum <= 12) return `高校${gradeNum - 9}年生`;
    return '一般';
}

async function getUserDisplayName(userId) {
    if (!userId) return 'ゲスト';
    const { data: profile } = await clientSupabase
        .from('profiles')
        .select('display_name, nickname')
        .eq('id', userId)
        .maybeSingle();

    return profile?.nickname || profile?.display_name || 'ゲスト';
}

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

    if (currentAcademicYear > lastUpdatedYear) {
        const yearsPassed = currentAcademicYear - lastUpdatedYear;
        currentGrade += yearsPassed;
        lastUpdatedYear = currentAcademicYear;

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
        
        // 最終アクセス日時のフォーマット取得
        const lastAccessFormatted = formatLastAccessTime(localStorage.getItem('last_access_time'));

        globalHeader.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; background: #edf2f7; padding: 12px 18px; border-radius: 10px; margin-bottom: 20px; flex-wrap: wrap; gap: 10px;">
                <div style="font-weight: bold; color: #2b6cb0; font-size: 18px; display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
                    <span style="font-size: 20px;">👤</span> ${escapeHtml(displayName)} さん ${gradeBadge}
                    <span style="font-weight: normal; font-size: 12px; color: #718096; margin-left: 10px; background: #ffffff; padding: 3px 8px; border-radius: 6px; border: 1px solid #e2e8f0;">
                        🕒 最終アクセス: ${lastAccessFormatted}
                    </span>
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