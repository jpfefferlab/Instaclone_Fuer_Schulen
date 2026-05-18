import { useEffect, useState } from 'react';
import axios from '../../../Routes/axios';
import { ClickAwayListener } from '@mui/material';
import { useTranslation } from 'react-i18next';
import SearchUserItem from './SearchUserItem';
import SpinLoader from '../../Layouts/SpinLoader';
import SearchOutlinedIcon from '@mui/icons-material/SearchOutlined';


const UserSearch = ({ onUserSelect }) => {
  const { t } = useTranslation();
  const [users, setUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [searchResult, setSearchResult] = useState(false);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    const fetchUsers = async (term) => {
      setLoading(true);
      const { data } = await axios.get(`/api/users/?search=${term}`);
      setUsers(data);
      setLoading(false);
    };
    if (searchTerm.trim().length > 1) {
      fetchUsers(searchTerm);
    }
    return () => {
      setUsers([]);
    };
  }, [searchTerm]);

  const handleUserSelect = (user) => {
    onUserSelect(user);
    closeAndResetSearchBox();
  };

  const closeAndResetSearchBox = () => {
    setSearchTerm('');
    setSearchResult(false);
    setSearching(false);
  };

  const handleFocus = () => {
    setSearchResult(true);
    setSearching(true);
  };

  return (<ClickAwayListener onClickAway={closeAndResetSearchBox}>
    <div className='flex justify-center items-center gap-3 pl-4 w-5/6 py-2 bg-[#efefef] rounded-lg relative'>
      {!searching && <SearchOutlinedIcon className='text-gray-400' fontSize='small' />}
      <input
        className='bg-transparent text-sm border-none outline-none flex-grow'
        type='search'
        value={searchTerm}
        onFocus={handleFocus}
        onChange={(e) => setSearchTerm(e.target.value)}
        placeholder={t('search')}
      />
      {searchResult && (<>
        <div
          className={`${loading ? 'justify-center items-center' : users.length < 1 && 'justify-center items-center'} absolute overflow-y-auto overflow-x-hidden flex flex-col top-[49px] h-80 bg-white drop-shadow-xl rounded right-5 left-2`}
        >
          {loading ? (<SpinLoader />) : users.length > 0 ? (users.map((user) => {
            return (<SearchUserItem
              {...user}
              onClick={() => handleUserSelect(user)}
              key={user.id}
            />);
          })) : (<span className='text-gray-400 text-sm'>{t('no_results')}</span>)}
        </div>
      </>)}
    </div>
  </ClickAwayListener>);
};

export default UserSearch;
