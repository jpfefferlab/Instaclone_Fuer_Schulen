import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  unlockFeature,
  clearFeatureErrors,
} from '../../../actions/workbookAction';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';
import InfluencePointsIcon from '../InfluencePointsIcon';
import UnlockConfirmation from './UnlockConfirmation';

const UnlockButton = ({ featureName, featureCost, isUnlocked }) => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const { loading, errors, successes } = useSelector(
    (state) => state.userFeatures
  );

  const featureUnlockSuccess = successes[featureName];
  const featureUnlockError = errors[featureName];

  const handleUnlock = () => {
    if (!isUnlocked) {
      setIsModalOpen(true);
    }
  };

  const confirmUnlock = () => {
    setIsModalOpen(false);
    dispatch(unlockFeature(featureName));
  };

  const cancelUnlock = () => {
    setIsModalOpen(false);
  };

  // Handle success and error toasts for this feature
  useEffect(() => {
    if (featureUnlockSuccess) {
      toast.success(t('feature_unlock_success'));
      dispatch(clearFeatureErrors());
    } else if (featureUnlockError) {
      toast.error(t('feature_unlock_fail'));
      dispatch(clearFeatureErrors());
    }
  }, [featureUnlockSuccess, featureUnlockError, dispatch, t]);

  return (
    <>
      <button
        type='button'
        className={`px-4 py-2 rounded-lg flex items-center space-x-2 transition text-xl bg-gradient-to-r from-orange-500 to-pink-500 text-white
          ${isUnlocked ? '' : 'hover:from-orange-600 hover:to-pink-600'}`}
        onClick={handleUnlock}
        disabled={isUnlocked}
      >
        {/* Render button Text based on state: feature unlocked or unlockable */}
        {isUnlocked ? (
          <span>{t('feature_already_unlocked')}</span>
        ) : (
          <div className='flex items-center space-x-1 text-white'>
            <span>{featureCost}</span>
            <div className='relative'>
              <InfluencePointsIcon />
            </div>
          </div>
        )}
      </button>

      {/* Show UnlockConfirmation modal if the modal is open */}
      {isModalOpen && (
        <UnlockConfirmation
          amount={featureCost}
          onConfirm={confirmUnlock}
          onCancel={cancelUnlock}
        />
      )}
    </>
  );
};

export default UnlockButton;
