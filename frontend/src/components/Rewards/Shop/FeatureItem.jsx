import React from 'react';
import { useTranslation } from 'react-i18next';
import UnlockButton from './UnlockButton';

const FeatureItem = ({ feature }) => {
  const { feature_name, feature_image, feature_cost, is_unlocked } = feature;
  const { t } = useTranslation();

  // Map features to translations
  const featureTranslations = {
    EDIT_AVATAR: {
      name: 'edit_avatar',
      description: 'edit_avatar_description',
    },
    UNLIMITED_POSTS: {
      name: 'unlimited_posts',
      description: 'unlimited_posts_description',
    },
    CHANGE_BACKGROUND_IMAGE: {
      name: 'change_background_image',
      description: 'change_background_image_description'
    }
  };

  // Get translation key based on action type
  const translatedFeature = featureTranslations[feature_name] || {
    name: 'feature_unknown',
    description: 'feature_unknown_description',
  };

  return (
    <>
      <div
        className={`relative bg-white p-1 rounded-lg shadow-md ${!is_unlocked ? 'grayscale hover:grayscale-0' : ''
          }`}
      >
        {/* Border with a gradient */}
        <div className='rounded-lg p-2 bg-gradient-to-r from-orange-500 to-pink-500'>
          {/* Content */}
          <div className='bg-white rounded-lg p-4 flex flex-col items-center text-center'>
            {/* Image */}
            <div className='w-full h-auto rounded-lg mb-4'>
              {feature_image && (
                <img src={feature_image} alt='' loading='lazy' />
              )}
            </div>
            {/* Feature Name */}
            <h2 className='font-semibold text-lg'>
              {t(translatedFeature.name)}
            </h2>
            {/* Description */}
            <p className='text-sm text-gray-600 mb-4'>
              {t(translatedFeature.description)}
            </p>
            {/* Button to unlock the feature */}
            <div>
              <UnlockButton
                featureName={feature_name}
                featureCost={feature_cost}
                isUnlocked={is_unlocked}
              />
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default FeatureItem;
