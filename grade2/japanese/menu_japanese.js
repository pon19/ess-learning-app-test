document.addEventListener('DOMContentLoaded', async () => {
    await loadYesterdayRanking();
});

async function loadYesterdayRanking() {
    const rankingList = document.getElementById('rankingList');
    if (!rankingList) return;

    const supabaseClient = typeof clientSupabase !== 'undefined' ? clientSupabase : (typeof supabase !== 'undefined' ? supabase : null);
    if (!supabaseClient) {
        rankingList.innerHTML = `<p class="ranking-error-msg">ランキングの よみこみに しっぱいしました。</p>`;
        return;
    }

    try {
        const { data, error } = await supabaseClient
            .from(DB_TABLES.RANKINGS_YESTERDAY)
            .select('*')
            .eq('grade', 2)
            .eq('subject', 'japanese')
            .order('max_score', { ascending: false })
            .limit(5);

        if (error) throw error;

        if (!data || data.length === 0) {
            rankingList.innerHTML = `
                <div class="ranking-empty-msg">
                    きのうの チャレンジ者は まだ いません 🐾<br>きょう 1ばんになろう！
                </div>
            `;
            return;
        }

        const crowns = ['🥇', '🥈', '🥉', '4位', '5位'];

        const listItems = await Promise.all(data.map(async (item, index) => {
            const rankStr = crowns[index] || `${index + 1}位`;
            let name = item.nickname || item.display_name;
            if (!name && typeof getUserDisplayName === 'function' && item.user_id) {
                name = await getUserDisplayName(item.user_id);
            }
            if (!name) name = 'ゲスト';

            return `
                <div class="ranking-item">
                    <div class="ranking-user-info">
                        <span class="ranking-rank">${rankStr}</span>
                        <span class="ranking-user-name">${escapeHTML(name)} さん</span>
                    </div>
                    <div class="ranking-score-info">
                        <span class="ranking-score">${item.max_score}てん</span>
                    </div>
                </div>
            `;
        }));

        rankingList.innerHTML = listItems.join('');

    } catch (err) {
        console.error('国語ランキング取得エラー:', err);
        rankingList.innerHTML = `<p class="ranking-error-msg">ランキングの よみこみに しっぱいしました。</p>`;
    }
}

function escapeHTML(str) {
    if (!str) return '';
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