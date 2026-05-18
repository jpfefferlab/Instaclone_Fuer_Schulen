import Sidebar from './Sidebar/Sidebar';
import MetaData from '../Layouts/MetaData';
import StoriesContainer from './StoriesContainer';
import PostContainer from '../Posts/PostContainer';

const Home = () => {
  return (<>
    <MetaData title='Instaclone' />

    <div className='flex flex-col items-center h-full w-full md:w-4/5 lg:w-2/3'>
      <div className='flex flex-col justify-center w-full lg:w-2/3 sm:mt-6 sm:px-8 mb-8 '>
        <StoriesContainer />
        <PostContainer usage='feed' />
      </div>
      <Sidebar className='ml-20' />
    </div>

  </>);
};

export default Home;
