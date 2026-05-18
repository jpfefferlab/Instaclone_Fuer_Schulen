import React from 'react';

const Sidebar = ({ tabs, activeTab, handleClick }) => {
  return (<div className='hidden sm:flex flex-col border-r w-1/4'>
    {tabs.map((el, i) => (<button
      key={i}
      onClick={() => handleClick(i)}
      className={`${activeTab === i ? 'border-black text-black border-l-2 font-medium bg-white' : 'hover:border-gray-300 text-gray-600'} py-3 px-6 hover:border-l-2 hover:bg-gray-50 cursor-pointer`}
      style={{
        outline: 'none', border: 'none', borderRadius: '0',
      }}
    >
      {el.title}
    </button>))}
  </div>);
};


export default Sidebar;
