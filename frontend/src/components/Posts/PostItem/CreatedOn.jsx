import moment from 'moment';
import { useTranslation } from 'react-i18next';


const CreatedOn = ({ created_on }) => {
  const { t } = useTranslation();

  const formatCreatedOn = (created_on) => {
    return t('created_on_format', {
      day: moment(created_on).format('DD'),
      month: moment(created_on).format('MM'),
      year: moment(created_on).format('YYYY'),
      time: moment(created_on).format('H:mm:ss'),
    });
  }

  return (<>
      <span className='text-xs text-gray-500 cursor-pointer'>
        {
          formatCreatedOn(created_on)
        }
      </span>
  </>);
};

export default CreatedOn;
