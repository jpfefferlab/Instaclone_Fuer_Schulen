import React, { useEffect, useState } from 'react';
import Sidebar from './Sidebar';
import { useTranslation } from 'react-i18next';
import Language from './Language';
import UpdateProfile from './UpdateProfile';
import NewsfeedAlgorithm from './NewsfeedAlgorithm';
import Advertisements from './Advertisements';

const Settings = () => {
  const { t } = useTranslation();

  const [selectedTab, setSelectedTab] = useState(0);
  const [isMobile, setIsMobile] = useState(false);


  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 720);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  const tabs = [{
    title: t('edit_profile'), component: <UpdateProfile />,
  }, {
    title: t('language'), component: <Language />,
  }, {
    title: t('personalized_ads'), component: <Advertisements />,
  }, {
    title: t('newsfeed_algorithm'), component: <NewsfeedAlgorithm />,
  }, {
    title: t('contact_information'), component: (<div className='p-2 sm:w-3/4 flex flex-col'>
      <span className='text-mm'>{t('info_text')}</span>
      <a href='https://info.instaclone.de'
         className=' text-mm text-blue-800'
         target='_blank' rel='noopener noreferrer'>{t('info_link')}</a>
    </div>),
  }];

  return (<>
    <div className='my-24 xl:w-2/3 mx-auto sm:pr-14 sm:pl-8'>
      {!isMobile ? (<div className='flex border rounded w-full bg-white'>
        <Sidebar
          tabs={tabs}
          activeTab={selectedTab}
          handleClick={setSelectedTab}
        />
        {tabs[selectedTab].component}
      </div>) : (<div className='text-center'>
        <select
          id='tab-select'
          className='items-center w-4/5 px-4 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500'
          value={selectedTab}
          onChange={(e) => setSelectedTab(e.target.value)}
        >
          {tabs.map((tab, index) => (<option key={index} value={index}>
            {tab.title}
          </option>))}
        </select>
        {tabs[selectedTab].component}
      </div>)}
    </div>

  </>);
};

export default Settings;
