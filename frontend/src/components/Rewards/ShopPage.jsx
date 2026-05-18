import React, { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useSelector, useDispatch } from 'react-redux';
import { fetchUserFeatures } from '../../actions/workbookAction';
import MetaData from '../Layouts/MetaData';
import FeatureItem from './Shop/FeatureItem';

const ShopPage = () => {
  const dispatch = useDispatch();
  const { features, loading, error } = useSelector(
    (state) => state.userFeatures || []
  );
  const { t } = useTranslation();
  const navigate = useNavigate();

  useEffect(() => {
    dispatch(fetchUserFeatures());
  }, [dispatch]);

  //TODO make loading/error page nicer
  if (loading) return <div>{t('shop_page_loading')}</div>;

  return (
    <>
      <MetaData title={t('shop_tab')} />
      <div className='sm:items-center'>
        <h1 className='ml-4 mt-4 mb-4 text-xl sm:text-2xl font-bold'>
          {t('welcome_shop')}
        </h1>
        <div>
          <p className='mx-4 text-justify'>
            {t('shop_description')} {t('points_explanation')}{' '}
            <button
              type='button'
              className='mt-4 px-4 py-2 rounded-lg flex items-center space-x-2 transition bg-primary-blue text-base text-white mx-auto'
              onClick={() => navigate('/workbook')}
            >
              {t('go_to_workbook')}
            </button>
          </p>
          <div className='ml-4 mt-8 mb-2 text-xl sm:text-2xl font-bold'>
            {t('unlockable_features')}
          </div>

          {/* Grid Layout for Feature Items */}
          <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-4 max-w-5xl mx-auto'>
            {features.length > 0 ? (
              features.map((feature) => (
                <div className='max-w-xs w-full mx-auto'>
                  <FeatureItem key={feature.feature_name} feature={feature} />
                </div>
              ))
            ) : (
              <p className='text-center text-gray-500 col-span-full'>
                No features available
              </p>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default ShopPage;
