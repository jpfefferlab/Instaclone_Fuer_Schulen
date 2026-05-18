import { ClickAwayListener } from '@mui/material';
import axios from '../../../Routes/axios';
import { useEffect, useState } from 'react';
import SearchUserLink from './SearchUserLink';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import SpinLoader from '../../Layouts/SpinLoader';
import SearchOutlinedIcon from '@mui/icons-material/SearchOutlined';
import empty_profile from '../../../assets/images/empty_profile.png';
import { getImageSource } from '../../../utils/imageUtils';

const regEx = /^#\w+$/g;

const SearchBox = () => {
  const { t } = useTranslation();

  const [users, setUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [searchResult, setSearchResult] = useState(false);
  const [searching, setSearching] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false); //manage mobile expansion

  useEffect(() => {
    const fetchUsers = async (term) => {
      setLoading(true);
      const { data } = await axios.get(`/api/users/?search=${term}`);
      setUsers(data);
      setLoading(false);
    };
    const fetchHashtags = async (hashtag) => {
      const trimmed = hashtag.replace('#', '');
      setLoading(true);
      const { data } = await axios.get(`/api/posts/?search=${trimmed}`);
      setUsers(data);
      setLoading(false);
    };
    if (searchTerm.trim().length > 1) {
      if (searchTerm.match(regEx)) {
        const hashtagh = searchTerm.match(regEx).join('');
        fetchHashtags(hashtagh);
      } else {
        fetchUsers(searchTerm);
      }
    }
    return () => {
      setUsers([]);
    };
  }, [searchTerm]);

  const closeAndResetSearchBox = () => {
    setSearchTerm('');
    setSearchResult(false);
    setSearching(false);
    setIsExpanded(false);
  };

  const handleFocus = () => {
    setSearchResult(true);
    setSearching(true);
  };

  return (
    <ClickAwayListener onClickAway={closeAndResetSearchBox}>
      <div className='relative flex items-center'>
        {/* Search Icon for Small Screens */}
        <div
          className={`flex items-center gap-3 pl-4 py-2 ${
            isExpanded ? 'bg-[#efefef] rounded-lg w-64' : 'w-6 sm:bg-[#efefef] sm:rounded-lg sm:w-64'
          } transition-all`}
        >
          {!searching && (
            <SearchOutlinedIcon
              className='text-gray-400 cursor-pointer'
              fontSize='small'
              onClick={() => setIsExpanded(true)} // Expand on mobile
            />
          )}

          {/* Input Field: Hidden on Small Screens Unless Expanded */}
          <input
            className={`${
              isExpanded
                ? 'bg-transparent text-sm border-none outline-none overflow-hidden'
                : 'max-sm:hidden'
            } sm:bg-transparent sm:text-sm sm:border-none sm:outline-none sm:overflow-hidden`}
            type='search'
            value={searchTerm}
            onFocus={handleFocus}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={t('search')}
          />
        </div>

        {/* Search Results */}
        {searchResult && (
          <>
            <div className='absolute right-1/2 -bottom-5 rotate-45 h-4 w-4 drop-shadow-lg bg-white rounded-sm border-l border-t'></div>

            <div
              className={`${
                loading
                  ? 'justify-center items-center'
                  : users.length < 1 && 'justify-center items-center'
              } absolute overflow-y-auto overflow-x-hidden flex flex-col top-[49px] w-[23rem] -left-11 h-80 bg-white drop-shadow-xl rounded`}
            >
              {loading ? (
                <SpinLoader />
              ) : users.length > 0 ? (
                users.map((user) => {
                  return user.caption ? (
                    <Link
                      key={user.id}
                      to={`/${user.creator.username}`}
                      className='flex items-center hover:bg-gray-50 py-2 px-4 cursor-pointer'
                    >
                      <div className='border-b pb-2 mt-2 flex space-x-3 items-center'>
                        <img
                          className='w-11 h-11 rounded-full object-cover'
                          src={
                            user.creator.profile?.picture
                              ? `data:image/jpeg;base64,${user.creator.profile.picture}`
                              : empty_profile
                          }
                          alt='avatar'
                        />
                        <span className='text-black text-sm font-semibold'>
                          {user.creator.username}{' '}
                          <span className='text-gray-600 text-sm'>
                            {user.caption.match(/#\w+/gi)?.join(' ')}
                          </span>
                        </span>

                        <img
                          className='w-11 h-11 object-cover'
                          src={getImageSource(user.content)}
                          alt='avatar'
                        />
                      </div>
                    </Link>
                  ) : (
                    <SearchUserLink
                      {...user}
                      onClick={closeAndResetSearchBox}
                      key={user.id}
                    />
                  );
                })
              ) : (
                <span className='text-gray-400 text-sm'>{t('no_results')}</span>
              )}
            </div>
          </>
        )}
      </div>
    </ClickAwayListener>
  );
};

export default SearchBox;
