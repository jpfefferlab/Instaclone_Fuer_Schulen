import { useDispatch, useSelector } from 'react-redux';
import { loadUser } from './actions/userAction';
import { lazy, Suspense, useEffect } from 'react';
import { Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import 'emoji-mart/css/emoji-mart.css';
import Header from './components/Navbar/Header';
import PrivateRoute from './Routes/PrivateRoute';
import Profile from './components/User/Profile';
import SpinLoader from './components/Layouts/SpinLoader';
import './i18n';
import Settings from './components/User/Settings/Settings';
import Analytics from './components/User/Analytics';
import Moderation from './components/Moderation/Moderation';
import WorkbookPage from './components/Workbook/WorkbookPage';
import ShopPage from './components/Rewards/ShopPage';
import Footer from './components/Layouts/Footer';
import { getUserDetails } from './actions/userAction';

const Home = lazy(() => import('./components/Home/Home'));
const SignUp = lazy(() => import('./components/Authentication/SignUp'));
const Login = lazy(() => import('./components/Authentication/Login'));
const ForgotPassword = lazy(
  () => import('./components/Authentication/ForgotPassword')
);
const ResetPassword = lazy(
  () => import('./components/Authentication/ResetPassword')
);
const NotFound = lazy(() => import('./components/Errors/NotFound'));

function App() {
  const dispatch = useDispatch();
  const { pathname } = useLocation();
  const navigate = useNavigate();

  toast.configure({
    theme: 'colored',
    position: toast.POSITION.TOP_RIGHT,
    autoClose: 2500,
    pauseOnFocusLoss: false,
  });


  const { user: profileData, loading } = useSelector((state) => state.userDetails) || {};
  const { user } = useSelector((state) => state.userDetails || {});

  const { is_authenticated, user: loggedInUser } = useSelector((state) => state.user);
  const { user: profileUser, loading: detailsLoading } = useSelector((state) => state.userDetails) || {};
  const { features } = useSelector((state) => state.userFeatures || { features: [] });
  const bgData = profileUser?.profile?.background_image;

  const backgroundUrl = (bgData) ? `data:image/jpeg;base64,${bgData}` : null;

  const backgroundStyle = backgroundUrl ? {
    backgroundImage: `url("${backgroundUrl}")`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundRepeat: 'no-repeat',
    backgroundAttachment: 'fixed',
    minHeight: '100vh',
    width: '100%',
    zIndex: -1
  } : {};

  useEffect(() => {
    if (is_authenticated && loggedInUser?.username && !loading && !profileData?.profile) {
      dispatch(getUserDetails(loggedInUser.username));
    }
  }, [dispatch, is_authenticated, loggedInUser?.username]);

  useEffect(() => {
    if (localStorage.getItem('jwt') && !is_authenticated) {
      dispatch(loadUser());
    }
  }, [dispatch, is_authenticated, pathname]);

  // always scroll to top on route/path change
  useEffect(() => {
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: 'smooth',
    });
  }, [pathname, navigate]);

  // disable right click
  //window.addEventListener("contextmenu", (e) => e.preventDefault());
  window.addEventListener('keydown', (e) => {
    if (e.code === 123) e.preventDefault();
    if (e.ctrlKey && e.shiftKey && e.code === 73) e.preventDefault();
    if (e.ctrlKey && e.shiftKey && e.code === 74) e.preventDefault();
  });

  return (
    <div className='flex flex-col min-h-screen' style={backgroundStyle}>
      {is_authenticated && <Header />}
      <Suspense fallback={<SpinLoader />}>
        <div className='pb-12 bg-transparent'>
          <Routes>
            <Route
              path='/'
              element={
                <PrivateRoute>
                  <Home />
                </PrivateRoute>
              }
            />
            <Route path='/login' element={<Login />} />
            <Route
              path='/register'
              element={
                <PrivateRoute>
                  <SignUp />
                </PrivateRoute>
              }
            />
            <Route
              path='/password/forgot'
              element={
                <PrivateRoute>
                  <ForgotPassword />
                </PrivateRoute>
              }
            />
            <Route
              path='/password/reset/:token'
              element={
                <PrivateRoute>
                  <ResetPassword />
                </PrivateRoute>
              }
            />
            <Route
              path='/analytics'
              element={
                <PrivateRoute>
                  <Analytics />
                </PrivateRoute>
              }
            />
            <Route
              path='/moderation'
              element={
                <PrivateRoute>
                  <Moderation />
                </PrivateRoute>
              }
            />
            <Route
              path='/workbook'
              element={
                <PrivateRoute>
                  <WorkbookPage />
                </PrivateRoute>
              }
            />
            <Route
              path='/:username'
              element={
                <PrivateRoute>
                  <Profile />
                </PrivateRoute>
              }
            />
            <Route
              path='/accounts/edit'
              element={
                <PrivateRoute>
                  <Settings />
                </PrivateRoute>
              }
            />
            <Route
              path='/shop'
              element={
                <PrivateRoute>
                  <ShopPage />
                </PrivateRoute>
              }
            />
            <Route path='*' element={<NotFound />} />
          </Routes>
        </div>
      </Suspense>
      <Footer />
    </div>
  );
}

export default App;
