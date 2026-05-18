import { useSelector } from 'react-redux';
import { Navigate } from 'react-router-dom';

const PrivateRoute = ({ children }) => {
  const { loading, is_authenticated } = useSelector((state) => state.user);

  return (
    <>
      {loading === false &&
        (is_authenticated ? children : <Navigate to='/login' />)}
    </>
  );
};

export default PrivateRoute;
