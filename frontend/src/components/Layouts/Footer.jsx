import React from 'react';
import { useTranslation } from 'react-i18next';

const Footer = () => {
  const { t } = useTranslation();

  return (
    <div className='mt-5 border-t text-center fixed bottom-0 w-full h-12 bg-white'>
      <a
        href='https://info.instaclone.de'
        className=' text-mm text-blue-800'
        target='_blank'
        rel='noopener noreferrer'
      >
        {t('info_link')}
      </a>
    </div>
  );
};
export default Footer;
