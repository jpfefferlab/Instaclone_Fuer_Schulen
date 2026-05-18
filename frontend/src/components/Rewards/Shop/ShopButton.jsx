import React from 'react';
import { useNavigate } from 'react-router-dom';
import ShoppingCartOutlinedIcon from '@mui/icons-material/ShoppingCartOutlined';

const ShopButton = () => {
  const navigate = useNavigate();
  return (
    <button
      type='button'
      className='flex items-center max-w-fit space-x-1 bg-gradient-to-r from-orange-500 to-pink-500 text-white px-1 py-1 rounded'
      onClick={() => navigate('/shop')}
    >
      <ShoppingCartOutlinedIcon />
    </button>
  );
};

export default ShopButton;
