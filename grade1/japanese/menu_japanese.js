document.addEventListener('DOMContentLoaded', async () => {
    // ログイン状態チェック関数が存在する場合は呼び出し
    if (typeof getCurrentUser === 'function') {
        await getCurrentUser();
    }

    // 前日の国語ランキングを取得して表示
    await loadYesterdayRanking();
});

/**
 * 前日の国語ランキングデータを Supabase から取得して表示する関数
 */
async function loadYesterdayRanking() {
    const rankingList = document.getElementById('rankingList');
    if (!rankingList) return;

    try {
        // ビューから1年生（grade=1）かつ国語（subject='japanese'）の前日ランキングを取得
        const { data, error } = await clientSupabase
            .from('daily_rankings_yesterday')
            .select('*')
            .eq('grade', 1)
            .eq('subject', 'japanese') // ★ 国語のみに絞り込み
            .order('max_score', { ascending: false })
            .limit(5);

        if (error) throw error;

        if (!data || data.length === 0) {
            rankingList.innerHTML = `
                <div class="ranking-empty-msg">
                    きのうの チャレンジ者は まだ いません 🐾<br>きょう 1番に チャレンジしてみよう！
                </div>
            `;
            return;
        }

        // 順位ごとの王冠絵文字
        const crowns = ['🥇', '🥈', '🥉', '4位', '5位'];

        rankingList.innerHTML = data.map((item, index) => {
            const rankStr = crowns[index] || `${index + 1}位`;
            const name = item.nickname || item.display_name || 'ゲスト';

            return `
                <div class="ranking-item">
                    <div class="ranking-user-info">
                        <span class="ranking-rank">${rankStr}</span>
                        <span class="ranking-user-name">${escapeHtml(name)} さん</span>
                    </div>
                    <div class="ranking-score-info">
                        <span class="ranking-score">${item.max_score}点</span>
                        <span class="ranking-attempts">(${item.total_attempts}回チャレンジ)</span>
                    </div>
                </div>
            `;
        }).join('');

    } catch (err) {
        console.error('国語ランキング取得エラー:', err);
        rankingList.innerHTML = `<p style="color: red; font-size: 13px;">ランキングの読み込みに失敗しました。</p>`;
    }
}

/**
 * XSS対策用の簡易エスケープ関数
 */
function escapeHtml(str) {
    if (!str) return '';
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}