document.addEventListener('DOMContentLoaded', async () => {
    await fetchYesterdayRankings();
});

/**
 * 前日のランキングデータを Supabase から取得して表示する関数（2年生用）
 */
async function loadYesterdayRanking() {
    const rankingList = document.getElementById('rankingList');
    if (!rankingList) return;

    try {
        // ビューから2年生（grade=2）の前日ランキングを取得
        const { data, error } = await clientSupabase
            .from('daily_rankings_yesterday')
            .select('*')
            .eq('grade', 2) // ★ 2年生に指定
            .order('max_score', { ascending: false })
            .limit(5); // 上位5名を表示

        if (error) throw error;

        if (!data || data.length === 0) {
            rankingList.innerHTML = `
                <div style="text-align: center; color: #a0aec0; padding: 15px 0; font-size: 14px;">
                    きのうの チャレンジ者は まだ いません 🐾<br>きょう 1ばんになろう！
                </div>
            `;
            return;
        }

        // 順位ごとの王冠絵文字
        const crowns = ['🥇', '🥈', '🥉', '4い', '5い'];

        rankingList.innerHTML = data.map((item, index) => {
            const rankStr = crowns[index] || `${index + 1}い`;
            // ニックネーム優先で表示
            const name = item.nickname || item.display_name || 'ゲスト';

            return `
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px 12px; border-bottom: 1px solid #edf2f7; font-size: 14px;">
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <span style="font-weight: bold; width: 30px; text-align: center; font-size: 1.1rem;">${rankStr}</span>
                        <span style="font-weight: bold; color: #2d3748;">${escapeHtml(name)} さん</span>
                    </div>
                    <div style="text-align: right;">
                        <span style="color: #e53e3e; font-weight: bold; font-size: 1rem;">${item.max_score}てん</span>
                        <span style="font-size: 11px; color: #718096; display: block;">(${item.total_attempts}かい チャレンジ)</span>
                    </div>
                </div>
            `;
        }).join('');

    } catch (err) {
        console.error('ランキング取得エラー:', err);
        rankingList.innerHTML = `<p style="color: red; font-size: 13px;">ランキングの よみこみに しっぱいしました。</p>`;
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