import { useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import Chart from 'react-apexcharts';
import ApexCharts from 'apexcharts'
import React, {useState} from "react";

const NewsfeedChart = () => {

  const { t } = useTranslation();

  const { posts } = useSelector((state) =>  state.newsfeed);

  // User config
  const [hideAds, setHideAds] = useState(true);

  // https://www.geeksforgeeks.org/how-to-set-cookie-in-reactjs/
  const setCookieFunction = (name, value, days) => {
    let expires = "";
    if (days) {
      const date = new Date();
      date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000);
      expires = "; expires=" + date.toUTCString();
    }
    document.cookie = name + "=" + value + expires + "; path=/";
  };
  const getCookie = (name) => {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(";").shift();
    return null;
  };

  const hideAdsFilterLambda = (post) => !hideAds || (hideAds && post.type !== 'ADVERTISEMENT')

  const selectPostIdStrings = (posts) => posts.filter(post => hideAdsFilterLambda(post)).map(post => {
    return post.type === 'ADVERTISEMENT' ? t("advertisement") + " ID: " + post.id : t("post") + " ID: " + post.id
  });

  // Make advertisement values null
  const selectEdgeRankScores = (posts) => posts.filter(post => hideAdsFilterLambda(post)).map(post => post.edge_rank_score ? post.edge_rank_score : null);

  const selectPopularityScores = (posts) => posts.filter(post => hideAdsFilterLambda(post)).map(post => post.edge_rank_score ? post.popularity_score : null);
  const selectAffinityScores = (posts) => posts.filter(post => hideAdsFilterLambda(post)).map(post => post.edge_rank_score ? post.affinity_score : null);
  const selectTimeFactorScores = (posts) => posts.filter(post => hideAdsFilterLambda(post)).map(post => post.edge_rank_score ? post.time_factor_score : null);

  const selectTotalLikeCounts = (posts) => posts.filter(post => hideAdsFilterLambda(post)).map(post => post.edge_rank_score ? post.like_count : null);
  const selectTotalCommentCounts = (posts) => posts.filter(post => hideAdsFilterLambda(post)).map(post => post.edge_rank_score ? post.comment_count : null);

  const selectAffinityLikeCounts = (posts) => posts.filter(post => hideAdsFilterLambda(post)).map(post => post.edge_rank_score ? post.affinity_like_count : null);
  const selectAffinityCommentCounts = (posts) => posts.filter(post => hideAdsFilterLambda(post)).map(post => post.edge_rank_score ? post.affinity_comment_count : null);
  const selectAffinityIsFromFollowedUser = (posts) => posts.filter(post => hideAdsFilterLambda(post)).map(post => post.edge_rank_score ? post.affinity_is_from_followed_user : null);

  var chart = {
    options: {
      title: {
        text: t('newsfeed_metadata_chart_title'),
      },
      legend: {
        position: 'top',
        horizontalAlign: 'left',
      },
      colors: ['#2E93fA', '#66DA26', '#662E9B', '#E91E63', '#FF9800', '#F86624', '#2B908F', '#8D5B4C'],
      chart: {
        id: 'newsfeed-chart',
        animations: {
          enabled: true,
          speed: 800,
          animateGradually: {
            enabled: true,
            delay: 150
          },
          dynamicAnimation: {
            enabled: true,
            speed: 350
          },
        },
        width: '100%',
        height: 'auto',
        redrawOnParentResize: true,
        redrawOnWindowResize: true,
        // Fix: important for redraw on resize of parent box
        events: {
          mounted: (chart) => {
            chart.windowResizeHandler();
          },
          updated: function(chartContext, config) {
            const chartComp = ApexCharts.getChartByID('newsfeed-chart')

            if (chartComp !== undefined && chart !== undefined) {
              for (let i = 0; i < config.config.series.length; i++) {
                if (getCookie("hide-series-" + i) === "true") {
                  chartComp.hideSeries(chart.series[i].name);
                }
              }
            }
          },
          legendClick: (chartContext, seriesIndex, config)=>{
            if(config.config.series[seriesIndex]){
              if(config.config.series[seriesIndex].data.length){
                // series is being hidden
                setCookieFunction("hide-series-" + seriesIndex, true, 14);
              } else {
                // series is being shown
                setCookieFunction("hide-series-" + seriesIndex, false, 14);
              }
            }
          }
        },
      },
      xaxis: {
        categories: selectPostIdStrings(posts),
        labels: {
          hideOverlappingLabels: true,
        }
      },
      yaxis: {
        decimalsInFloat: 4,
      },
      stroke: {
        width: 2,
        dashArray: 2
      },

      markers: {
        size: 5,
        hover: {
          sizeOffset: 3
        }
      },
    },
    series: [
      {
        name: t('newsfeed_post_edge_rank_score'),
        data: selectEdgeRankScores(posts),
      },
      {
        name: t('newsfeed_post_popularity_score'),
        data: selectPopularityScores(posts),
      },
      {
        name: t('newsfeed_post_affinity_score'),
        data: selectAffinityScores(posts),
      },
      {
        name: t('newsfeed_post_time_factor_score'),
        data: selectTimeFactorScores(posts),
      },
      {
        name: t('newsfeed_post_like_count'),
        data: selectTotalLikeCounts(posts),
      },
      {
        name: t('newsfeed_post_comment_count'),
        data: selectTotalCommentCounts(posts),
      },
      {
        name: t('newsfeed_post_affinity_like_count'),
        data: selectAffinityLikeCounts(posts),
      },
      {
        name: t('newsfeed_post_affinity_comment_count'),
        data: selectAffinityCommentCounts(posts),
      },
      {
        name: t('newsfeed_post_affinity_is_from_followed_user'),
        data: selectAffinityIsFromFollowedUser(posts),
      },
  ]};

  return (
      <div>
        <div className="flex items-center mb-2 px-3">
          <input
              type="checkbox"
              id="toggleHideAds"
              className="form-checkbox"
              checked={hideAds}
              onChange={(e) => setHideAds(e.target.checked)}
          />
          <label htmlFor="toggleHideAds" className="ml-2 text-sm">
            {t('toggle_hide_ads')}
          </label>
        </div>

        <Chart
            options={chart.options}
            series={chart.series}
            type='line'
        />
      </div>
  );
};

export default NewsfeedChart;
