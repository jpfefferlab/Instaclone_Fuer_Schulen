import React, { useEffect, useState } from 'react';
import TextField from '@mui/material/TextField';
import Auth from './Auth';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import BackdropLoader from '../Layouts/BackdropLoader';
import { useDispatch, useSelector } from 'react-redux';
import { clearErrors, loginUser } from '../../actions/userAction';
import { useTranslation } from 'react-i18next';
import logo from '../../assets/images/instaclone2.png';

const Login = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();

  const { loading, is_authenticated, error } = useSelector(
    (state) => state.user,
  );

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = (e) => {
    e.preventDefault();
    dispatch(loginUser(email, password));
  };
  useEffect(() => {
    if (error) {
      toast.error(error);
      dispatch(clearErrors());
    }
    if (is_authenticated) {
      navigate(`/`);
    }
  }, [is_authenticated, navigate, error]);

  return (
    <>
      {loading && <BackdropLoader />}
      <Auth>
        <div className='bg-white border flex flex-col gap-2 p-4 pt-10'>
          <img
            draggable='false'
            className='mx-auto h-30 w-36 object-contain'
            src={logo}
            alt=''
          />
          <form
            onSubmit={handleLogin}
            className='flex flex-col justify-center items-center gap-3 m-3 md:m-8'
          >
            <TextField
              label={t('username')}
              type='text'
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              size='small'
              fullWidth
            />
            <TextField
              label={t('password')}
              type='password'
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              size='small'
              fullWidth
            />
            <button
              type='submit'
              className='bg-primary-blue font-medium py-2 rounded text-white w-full'
            >
              {t('login')}
            </button>
            {/*<span className="my-3 text-gray-500">OR</span>
                        <Link to="/password/forgot" className="text-sm font-medium text-blue-800">Forgot password?</Link>*/}
          </form>
        </div>
        {/*
                <div className="bg-white border p-5 text-center">
                    <span>Don't have an account? <Link to="/register" className="text-primary-blue">Sign up</Link></span>
                    </div>*/}
      </Auth>
    </>
  );
};

export default Login;
