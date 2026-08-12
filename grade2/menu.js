document.addEventListener('DOMContentLoaded', async () => {
    await fetchYesterdayRankings();
});

/**
 * 2年生の前日ランキングを取得・描画
 */
async function fetchYesterdayRankings() {
    const rankingList = document.getElementById('ranking-list');
    if (!rankingList) return;

    try {
        // Supabaseクライアントの存在確認
        if (typeof supabase === 'undefined') {
            rankingList.innerHTML = '<p class="error-msg">データベースとの接続に失敗しました。</p>';
            return;
        }

        // 2年生の前日ランキングデータを取得 (grade = 2)
        const { data, error } = await supabase
            .from('daily_rankings_yesterday')
            .select('*')
            .eq('grade', 2)
            .order('rank', { ascending: true })
            .limit(5);

        if (error) {
            console.error('ランキング取得エラー:', error);
            rankingList.innerHTML = '<p class="empty-msg">ランキングの取得に失敗しました。</p>';
            return;
        }

        if (!data || data.length === 0) {
            rankingList.innerHTML = '<p class="empty-msg">きのうの チャレンジデータは まだありません。</p>';
            return;
        }

        // ランキング描画 HTML 作成
        let html = '<ol class="ranking-ol">';
        data.forEach((item) => {
            const rankMedal = item.rank === 1 ? '🥇' : item.rank === 2 ? '🥈' : item.rank === 3 ? '🥉' : `${item.rank}位`;
            const displayName = item.user_name || 'ゲスト';
            const scoreText = `${item.score}てん`;
            const timeText = item.time_taken ? ` (${item.time_taken}びょう)` : '';

            html += `
                <li class="ranking-item rank-${item.rank}">
                    <span class="rank-badge">${rankMedal}</span>
                    <span class="user-name">${escapeHTML(displayName)}</span>
                    <span class="score-info">${scoreText}${timeText}</span>
                </li>
            `;
        });
        html += '</ol>';

        rankingList.innerHTML = html;

    } catch (err) {
        console.error('予期せぬエラー:', err);
        rankingList.innerHTML = '<p class="empty-msg">エラーが発生しました。</p>';
    }
}

/**
 * HTMLエスケープ処理
 */
function escapeHTML(str) {
    return str.replace(/[&<>'"]/g, 
        tag => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            "'": '&#39;',
            '"': '&quot;'
        }[tag] || tag)
    );
}