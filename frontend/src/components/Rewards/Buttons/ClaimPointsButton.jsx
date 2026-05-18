import React, { useEffect, useState } from 'react';
import axios from '../../../Routes/axios';
import { useDispatch } from 'react-redux';
import { updateUserPoints } from '../../../actions/workbookAction';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';
import InfluencePointsIcon from '../InfluencePointsIcon';

/**
 * Clicking on this button rewards the logged in user with points.
 * @param {Integer} amount - amount of points to be added
 * @param {Boolean} claimed - tracks if the points have been claimed or not
 * @param submissionID - optional, sets awarded_points for corresponding submission
 */

const ClaimPointsButton = ({ amount, claimed, submissionID }) => {
  const dispatch = useDispatch();
  const { t } = useTranslation();
  const [isClaimed, setIsClaimed] = useState(claimed);

  useEffect(() => {
    setIsClaimed(claimed);
  }, [claimed]);

  const handleClaimPoints = async () => {
    try {
      const data = { amount: amount, submission_id: submissionID };

      // Send a POST request to the backend API to add points to the user's account
      const response = await axios.post('/api/add-points/', data);

      if (response.status === 200) {
        setIsClaimed(true);
        // Update Header to display new points amount
        const newPoints = response.data.points_balance;
        dispatch(updateUserPoints(newPoints));
        toast.success(t('points_claimed_success'));
      } else {
        toast.error(t('points_claimed_fail'));
      }
    } catch (error) {
      console.error('Error claiming points:', error);
      toast.error(t('points_claimed_fail'));
    }
  };

  // Change button style and disable based on claimed
  return (
    <button
      type='button'
      className={`px-4 py-2 rounded-lg flex items-center space-x-2 transition ${
        isClaimed
          ? 'bg-gray-400 text-gray-300'
          : 'bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600 text-white'
      }`}
      onClick={handleClaimPoints}
      disabled={isClaimed}
    >
      {isClaimed ? (
        <span>{t('points_already_claimed')}</span>
      ) : (
        <div className='flex items-center space-x-1 text-white'>
          <span>{t('claim_points', { amount })}</span>
          <div className='relative'>
            <InfluencePointsIcon />
          </div>
        </div>
      )}
    </button>
  );
};

export default ClaimPointsButton;
