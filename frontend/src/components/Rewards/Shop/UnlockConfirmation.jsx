import { useTranslation } from 'react-i18next';

const UnlockConfirmation = ({ amount, onConfirm, onCancel }) => {
  const { t } = useTranslation();

  return (
    <div className='fixed inset-0 flex items-center justify-center bg-gray-900 bg-opacity-50'>
      <div className='bg-white rounded-lg shadow-lg p-6 w-60 sm:w-96 text-center'>
        <h2 className='text-xl font-semibold mb-4'>
          {t('confirm_unlock_title')}
        </h2>
        <p className='text-gray-700 mb-6'>
          {t('confirm_unlock_message', { amount })}
        </p>
        <div className='flex justify-center space-x-4'>
          {/* Accept Button */}
          <button
            onClick={onConfirm}
            className='bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600 text-white font-semibold px-4 py-2 rounded-lg transition'
          >
            {t('yes_unlock')}
          </button>

          {/* Cancel Button */}
          <button
            onClick={onCancel}
            className='bg-gray-300 hover:bg-gray-400 text-gray-800 font-semibold px-4 py-2 rounded-lg transition'
          >
            {t('no_cancel')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default UnlockConfirmation;
