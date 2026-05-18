import React, { useEffect, useState } from 'react';
import MetaData from '../../Layouts/MetaData';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';
import { updateSettings } from '../../../actions/userAction';

const NewsfeedAlgorithm = ({ onSaveHandler = null, small = false }) => {
  const { t} = useTranslation();
  const dispatch = useDispatch();

  const newsfeedAlgorithms = [
    { name: t('newsfeed_algorithm_1'), id: 1, value: 'ALGORITHM_1' },
    { name: t('newsfeed_algorithm_2'), id: 2, value: 'ALGORITHM_2' },
    { name: t('newsfeed_algorithm_3'), id: 3, value: 'ALGORITHM_3' },
  ];

  const [newsfeedAlgorithm, setNewsfeedAlgorithm] = useState(
    newsfeedAlgorithms[0].value
  );

  const [newsfeedAdvertisementFrequency, setNewsfeedAdvertisementFrequency] = useState(5);

  const [newsfeedXrayMode, setNewsfeedXrayMode] = useState(false);
  const [newsfeedSocialGraphMode, setNewsfeedSocialGraphMode] = useState(false);

  const [postLikeWeight, setPostLikeWeight] = useState(1);
  const [postCommentWeight, setPostCommentWeight] = useState(2);

  const [affinityLikeWeight, setAffinityLikeWeight] = useState(1);
  const [affinityCommentWeight, setAffinityCommentWeight] = useState(2);
  const [affinityFollowerWeight, setAffinityFollowerWeight] = useState(0);

  const [timeDecayBaseFactor, setTimeDecayBaseFactor] = useState(0.995);

  const [showOwnPosts, setShowOwnPosts] = useState(true);
  const [followedOnlyMode, setFollowedOnlyMode] = useState(false);

  const { user } = useSelector((state) => state.user);
  const { loading, error } = useSelector((state) => state.settings);

  useEffect(() => {
    if (user.settings) {
      setNewsfeedAlgorithm(user.settings.newsfeed_algorithm);

      if (user.settings.newsfeed_advertisement_frequency !== null)
        setNewsfeedAdvertisementFrequency(user.settings.newsfeed_advertisement_frequency);

      if (user.settings.newsfeed_post_like_weight !== null)
        setNewsfeedXrayMode(user.settings.newsfeed_xray_mode);

      if (user.settings.newsfeed_social_graph_mode !== null)
        setNewsfeedSocialGraphMode(user.settings.newsfeed_social_graph_mode);

      if (user.settings.newsfeed_post_like_weight !== null)
        setPostLikeWeight(user.settings.newsfeed_post_like_weight);

      if (user.settings.newsfeed_post_comment_weight !== null)
        setPostCommentWeight(user.settings.newsfeed_post_comment_weight);

      if (user.settings.newsfeed_affinity_like_weight !== null)
        setAffinityLikeWeight(user.settings.newsfeed_affinity_like_weight);

      if (user.settings.newsfeed_affinity_comment_weight !== null)
        setAffinityCommentWeight(user.settings.newsfeed_affinity_comment_weight);

      if (user.settings.newsfeed_affinity_follower_weight !== null)
        setAffinityFollowerWeight(user.settings.newsfeed_affinity_follower_weight);

      if (user.settings.newsfeed_time_decay_base_factor !== null)
        setTimeDecayBaseFactor(user.settings.newsfeed_time_decay_base_factor);

      if (user.settings.newsfeed_show_own_posts !== null)
        setShowOwnPosts(user.settings.newsfeed_show_own_posts);

      if (user.settings.newsfeed_followed_only_mode !== null)
        setFollowedOnlyMode(user.settings.newsfeed_followed_only_mode);
    }
  }, [user]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const data = {
      user: user.id,
      newsfeed_algorithm: newsfeedAlgorithm,

      newsfeed_advertisement_frequency: newsfeedAdvertisementFrequency,

      newsfeed_post_like_weight: postLikeWeight,
      newsfeed_post_comment_weight: postCommentWeight,
      newsfeed_affinity_like_weight: affinityLikeWeight,
      newsfeed_affinity_comment_weight: affinityCommentWeight,
      newsfeed_affinity_follower_weight: affinityFollowerWeight,
      newsfeed_time_decay_base_factor: timeDecayBaseFactor,

      newsfeed_show_own_posts: showOwnPosts,
      newsfeed_followed_only_mode: followedOnlyMode,

      newsfeed_xray_mode: newsfeedXrayMode,
      newsfeed_social_graph_mode: newsfeedSocialGraphMode
    };
    dispatch(updateSettings(data, user)).then(() => {
      if (onSaveHandler) {
        onSaveHandler();
      }
    });
  };

  return (
    <>
      <MetaData title={t('change_newsfeed_algorithm') + ' • Instaclone'} />
      <form
          onSubmit={handleSubmit}
          encType='multipart/form-data'
      >
        <div className={small ? 'flex flex-col gap-2 py-2 px-4 sm:py-5 sm:px-10' : 'flex flex-col gap-4 py-4 px-4 sm:py-10 sm:px-24'}>
          <div className='flex w-full gap-8 text-right items-center'>
            <span className='w-1/4 font-semibold'>
              {t('newsfeed_algorithm')}:
            </span>
            <select
                value={newsfeedAlgorithm}
                className='border rounded p-1 w-3/4'
                onChange={(e) => setNewsfeedAlgorithm(e.target.value)}
            >
              {newsfeedAlgorithms.map((e) => (
                  <option key={e.id} value={e.value}>
                    {t(e.name)}
                  </option>
              ))}
            </select>
          </div>

          {newsfeedAlgorithm === 'ALGORITHM_3' &&
            <div>
              <div className='flex w-full gap-8 text-right items-center mt-5'>
                      <span className='w-1/4 font-semibold'>
                        {t('newsfeed_xray_mode')}:
                      </span>

                <div className='text-left w-3/4'>
                  <label>
                    <input
                        type='checkbox'
                        className='form-checkbox'
                        id='newsfeed_xray_mode'
                        checked={newsfeedXrayMode}
                        onChange={(e) => setNewsfeedXrayMode(e.target.checked)}
                    />
                    <span> {t('newsfeed_xray_mode_explainer')} </span>
                  </label>
                </div>
              </div>

              <div className='flex w-full gap-8 text-right items-center mt-5'>
                <span className='w-1/4 font-semibold'>
                  {t('newsfeed_social_graph_mode')}:
                </span>

                <div className='text-left w-3/4'>
                  <label>
                    <input
                        type='checkbox'
                        className='form-checkbox'
                        id='newsfeed_social_graph_mode'
                        checked={newsfeedSocialGraphMode}
                        onChange={(e) => setNewsfeedSocialGraphMode(e.target.checked)}
                    />
                    <span> {t('newsfeed_social_graph_mode_explainer')} </span>
                  </label>
                </div>
              </div>
            </div>
          }
        </div>

        {/* Settings for Algorithm 3 */}
        {newsfeedAlgorithm === 'ALGORITHM_3' &&
            <div className="py-2 px-4 sm:py-5 sm:px-10">
              <div className="mb-2">
                <h3 className="text-xl">{t('newsfeed_algorithm_3_customization')}</h3>

                <p>{t('newsfeed_algorithm_3_customization_explainer')}</p>
              </div>

              <div className="mb-2">
                <h4 className="font-bold">{t('newsfeed_post_popularity_score')}:</h4>
                <p>{t('newsfeed_post_popularity_score_explainer')} <span
                    className="pr-4">{t('newsfeed_score_computation_formular')}:</span></p>
                <div>
                  P<sub>i</sub> = 1 + (<strong>p<sub>l</sub></strong> &middot; #Likes
                  + <strong>p<sub>c</sub></strong> &middot;
                  #{t("comments")}) = 1
                  + (<strong>{postLikeWeight}</strong> &middot; #Likes
                  + <strong>{postCommentWeight}</strong> &middot; #{t("comments")})
                </div>
              </div>

              <div className='flex w-full gap-4 text-right items-center'>
            <span className='w-2/5'>
              {t('newsfeed_popularity_like_weight')}:
            </span>

                <span className='w-1/5'>
                <strong>p<sub>l</sub></strong> = {postLikeWeight}
                </span>

                <input type="range" min={0} max={5} step={0.5} value={postLikeWeight} className="slider p-1 w-2/5"
                       onChange={(e) => setPostLikeWeight(e.target.value)}/>
              </div>

              <div className='flex w-full gap-4 text-right items-center mb-5'>
                <span className='w-2/5'>
                    {t('newsfeed_popularity_comment_weight')}:
                </span>

                <span className='w-1/5'>
                <strong>p<sub>c</sub></strong> = {postCommentWeight}
                </span>

                <input type="range" min={0} max={5} step={0.5} value={postCommentWeight} className="slider p-1 w-2/5"
                       onChange={(e) => setPostCommentWeight(e.target.value)}/>
              </div>

              <div className="mb-2">
                <h4 className="font-bold">{t('newsfeed_post_affinity_score')}:</h4>
                <p>{t('newsfeed_post_affinity_score_explainer')} <span
                    className="pr-4">{t('newsfeed_score_computation_formular')}:</span></p>
                <div>

                  A<sub>i</sub> = 1 + (<strong>a<sub>l</sub></strong>  &middot; #Likes
                  + <strong>a<sub>c</sub></strong> &middot; #{t("comments")}
                  &nbsp; + <strong>a<sub>f</sub></strong> &middot; "{t('newsfeed_score_computation_formula_affinity_follower_addition')}")
                  = 1 +
                  (<strong>{affinityLikeWeight}</strong> &middot; #Likes
                  + <strong>{affinityCommentWeight}</strong> &middot; #{t("comments")}
                  &nbsp;+ <strong>{affinityFollowerWeight}</strong> &middot; "{t('newsfeed_score_computation_formula_affinity_follower_addition')}")
                </div>
              </div>

              <div className="mb-5">
                <div className='flex w-full gap-4 text-right items-center'>
                  <span className='w-2/5'>
                    {t('newsfeed_affinity_like_weight')}:
                  </span>

                  <span className='w-1/5'>
                    <strong>a<sub>l</sub></strong> = {affinityLikeWeight}
                  </span>

                  <input type="range" min={0} max={5} step={0.5} value={affinityLikeWeight}
                         className="slider p-1 w-2/5"
                         onChange={(e) => setAffinityLikeWeight(e.target.value)}/>
                </div>

                <div className='flex w-full gap-4 text-right items-center'>
                  <span className='w-2/5'>
                    {t('newsfeed_affinity_comment_weight')}:
                  </span>

                  <span className='w-1/5'>
                    <strong>a<sub>c</sub></strong> ={affinityCommentWeight}
                  </span>

                  <input type="range" min={0} max={5} step={0.5} value={affinityCommentWeight}
                         className="slider p-1 w-2/5"
                         onChange={(e) => setAffinityCommentWeight(e.target.value)}/>
                </div>

                <div className='flex w-full gap-4 text-right items-center'>
                  <span className='w-2/5'>
                    {t('newsfeed_affinity_follower_weight')}:
                  </span>

                  <span className='w-1/5'>
                    <strong>a<sub>f</sub></strong> ={affinityFollowerWeight}
                  </span>

                  <input type="range" min={-5} max={5} step={0.5} value={affinityFollowerWeight}
                         className="slider p-1 w-2/5"
                         onChange={(e) => setAffinityFollowerWeight(e.target.value)}/>
                </div>
              </div>

              <div className="mb-5">
                <h4 className="font-bold">{t('newsfeed_post_time_factor_score')}:</h4>
                <p>{t('newsfeed_post_time_factor_score_explainer')} <span
                    className="pr-4">{t('newsfeed_score_computation_formular')}:</span></p>
                <div>
                  T<sub>i</sub> = (1-<strong>t</strong>) <sup> (({t('newsfeed_time_difference_in_seconds')} // 180) + 1)
                  / 180</sup>
                  = (1-<strong>{timeDecayBaseFactor}</strong>) <sup> ((({t('newsfeed_time_difference_in_seconds')} //
                  180) + 1) / 180 </sup>
                </div>
              </div>

              <div className='flex w-full gap-4 text-right items-center mb-5'>
                <span className='w-2/5'>
                  {t('newsfeed_time_decay_base_factor')}:
                </span>

                <span className='w-1/5'>
                  <strong>t</strong> = {timeDecayBaseFactor}
                </span>

                <input type="range" min={0} max={1} step={0.005} value={timeDecayBaseFactor}
                       className="slider p-1 w-2/5"
                       onChange={(e) => setTimeDecayBaseFactor(e.target.value)}/>
              </div>

              <div>
                <h4 className="font-bold">{t('newsfeed_further_settings')}:</h4>
                <p>{t('newsfeed_further_settings_explainer')}</p>

                <div className='flex w-full gap-4 text-right items-center'>
                  <label className="w-3/5 text-left">
                    <input
                        type='checkbox'
                        className='form-checkbox'
                        id='newsfeed_show_own_posts'
                        checked={showOwnPosts}
                        onChange={(e) => setShowOwnPosts(e.target.checked)}
                    />
                    <span> {t('newsfeed_show_own_posts')} </span>
                  </label>
                </div>

                <div className='flex w-full gap-4 text-right items-center'>

                  <label className="w-3/5 text-left">
                    <input
                        type='checkbox'
                        className='form-checkbox'
                        id='newsfeed_followed_only_mode'
                        checked={followedOnlyMode}
                        onChange={(e) => setFollowedOnlyMode(e.target.checked)}
                    />
                    <span> {t('newsfeed_followed_only_mode')} </span>
                  </label>
                </div>
              </div>
            </div>
        }

        {/* Settings for Advertisement */}
        <div className="py-2 px-4 sm:py-5 sm:px-10">
          <div className="mb-2">
            <h3 className="text-xl">{t('newsfeed_advertisement_settings')}</h3>
            <p>{t('newsfeed_advertisement_settings_explainer')}</p>
          </div>

          <div className='flex w-full gap-8 text-right items-center mt-4'>
                  <span className='w-1/4 font-semibold'>
                    {t('newsfeed_advertisement_frequency')}:
                  </span>

            <div className="w-3/4">
              <div className="text-left">
                {t('newsfeed_advertisement_frequency_explainer', {'frequency': newsfeedAdvertisementFrequency})}<br/>
                {t('newsfeed_advertisement_frequency_zero_explainer')}<br/>
              </div>
              <input type="range" min={0} max={20} step={1} value={newsfeedAdvertisementFrequency}
                       className="slider p-1 w-full"
                       onChange={(e) => setNewsfeedAdvertisementFrequency(e.target.value)}/>
              </div>
            </div>
          </div>

          <div
              className={small ? 'flex flex-col gap-2 p-2' : 'flex flex-col gap-4 py-4 px-4 sm:py-10 sm:px-24'}>
            <button
                type='submit'
                disabled={loading}
                className='bg-primary-blue font-medium rounded text-white py-2 w-40 mx-auto text-sm '
            >
              {t('save')}
            </button>
          </div>
      </form>
    </>
);
};

export default NewsfeedAlgorithm;
