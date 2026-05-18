import React, { useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  clearErrors,
  loadUser,
  updateProfile,
} from '../../../actions/userAction';
import { fetchUserFeatures } from '../../../actions/workbookAction';
import { UPDATE_PROFILE_RESET } from '../../../constants/userConstants';
import MetaData from '../../Layouts/MetaData';
import { useTranslation } from 'react-i18next';
import { compressAvatar, compressImage, prependBase64 } from '../../../utils/imageUtils';
import { find, isEmpty, join } from 'lodash';
import { Multiselect } from 'multiselect-react-dropdown';
import empty_profile from '../../../assets/images/empty_profile.png';
import ShopButton from '../../Rewards/Shop/ShopButton';

const getBase64 = (file) => {
  return new Promise((res) => {
    const reader = new FileReader();
    const { type, name, prev } = file;
    reader.addEventListener('load', () => {
      res({
        name,
        type,
        prev,
        base64: reader.result.split(';base64,')[1],
      });
    });
    reader.readAsDataURL(file);
  });
};

const UpdateProfile = () => {
  const { t } = useTranslation();

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
    { name: t('interest_science'), id: 20, value: 'SCIENCE' },
  ];

  const dispatch = useDispatch();
  const navigate = useNavigate();
  const avatarInput = useRef(null);
  const backgroundInput = useRef(null);

  const { user } = useSelector((state) => state.user);
  const { error, isUpdated, loading } = useSelector((state) => state.profile);
  const { features } = useSelector((state) => state.userFeatures || []);
  const [isLoading, setIsLoading] = useState(true);

  const [first_name, setFirst_name] = useState('');
  const [last_name, setLast_name] = useState('');
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('');
  const [interests, setInterests] = useState([]);
  const [avatar, setAvatar] = useState('');
  const [avatarPreview, setAvatarPreview] = useState('');
  const [canEditAvatar, setCanEditAvatar] = useState(false);
  const [backgroundImage, setBackgroundImage] = useState('');
  const [backgroundPreview, setBackgroundPreview] = useState('');
  const [canEditBackground, setCanEditBackground] = useState(false);

  useEffect(() => {
    if (user) {
      setFirst_name(user.first_name);
      setLast_name(user.last_name);
      setUsername(user.username);
      setBio(user.profile?.bio);
      setAge(user.profile?.age ? user.profile.age.toString() : '');
      setGender(user.profile?.gender);
      setInterests(
        user.profile?.interests ? mapSavedInterests(user.profile.interests) : []
      );
      setAvatar(user.profile?.picture ?? '');
      setAvatarPreview(
        user.profile?.picture ? prependBase64(user.profile.picture) : ''
      );
      setBackgroundImage(user.profile?.background_image || '');
      setBackgroundPreview(
        user.profile?.background_image ? prependBase64(user.profile.background_image) : ''
      );
    }

    if (error) {
      toast.error(error);
      dispatch(clearErrors());
    }
    if (isUpdated) {
      toast.success(t('profile_updated'));
      dispatch(loadUser());
      navigate(`/${username}`);

      dispatch({ type: UPDATE_PROFILE_RESET });
    }
  }, [dispatch, user, error, isUpdated]);

  // Fetch user features
  useEffect(() => {
    dispatch(fetchUserFeatures());
    setIsLoading(false);
  }, [dispatch]);

  // Check if the user can edit the avatar
  useEffect(() => {
    // No features, default to true
    if (!features || features.length === 0) {
      setCanEditAvatar(true);
    } else {
      // Check if 'EDIT_AVATAR' feature exists and is unlocked
      const hasEditAvatarFeature = features.some(
        (feature) =>
          feature.feature_name === 'EDIT_AVATAR' && feature.is_unlocked
      );

      //If the feature exists and is unlocked, set to true; if not found, default to true
      setCanEditAvatar(
        hasEditAvatarFeature ||
        !features.some((feature) => feature.feature_name === 'EDIT_AVATAR')
      );
    }
  }, [features]);

  // Check if the user can change the background image
  useEffect(() => {
    // No features, default to true
    if (!features || features.length === 0) {
      setCanEditBackground(true);
    } else {
      // Check if 'CHANGE_BACKGROUND_IMAGE' feature exists and is unlocked
      const hasEditBackgroundFeature = features.some(
        (feature) =>
          feature.feature_name === 'CHANGE_BACKGROUND_IMAGE' && feature.is_unlocked
      );

      //If the feature exists and is unlocked, set to true; if not found, default to true
      setCanEditBackground(
        hasEditBackgroundFeature ||
        !features.some((feature) => feature.feature_name === 'CHANGE_BACKGROUND_IMAGE')
      );
    }
  }, [features]);


  const mapSavedInterests = (savedInterests) => {
    const interestValues = savedInterests.split(',');
    return interestValues.map((savedInterestValue) =>
      find(possibleInterests, { value: savedInterestValue })
    );
  };

  const mapInterestsToSavedInterests = (interests) => {
    const interestValues = interests.map((interest) => interest.value);
    return join(interestValues, ',');
  };

  const handleUpdate = (e) => {
    e.preventDefault();
    const data = {
      first_name: first_name,
      last_name: last_name,
      username: username,
      profile: {
        bio: isEmpty(bio) ? undefined : bio,
        picture: isEmpty(avatar) ? undefined : avatar,
        background_image: isEmpty(backgroundImage) ? undefined : backgroundImage,
        age: isEmpty(age) ? undefined : age,
        gender: isEmpty(gender) ? undefined : gender,
        interests: isEmpty(interests)
          ? undefined
          : mapInterestsToSavedInterests(interests),
      },
    };

    dispatch(updateProfile(data, user));
  };

  const handleAvatarChange = async (e) => {
    // Prevent changing avatar if feature is locked
    if (!canEditAvatar) return;

    setAvatar('');
    const compressedAvatar = await compressAvatar(e.target.files[0]);
    const prev = URL.createObjectURL(compressedAvatar);
    setAvatarPreview(prev);
    const img = await getBase64(compressedAvatar);
    setAvatar('');
    setAvatar(img.base64);
  };

  const handleBackgroundChange = async (e) => {
    if (!canEditBackground) return;

    const file = e.target.files[0];
    if (file) {
      const prev = URL.createObjectURL(file);
      setBackgroundPreview(prev);
      const compressedBg = await compressImage(file);
      const imgData = await getBase64(compressedBg);
      setBackgroundImage(imgData.base64);
    }
  };

  const onSelectInterest = (newList, _) => {
    setInterests(newList);
  };

  const onRemoveInterest = (newList, _) => {
    setInterests(newList);
  };

  return (
    <>
      <MetaData title='Edit Profile • Instaclone' />

      <form
        onSubmit={handleUpdate}
        encType='multipart/form-data'
        className='flex flex-col gap-4 py-4 px-4 sm:py-10 sm:px-24 sm:w-3/4 mb-44'
      >
        {/* Avatar */}
        <div className='flex w-full gap-8 items-center'>
          <div className='w-1/4 flex justify-end'>
            <div className='w-11 h-11'>
              <img
                draggable='false'
                className='w-full h-full rounded-full border object-cover'
                src={avatarPreview}
                alt='avatar'
              />
            </div>
          </div>

          <div className='w-3/4 flex flex-col'>
            {/* Username */}
            <span className='text-xl font-medium'>{username}</span>
            {/* Check if avatar feature is unlocked */}
            {canEditAvatar && !isLoading ? (
              <>
                <label
                  onClick={() => avatarInput.current.click()}
                  className='text-sm font-medium text-primary-blue cursor-pointer'
                >
                  {t('change_profile_photo')}
                </label>
                <input
                  type='file'
                  accept='image/*'
                  name='avatar'
                  ref={avatarInput}
                  onChange={handleAvatarChange}
                  className='hidden'
                />
              </>
            ) : (
              <>
                <label className='text-sm font-medium text-gray-400 cursor-not-allowed'>
                  {t('change_profile_photo')}
                </label>
                <ShopButton />
              </>
            )}
          </div>
        </div>

        {/* Background Preview */}
        <div className='flex w-full gap-8 items-center'>
          <div className='w-1/4 flex justify-end'>
            <div className='w-20 h-10 bg-gray-100'>
              <img
                src={backgroundPreview}
                className='w-full h-full object-cover rounded border'
              />
            </div>
          </div>

          <div className='w-3/4 flex flex-col'>
            {canEditBackground && !isLoading ? (
              <>
                <label
                  onClick={() => backgroundInput.current.click()}
                  className='text-sm font-medium text-primary-blue cursor-pointer'
                >
                  {t('change_background_image')}
                </label>
                <input
                  type='file'
                  accept='image/*'
                  ref={backgroundInput}
                  onChange={handleBackgroundChange}
                  className='hidden'
                />
              </>
            ) : (
              <div className='flex-col items-center gap-2'>
                <label className='text-sm font-medium text-gray-400 cursor-not-allowed'>
                  {t('change_background_image')}
                </label>
                <ShopButton />
              </div>
            )}
          </div>
        </div>

        <div className='flex w-full gap-8 text-right items-center'>
          <span className='w-1/4 font-semibold'>{t('first_name')}</span>
          <input
            className='border rounded p-1 w-3/4'
            type='text'
            placeholder={t('first_name')}
            value={first_name}
            onChange={(e) => setFirst_name(e.target.value)}
          />
        </div>
        <div className='flex w-full gap-8 text-right items-center'>
          <span className='w-1/4 font-semibold'>{t('last_name')}</span>
          <input
            className='border rounded p-1 w-3/4'
            type='text'
            placeholder={t('last_name')}
            value={last_name}
            onChange={(e) => setLast_name(e.target.value)}
          />
        </div>
        <div className='flex w-full gap-8 text-right items-center'>
          <span className='w-1/4 font-semibold'>{t('username')}</span>
          <input
            className='border rounded p-1 w-3/4'
            type='text'
            placeholder={t('username')}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            disabled
          />
        </div>
        <div className='flex w-full gap-8 text-right items-start'>
          <span className='w-1/4 font-semibold'>{t('bio')}</span>
          <textarea
            className='border rounded outline-none resize-none p-1 w-3/4'
            name='bio'
            placeholder={t('bio')}
            rows='3'
            value={bio || ''}
            onChange={(e) => setBio(e.target.value)}
          ></textarea>
        </div>
        <div className='flex w-full gap-8 text-right items-center'>
          <span className='w-1/4 font-semibold'>{t('age')}</span>
          <input
            className='border rounded p-1 w-3/4'
            type='number'
            min={0}
            placeholder={t('no_information_given')}
            onChange={(e) => setAge(e.target.value)}
            value={age}
          />
        </div>
        <div className='flex w-full gap-8 text-right items-center'>
          <span className='w-1/4 font-semibold'>{t('gender')}</span>
          <select
            className='border rounded p-1 w-3/4'
            onChange={(e) => setGender(e.target.value)}
            value={gender}
          >
            <option value='MALE'>{t('gender_male')}</option>
            <option value='FEMALE'>{t('gender_female')}</option>
            <option value='OTHER'>{t('gender_other')}</option>
            <option value='NA'>{t('no_information_given')}</option>
          </select>
        </div>
        <div className='flex w-full gap-8 text-right items-center'>
          <span className='w-1/4 font-semibold'>{t('interests')}</span>
          <div className='w-3/4'>
            <Multiselect
              style={{
                searchBox: { borderColor: '#e5e7eb' },
              }}
              options={possibleInterests}
              placeholder={t('select')}
              avoidHighlightFirstOption={true}
              hidePlaceholder={true}
              displayValue='name'
              selectedValues={interests}
              onSelect={onSelectInterest}
              onRemove={onRemoveInterest}
              selectionLimit={3}
            />
          </div>
        </div>
        <button
          type='submit'
          disabled={loading}
          className='bg-primary-blue font-medium rounded text-white py-2 w-40 mx-auto text-sm'
        >
          {t('save')}
        </button>
      </form>
    </>
  );
};

export default UpdateProfile;
