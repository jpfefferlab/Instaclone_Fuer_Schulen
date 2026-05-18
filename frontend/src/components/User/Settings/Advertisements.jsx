import MetaData from '../../Layouts/MetaData';
import { t } from 'i18next';
import React, { useState } from 'react';
import { toast } from 'react-toastify';
import { compressImage, toBase64 } from '../../../utils/imageUtils';
import { BrowserView } from 'react-device-detect';
import { emojiIcon } from '../../Home/SvgIcons';
import { Picker } from 'emoji-mart';
import { Dialog } from '@mui/material';
import PostItem from '../../Posts/PostItem';
import { useDispatch, useSelector } from 'react-redux';
import { addNewAdvertisement } from '../../../actions/postAction';
import { Multiselect } from 'multiselect-react-dropdown';

const Advertisements = () => {
  const dispatch = useDispatch();

  const { user } = useSelector((state) => state.user);
  const { loading } = useSelector((state) => state.newAdvertisement);

  const possibleInterests = [
    { name: t('interest_anime_comic'), id: 1, value: 'ANIME_COMIC' },
    { name: t('interest_cars'), id: 2, value: 'CARS' },
    { name: t('interest_beauty_style'), id: 3, value: 'BEAUTY_STYLE' },
    { name: t('interest_books'), id: 4, value: 'BOOKS' },
    { name: t('interest_comedy'), id: 5, value: 'COMEDY' },
    { name: t('interest_diy'), id: 6, value: 'DIY' },
    { name: t('interest_food'), id: 7, value: 'FOOD' },
    { name: t('interest_movies'), id: 8, value: 'MOVIES' },
    { name: t('interest_fitness'), id: 9, value: 'FITNESS' },
    { name: t('interest_gaming'), id: 10, value: 'GAMING' },
    { name: t('interest_home_garden'), id: 11, value: 'HOME_GARDEN' },
    { name: t('interest_art'), id: 12, value: 'ART' },
    { name: t('interest_music'), id: 13, value: 'MUSIC' },
    { name: t('interest_nature'), id: 14, value: 'NATURE' },
    { name: t('interest_travel'), id: 15, value: 'TRAVEL' },
    { name: t('interest_sports'), id: 16, value: 'SPORTS' },
    { name: t('interest_stars'), id: 17, value: 'STARS' },
    { name: t('interest_dance'), id: 18, value: 'DANCE' },
    { name: t('interest_animals'), id: 19, value: 'ANIMALS' },
    { name: t('interest_science'), id: 20, value: 'SCIENCE' }];

  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [showEmojis, setShowEmojis] = useState(false);
  const [dragged, setDragged] = useState(false);
  const [postImage, setPostImage] = useState('');
  const [postUpload, setPostUpload] = useState(null);
  const [previewImage, setPreviewImage] = useState('');
  const [caption, setCaption] = useState('');
  const [url, setUrl] = useState('');
  const [creationDate, setCreationDate] = useState('');
  const [Female, setFemale] = useState(false);
  const [Male, setMale] = useState(false);
  const [NA, setNA] = useState(false);
  const [Other, setOther] = useState(false);
  const gender = [{ state: Female, message: 'Female' }, { state: Male, message: 'Male' }, {
    state: NA, message: 'NA',
  }, { state: Other, message: 'Other' }];
  const [lowerAge, setLowerAge] = useState('');
  const [higherAge, setHigherAge] = useState('');
  const [interests, setInterests] = useState([]);
  const [keyword, setKeyword] = useState('');
  const [ageChecked, setAgeChecked] = useState(false);
  const [interestsChecked, setInterestsChecked] = useState(false);

  const handleNewEmoji = (event) => {
    setCaption(caption + event.native);
    setShowEmojis(false);
  };

  const handleDragChange = () => {
    setDragged(!dragged);
  };

  const handleFileChange = async (e) => {
    if (e.target.files[0].size > 5242880) {
      toast.error('File size cannot exceed 10mb');
    } else {
      setPostImage('');
      const compressedImage = await compressImage(e.target.files[0]);
      const prev = URL.createObjectURL(compressedImage);
      setPreviewImage(prev);
      setPostUpload(compressedImage);
      const img = await toBase64(compressedImage);
      setPostImage(img.base64);
    }
  };

  const handlePreview = (e) => {
    e.preventDefault();
    setShowPreviewModal(true);
  };

  const handleDateChange = (e) => {
    const selectedDate = new Date(e.target.value);
    const year = selectedDate.getFullYear();
    const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
    const day = String(selectedDate.getDate()).padStart(2, '0');
    const hours = String(selectedDate.getHours()).padStart(2, '0');
    const minutes = String(selectedDate.getMinutes()).padStart(2, '0');

    const formattedDate = `${year}-${month}-${day} ${hours}:${minutes}:00`;
    setCreationDate(formattedDate);
  };

  const handlePublish = async (e) => {
    e.preventDefault();
    if (lowerAge > higherAge || higherAge < lowerAge) {
      toast.error(t('age_error'));
      return;
    }
    if (interests.length === 0) {
      toast.error(t('interests_error'));
      return;
    }

    const formData = new FormData();
    formData.set('caption', caption);
    formData.set('created_on', creationDate);
    formData.set('content', postImage);
    if (postUpload) {
      formData.set('content_upload', postUpload, postUpload.name || 'advertisement.jpg');
    }
    formData.set('url', url);
    formData.set('gender', gender
      .filter((item) => item.state)
      .map((item) => item.message)
      .join(','));
    formData.set('target_age_low', lowerAge);
    formData.set('target_age_high', higherAge);
    formData.set('target_age_none', ageChecked);
    formData.set('interests', interests.map((item) => item.value).join(','));
    formData.set('no_interests', interestsChecked);
    formData.set('keyword', keyword);
    try {
      await dispatch(addNewAdvertisement(formData));
      setCaption('');
      setCreationDate('');
      setPostImage('');
      setPostUpload(null);
      setUrl('');
      setMale(false);
      setFemale(false);
      setOther(false);
      setNA(false);
      setLowerAge('');
      setHigherAge('');
      setAgeChecked(false);
      setInterests([]);
      setInterestsChecked(false);
      setKeyword('');
      setShowPreviewModal(false);
    } catch (error) {
      toast.error(t('publish_error'));
      setShowPreviewModal(false);
    }
  };

  const onSelectInterest = (newList, _) => {
    setInterests(newList);
  };

  const onRemoveInterest = (newList, _) => {
    setInterests(newList);
  };

  return (<>
    <MetaData title={t('personalized_ads')} />

    <Dialog
      open={showPreviewModal}
      onClose={() => setShowPreviewModal(false)}
    >
      <div className='flex flex-col align-middle'>
        <PostItem
          id={undefined}
          type={'ADVERTISEMENT'}
          url={url}
          caption={caption}
          content={postImage}
          creator={user}
          comments={[]}
          likes={[]}
          usage={'adPreview'}
        ></PostItem>
        <button
          className='bg-primary-blue font-medium rounded my-4 py-2 w-40 mx-auto text-white text-sm'
          onClick={handlePublish}
          disabled={loading}
        >
          {t('publish')}
        </button>
      </div>
    </Dialog>

    <form
      onSubmit={handlePreview}
      encType='multipart/form-data'
      className='flex flex-col gap-4 py-4 px-4 sm:py-10 sm:px-24 sm:w-3/4'
    >
      {postImage ? (<div className='bg-black h-48 sm:h-[40vh] w-full'>
        <img
          draggable='false'
          className='object-contain h-full w-full'
          src={previewImage}
          alt='post'
        />
      </div>) : (<div
        onDragEnter={handleDragChange}
        onDragLeave={handleDragChange}
        className={`${dragged && 'opacity-40'} relative bg-white h-48 sm:h-[40vh] w-full flex flex-col gap-2 items-center justify-center mx-16`}
      >
        <svg
          aria-label='Icon to represent media such as images or videos'
          color='#262626'
          fill='#262626'
          height='77'
          role='img'
          viewBox='0 0 97.6 77.3'
          width='96'
        >
          <path
            d='M16.3 24h.3c2.8-.2 4.9-2.6 4.8-5.4-.2-2.8-2.6-4.9-5.4-4.8s-4.9 2.6-4.8 5.4c.1 2.7 2.4 4.8 5.1 4.8zm-2.4-7.2c.5-.6 1.3-1 2.1-1h.2c1.7 0 3.1 1.4 3.1 3.1 0 1.7-1.4 3.1-3.1 3.1-1.7 0-3.1-1.4-3.1-3.1 0-.8.3-1.5.8-2.1z'
            fill='currentColor'
          ></path>
          <path
            d='M84.7 18.4L58 16.9l-.2-3c-.3-5.7-5.2-10.1-11-9.8L12.9 6c-5.7.3-10.1 5.3-9.8 11L5 51v.8c.7 5.2 5.1 9.1 10.3 9.1h.6l21.7-1.2v.6c-.3 5.7 4 10.7 9.8 11l34 2h.6c5.5 0 10.1-4.3 10.4-9.8l2-34c.4-5.8-4-10.7-9.7-11.1zM7.2 10.8C8.7 9.1 10.8 8.1 13 8l34-1.9c4.6-.3 8.6 3.3 8.9 7.9l.2 2.8-5.3-.3c-5.7-.3-10.7 4-11 9.8l-.6 9.5-9.5 10.7c-.2.3-.6.4-1 .5-.4 0-.7-.1-1-.4l-7.8-7c-1.4-1.3-3.5-1.1-4.8.3L7 49 5.2 17c-.2-2.3.6-4.5 2-6.2zm8.7 48c-4.3.2-8.1-2.8-8.8-7.1l9.4-10.5c.2-.3.6-.4 1-.5.4 0 .7.1 1 .4l7.8 7c.7.6 1.6.9 2.5.9.9 0 1.7-.5 2.3-1.1l7.8-8.8-1.1 18.6-21.9 1.1zm76.5-29.5l-2 34c-.3 4.6-4.3 8.2-8.9 7.9l-34-2c-4.6-.3-8.2-4.3-7.9-8.9l2-34c.3-4.4 3.9-7.9 8.4-7.9h.5l34 2c4.7.3 8.2 4.3 7.9 8.9z'
            fill='currentColor'
          ></path>
          <path
            d='M78.2 41.6L61.3 30.5c-2.1-1.4-4.9-.8-6.2 1.3-.4.7-.7 1.4-.7 2.2l-1.2 20.1c-.1 2.5 1.7 4.6 4.2 4.8h.3c.7 0 1.4-.2 2-.5l18-9c2.2-1.1 3.1-3.8 2-6-.4-.7-.9-1.3-1.5-1.8zm-1.4 6l-18 9c-.4.2-.8.3-1.3.3-.4 0-.9-.2-1.2-.4-.7-.5-1.2-1.3-1.1-2.2l1.2-20.1c.1-.9.6-1.7 1.4-2.1.8-.4 1.7-.3 2.5.1L77 43.3c1.2.8 1.5 2.3.7 3.4-.2.4-.5.7-.9.9z'
            fill='currentColor'
          ></path>
        </svg>
        <p className='text-xl'>{t('drag_photo_title')}</p>
        <input
          type='file'
          accept='image/*'
          required
          onChange={handleFileChange}
          className='absolute h-full w-full opacity-0'
        />
      </div>)}

      <div className='p-3 w-full border-b relative'>
          <textarea
            className='border w-full rounded p-1 outline-none resize-none h-32 sm:h-auto'
            placeholder={t('caption_holder')}
            name='caption'
            required
            rows='5'
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            onClick={() => setShowEmojis(false)}
          ></textarea>

        <div className='relative flex items-center justify-between'>
          <BrowserView>
              <span
                onClick={() => setShowEmojis(!showEmojis)}
                className='cursor-pointer'
              >
                {emojiIcon}
              </span>

            {showEmojis && (<div className='absolute bottom-0 left-10'>
              <Picker
                set='google'
                onSelect={handleNewEmoji}
                title='Emojis'
              />
            </div>)}
          </BrowserView>
        </div>
      </div>

      {/*Advertisement input */}

      <div className='flex flex-col items-center gap-8 w-3/4 ml-20'>
        {/* URL */}
        <div className='flex w-full gap-8 text-right items-center'>
          <span className='w-1/4 font-semibold'>Link</span>
          <input
            className='border rounded p-1 w-3/4'
            type='url'
            required
            placeholder={t('create_ads_link_example')}
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
        </div>
        {/* Visibility Date*/}
        <div className='flex w-full gap-8 text-right items-center'>
            <span className='w-1/4 font-semibold'>
              {t('create_ads_visible_from').split('\n').map((line, i) =>
                <div key={i} style={i > 0 ? { fontWeight: 'lighter' } : {}}>{line}</div>)}
            </span>
          <input
            className='border rounded p-1 w-3/4'
            type='datetime-local'
            required
            value={creationDate}
            onChange={handleDateChange}
          />
        </div>
        {/*Gender Choices*/}
        <div className='flex w-full gap-8 text-right items-start'>
            <span className='w-1/4 font-semibold '>
              {t('advertisement_genders_choice')}
            </span>
          <div className='flex flex-col text-left w-3/4'>
            <div className='flex gap-2 '>
              <input
                type='checkbox'
                className='form-checkbox'
                checked={Male}
                onChange={(e) => setMale(e.target.checked)}
              />
              <span> {t('gender_male')} </span>
            </div>
            <br />
            <div className='flex gap-2'>
              <input
                type='checkbox'
                className='form-checkbox'
                checked={Female}
                onChange={(e) => setFemale(e.target.checked)}
              />
              <span> {t('gender_female')} </span>
            </div>
            <br />
            <div className='flex gap-2'>
              <input
                type='checkbox'
                className='form-checkbox'
                checked={Other}
                onChange={(e) => setOther(e.target.checked)}
              />
              <span> {t('gender_other')} </span>
            </div>
            <br />
            <div className='flex gap-2'>
              <input
                type='checkbox'
                className='form-checkbox'
                checked={NA}
                onChange={(e) => setNA(e.target.checked)}
              />
              <span> {t('no_information_given')} </span>
            </div>
            <br />
          </div>
        </div>

        {/*Interest Select*/}
        <div className='flex w-full gap-8 text-right items-baseline'>
            <span className='w-1/4 font-semibold'>
              {t('advertisement_interests_choice')}
            </span>
          <div className='flex-col w-3/4'>
            <Multiselect
              style={{
                searchBox: { borderColor: '#e5e7eb' },
              }}
              options={possibleInterests}
              placeholder={t('advertisement_select_interests')}
              avoidHighlightFirstOption={true}
              hidePlaceholder={true}
              displayValue='name'
              selectedValues={interests}
              onSelect={onSelectInterest}
              onRemove={onRemoveInterest}
              required
            />
            <div
              className='text-left flex gap-2'
              style={{ marginTop: '1rem' }}
            >
              <input
                type='checkbox'
                className='form-checkbox'
                checked={interestsChecked}
                onChange={(e) => setInterestsChecked(e.target.checked)}
              />
              <span> {t('advertisement_interests_choice_none')} </span>
            </div>
          </div>
        </div>

        {/*Age Options*/}
        <div className='flex w-full gap-8 text-right items-baseline'>
            <span className='w-1/4 font-semibold'>
              {t('advertisement_age_choice')}
            </span>
          <div className='flex-col w-3/4 gap-8'>
            <div className='flex gap-8'>
              <input
                type='number'
                className='border rounded p-1 w-1/2'
                required
                value={lowerAge}
                min={0}
                onChange={(e) => setLowerAge(e.target.value)}
                placeholder={t('advertisement_lower_age')}
              />
              <input
                type='number'
                className='border rounded p-1 w-1/2'
                required
                min={lowerAge}
                value={higherAge}
                onChange={(e) => setHigherAge(e.target.value)}
                placeholder={t('advertisement_higher_age')}
              />
            </div>
            <div className='text-left' style={{ marginTop: '1rem' }}>
              <input
                type='checkbox'
                className='form-checkbox'
                checked={ageChecked}
                onChange={(e) => setAgeChecked(e.target.checked)}
              />
              <span> {t('advertisement_age_choice_none')} </span>
            </div>
          </div>
        </div>

        {/* Keyword */}
        {/*<div className='flex w-full gap-8 text-right items-baseline'>
            <span className='w-1/4 font-semibold'>
              {t('advertisement_keyword')}
            </span>
          <div className='flex-col w-3/4'>
            <div className='flex'>
              <input
                className='border rounded p-1 w-full'
                type='text'
                pattern='^\w+$'
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
              />
            </div>
            <div className='text-left mt-1'>
                <span className='font-light'>
                  {t('advertisement_keyword_explainer')}
                </span>
            </div>
          </div>
        </div>*/}
      </div>

      <button className='bg-primary-blue font-medium rounded py-2 w-40 mx-auto text-white text-sm'>
        {t('preview')}
      </button>
    </form>
  </>);
};

export default Advertisements;
