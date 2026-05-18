import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';
import { useEffect, useRef, useState } from 'react';
import { getAnalytics } from '../../actions/analyticsAction';
import { DataSet, Network } from 'vis-network/standalone/esm/vis-network';
import { ArcElement, BarElement, CategoryScale, Chart as ChartJS, Legend, LinearScale, Title, Tooltip } from 'chart.js';
import { Bar, Pie } from 'react-chartjs-2';
import { Card } from '@mui/material';
import MetaData from '../Layouts/MetaData';

const Analytics = () => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const analytics = useSelector((state) => state.analytics);
  const [postChartType, setPostChartType] = useState(0);
  const [postChartData, setPostChartData] = useState([]);
  const possibleInterests = [{
    name: t('interest_anime_comic'), id: 0, value: 'ANIME_COMIC',
  }, { name: t('interest_cars'), id: 1, value: 'CARS' }, {
    name: t('interest_beauty_style'), id: 2, value: 'BEAUTY_STYLE',
  }, { name: t('interest_books'), id: 3, value: 'BOOKS' }, {
    name: t('interest_comedy'), id: 4, value: 'COMEDY',
  }, { name: t('interest_diy'), id: 5, value: 'DIY' }, {
    name: t('interest_food'), id: 6, value: 'FOOD',
  }, { name: t('interest_movies'), id: 7, value: 'MOVIES' }, {
    name: t('interest_fitness'), id: 8, value: 'FITNESS',
  }, { name: t('interest_gaming'), id: 9, value: 'GAMING' }, {
    name: t('interest_home_garden'), id: 10, value: 'HOME_GARDEN',
  }, { name: t('interest_art'), id: 11, value: 'ART' }, {
    name: t('interest_music'), id: 12, value: 'MUSIC',
  }, { name: t('interest_nature'), id: 13, value: 'NATURE' }, {
    name: t('interest_travel'), id: 14, value: 'TRAVEL',
  }, { name: t('interest_sports'), id: 15, value: 'SPORTS' }, {
    name: t('interest_stars'), id: 16, value: 'STARS',
  }, { name: t('interest_dance'), id: 17, value: 'DANCE' }, {
    name: t('interest_animals'), id: 18, value: 'ANIMALS',
  }, { name: t('interest_science'), id: 19, value: 'SCIENCE' }, { name: t('no_interests'), id: 20, value: 'NONE' }];
  ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Title, Tooltip, Legend);
  // Chart config
  const backgroundColors = ['#427BBE', '#89B5E8'];
  //Post Chart

  useEffect(() => {
    if (analytics.students.length > 0) {
      const initialData = analytics.students.map((student) => analytics.posts.filter((post) => post.creator === student.id).length);
      setPostChartData(initialData);
    }
  }, [analytics.students]);

  const handlePostChartTypeChange = (event) => {
    setPostChartType(event.target.value);
    if (Number(event.target.value) === 0) {
      setPostChartData(analytics.students.map((student) => analytics.posts.filter((post) => post.creator === student.id).length));
    } else {
      setPostChartData(analytics.students.map((student) => {
        return analytics.posts.filter((post) => post.creator === student.id && post.hashtags === Number(event.target.value)).length;
      }));
    }
  };

  const postChartLabels = analytics.students.map((student) => student.username);
  const postChartDataset = {
    label: t('count'),
    data: postChartData,
    backgroundColor: postChartLabels.map((_, index) => backgroundColors[index % backgroundColors.length]),
  };

  const postData = { labels: postChartLabels, datasets: [postChartDataset] };

  const postOptions = {
    scales: {
      x: { grid: { display: false } }, y: {
        ticks: {
          stepSize: 1,
        },
      },
    }, plugins: { legend: { display: false } },
  };
  const hashtagSelectOptions = [<option key={0} value={0}>{t('all_posts')} ({analytics.totalPostCount} {t('posts')})</option>];
  for (let [index, value] of Object.entries(analytics.hashtags)) {
    hashtagSelectOptions.push(<option
      key={index} value={index}> {value} ({analytics.h_counter[index]} {t('posts')})</option>);
  }
  // Gender Chart

  const genderLabels = [t('gender_male'), t('gender_female'), t('gender_other'), t('no_information_given')];
  let maleUsers = [];
  let femaleUsers = [];
  let otherUsers = [];
  let naUsers = [];

  analytics.profiles.forEach((profile) => {
    switch (profile.gender) {
      case 'MALE':
        maleUsers.push(profile.user__username);
        break;
      case 'FEMALE':
        femaleUsers.push(profile.user__username);
        break;
      case 'OTHER':
        otherUsers.push(profile.user__username);
        break;
      default:
        naUsers.push(profile.user__username);
        break;
    }
  });

  const genderDataset = {
    label: t('count'),
    data: [maleUsers.length, femaleUsers.length, otherUsers.length, naUsers.length],
    backgroundColor: ['#427BBE', '#89B5E8', '#30548C', '#D4E1F0'],
  };


  const genderData = {
    labels: genderLabels, datasets: [genderDataset],
  };

  const genderOptions = {
    maintainAspectRatio: false, plugins: {
      legend: {
        position: 'bottom',
      }, tooltip: {
        displayColors: false, callbacks: {
          title: function(context) {
            let index = context[0].dataIndex;
            let count = context[0].raw;
            let title;
            switch (index) {
              case 0:
                title = t('gender_male');
                break;
              case 1:
                title = t('gender_female');
                break;
              case 2:
                title = t('gender_other');
                break;
              default:
                title = t('no_information_given');
            }
            return `${title}: ${count}`;
          }, label: function(context) {
            let index = context.dataIndex;
            let usernames;
            switch (index) {
              case 0:
                usernames = maleUsers;
                break;
              case 1:
                usernames = femaleUsers;
                break;
              case 2:
                usernames = otherUsers;
                break;
              default:
                usernames = naUsers;
            }
            return usernames.map(username => ' ' + username);
          },
        },
      },
    },
  };


  //Age Chart
  const ageLabels = ['<=10', '11', '12', '13', '14', '15', '16', '17', '18', '19', '>=20', t('no_age_info')];
  const ageTooltips = Array(12);
  const ageDataset = {
    label: t('count'), data: ageLabels.map((label, index) => {
      if (index === ageLabels.length - 1) {
        let cur = analytics.profiles.filter(profile => profile.age === 'NONE');
        ageTooltips[11] = cur.map((profile => profile.user__username)).join(', ');
        return cur.length;
      } else if (index === 0 || index === 10) {
        let boundary = Number(label.slice(-2));
        if (index === 0) {
          let cur = analytics.profiles.filter(profile => profile.age <= boundary);
          ageTooltips[index] = cur.map((profile => profile.user__username)).join(', ');
          return cur.length;
        } else {
          let cur = analytics.profiles.filter(profile => profile.age >= boundary);
          ageTooltips[index] = cur.map((profile => profile.user__username)).join(', ');
          return cur.length;
        }
      } else {
        let boundary = Number(label);
        let cur = analytics.profiles.filter(profile => profile.age === boundary);
        ageTooltips[index] = cur.map((profile => profile.user__username)).join(', ');
        return cur.length;
      }
    }), backgroundColor: ageLabels.map((_, index) => backgroundColors[index % backgroundColors.length]),
  };

  const ageData = {
    labels: ageLabels, datasets: [ageDataset],
  };

  const ageOptions = {
    scales: {
      y: {
        ticks: {
          stepSize: 1,
        }, grid: {
          display: false,
        },
      }, x: {
        grid: {
          display: false,
        },
      },
    }, plugins: {
      legend: { display: false }, tooltip: {
        displayColors: false, callbacks: {
          label: function(context) {
            let index = context.dataIndex;
            return ageTooltips[index];
          },
        },
      },
    },
  };

  // Interest Chart

  const interestLabels = possibleInterests.map((interest) => interest.name);
  const interestTooltips = Array(21);
  const interestDataset = {
    label: 'interestData', data: possibleInterests.map((interest, index) => {
      if (interest.id === 20) {
        let cur = analytics.profiles.filter(profile => profile.interests === 'NONE');
        interestTooltips[index] = cur.map((profile => profile.user__username)).join(', ');
        return cur.length;
      } else {
        let cur = analytics.profiles.filter(profile => profile.interests.includes(interest.value));
        interestTooltips[index] = cur.map((profile => profile.user__username)).join(', ');
        return cur.length;
      }
    }), backgroundColor: interestLabels.map((_, index) => backgroundColors[index % backgroundColors.length]),
  };

  const interestData = { labels: interestLabels, datasets: [interestDataset] };
  const interestOptions = {
    indexAxis: 'y', scales: {
      x: {
        ticks: {
          stepSize: 1,
        }, grid: {
          display: true,
        },
      }, y: {
        grid: {
          display: false,
        }, ticks: {
          autoSkip: false,
        },
      },
    }, plugins: {
      legend: { display: false }, tooltip: {
        displayColors: false, callbacks: {
          label: function(context) {
            let index = context.dataIndex;
            return interestTooltips[index];
          },
        },
      },
    },
  };

