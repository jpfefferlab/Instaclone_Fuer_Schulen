import { useTranslation } from 'react-i18next';

const Metadata = ({ type, post_id, xray_mode, creator_username,
                      affinity_score, affinity_like_count, affinity_comment_count,
                      popularity_score, time_factor_score, edge_rank_score }) => {
    const { t } = useTranslation();

    return (
        <div>
            {
                type !== 'ADVERTISEMENT' &&
                popularity_score !== null &&
                affinity_score !== null &&
                affinity_like_count !== null &&
                affinity_comment_count !== null &&
                time_factor_score !== null &&
                edge_rank_score !== null &&

                <div className="text-sm text-gray-600">
                    <h4 className="font-bold">{t('newsfeed_ranking_metadata' ,{postId: post_id})} *</h4>
                    {
                        /* Caveat: metadata gets not updated until page refresh.
                            => Like and comment of users are not instantly reflected.
                            Else the post ranking would be updated every time a user likes or comments a post.
                        */
                    }
                    <ul>
                        <li>
                            {t('newsfeed_post_popularity_score')}: P<sub>{ post_id }</sub> = {popularity_score}
                        </li>
                        <li>
                            {t('newsfeed_post_affinity_score')}: A<sub>{post_id}</sub> = {affinity_score}
                            <ul className="ml-2 text-xs">
                                <li>{t('newsfeed_post_affinity_like_count_explainer', {username: creator_username})}: {affinity_like_count}
                                </li>
                                <li>{t('newsfeed_post_affinity_comment_count_explainer', {username: creator_username})}: {affinity_comment_count}
                                </li>
                                {/*<li>A = a_l * {affinity_like_count} + a_c * {affinity_comment_count}</li>*/}
                            </ul>
                        </li>
                        <li>{t('newsfeed_post_time_factor_score')}: T<sub>{post_id}</sub> &asymp; {time_factor_score.toFixed(3)}</li>
                        <li>{t('newsfeed_post_edge_rank_score')}: E<sub>{post_id}</sub> &asymp; {edge_rank_score.toFixed(3)}</li>
                    </ul>
                    <span className="text-xs">* {t('newsfeed_ranking_metadata_update_explainer')}</span>
                </div>
            }
        </div>

    );
};

export default Metadata;