// Hashtag Network
  const nodes_for_net = new Set();
  const edges_for_net = [];
  const networkEdges = [];
  const networkNodes = [];
  // calculate the hashtags of each student
  const stud_hash = analytics.students.map((student) => {
    return [student.username, analytics.posts.filter((post) => post.creator === student.id)
      .map((post) => post.hashtags).filter((value) => value !== 'NONE')];
  }).filter(([, hashtags]) => hashtags.length > 0);

  // put the ones where there is a match in there
  stud_hash.forEach(([student, hashtags], index) => {
    let hashSet = new Set(hashtags);
    hashSet.forEach((hash) => {
      let matches = stud_hash.map(([username, userHashtags], innerIndex) => {
        if (username !== student && userHashtags.includes(hash)) {
          return { index: innerIndex, sharedHashtag: analytics.hashtags[hash] };
        }
      }).filter((value) => value !== undefined);

      if (matches.length > 0) {
        matches.forEach((match) => {
          if (!edges_for_net.some(([from, to]) => from === match.index && to === index)) { // Check if the opposite edge already exists
            nodes_for_net.add(index);
            nodes_for_net.add(match.index);
            edges_for_net.push([index, match.index, match.sharedHashtag]);
          }
        });
      }
    });
  });


  nodes_for_net.forEach((index) => {
    let [student, stud_hashes] = stud_hash[index];
    let hashList = [...new Set(stud_hashes)].map(hash_ID => analytics.hashtags[hash_ID]).join(', ');
    networkNodes.push({ id: index, label: student, title: hashList });
  });


  const edgeMap = new Map;
  edges_for_net.forEach(connection => {
    const [from, to, sharedHashtag] = connection;
    const key = [from, to].join(',');
    // Increment the count for the current connection
    const count = edgeMap.get(key) || { count: 0, sharedHashtags: [] };
    count.count++;
    if (!count.sharedHashtags.includes(sharedHashtag)) {
      count.sharedHashtags.push(sharedHashtag);
    }
    edgeMap.set(key, count);
  });

  edgeMap.forEach(({ count, sharedHashtags }, edge) => {
    let [start, target] = edge.split(',').map(Number);
    networkEdges.push({
      from: start, to: target, title: sharedHashtags.join(', '), width: count * 5,
    });
  });

  const networkRef = useRef(null); // Create a ref to the network container

  useEffect(() => {
    if (networkRef.current) {
      const nodes = new DataSet(networkNodes);
      const edges = new DataSet(networkEdges);

      const container = networkRef.current;
      const data = { nodes, edges };
      const options = {
        interaction: {
          navigationButtons: true,
        },
      }; // Provide any desired options for the network component

      const network = new Network(container, data, options);

      // Clean up the network instance when the component unmounts
      return () => {
        network.destroy();
      };
    }
  }, [networkNodes, networkEdges]);

  useEffect(() => {
    dispatch(getAnalytics());

    const interval = setInterval(() => {
      dispatch(getAnalytics());
    }, 30000); // 30 secs

    return () => clearInterval(interval);
  }, [dispatch]);


  return (<>
    <MetaData
      title={'Analytics • Instaclone'}
    />

    <div className='flex flex-col h-full w-full mx-auto'>
      {/*Title*/}
      <span className='mt-20 ml-5 mr-5  border-b' style={{ fontSize: '24px' }}>{'  '}{t('welcome_message')}</span>
      {/* Posts Number */}
      <div className='flex gap-40 mt-3 justify-center items-center mb-7' style={{ fontSize: '20px' }}>
        <div className='flex flex-col'>
          <span style={{ color: 'dimgray' }}>{t('student_count')}</span>
          <span className='font-semibold '>{analytics.totalStudentCount}</span>
        </div>
        <div className='flex flex-col'>
          <span style={{ color: 'dimgray' }}>{t('post_count')}</span>
          <span className='font-semibold '>{analytics.totalPostCount}</span>
        </div>
        <div className='flex flex-col'>
          <span style={{ color: 'dimgray' }}>{t('story_count')}</span>
          <span className='font-semibold '>{analytics.totalStoryCount}</span>
        </div>
        <div className='flex flex-col'>
          <span style={{ color: 'dimgray' }}>{t('like_count')}</span>
          <span className='font-semibold '>{analytics.totalLikeCount}</span>
        </div>
        <div className='flex flex-col'>
          <span style={{ color: 'dimgray' }}>{t('comment_count')}</span>
          <span className='font-semibold '>{analytics.totalCommentCount}</span>
        </div>
      </div>

      {/* Graphs */}
      <div className='flex-col'>
        <div className='columns-2 gap-7 mx-10 mb-7  '>
          <div className='col-auto mb-7'>
            <Card sx={{ padding: 3 }} className='mb-7 '>
              <div className='card-title mb-2'>
                <h3 className='mb-1' style={{ fontSize: '20px' }}>{t('posts')}</h3>
                <select value={postChartType} onChange={handlePostChartTypeChange}>
                  {hashtagSelectOptions}
                </select>
              </div>
              <div className='card-content'>
                <Bar data={postData} options={postOptions} />
              </div>
            </Card>
            <Card sx={{ padding: 3 }} className='items-center'>
              <div className='card-title mb-2' style={{ fontSize: '20px' }}>
                <h3>{t('age')}</h3>
              </div>
              <div className='card-content'>
                <Bar data={ageData} options={ageOptions} />
              </div>
            </Card>
          </div>
          <div className='flex-col'>
            <Card sx={{ padding: 3 }} className='mb-7 items-center'>
              <div className='card-title mb-2' style={{ fontSize: '20px' }}>
                <h3>{t('gender')}</h3>
              </div>
              <div className='card-content'>
                <Pie data={genderData} options={genderOptions} height={'200px'} width={'200px'} />
              </div>
            </Card>
            <Card sx={{ padding: 3 }} className='items-center'>
              <div className='card-title mb-2' style={{ fontSize: '20px' }}>
                <h3>{t('interests')}</h3>
              </div>
              <div className='card-content'>
                <Bar data={interestData} options={interestOptions} height={'300px'} />
              </div>
            </Card>
          </div>
        </div>
        <div className='mx-10 mb-10'>
          <Card sx={{ padding: 3 }} className='items-center'>
            <div className='card-title mb-2' style={{ fontSize: '20px' }}>
              <h3>{t('hashtag_network')}</h3>
            </div>
            <div className='card-content' ref={networkRef} style={{ height: '400px' }} />
          </Card>
        </div>
      </div>
    </div>
  </>);
};

export default Analytics;
