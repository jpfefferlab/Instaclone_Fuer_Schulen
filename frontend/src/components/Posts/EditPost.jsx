import { Dialog } from '@mui/material';
import { Picker } from 'emoji-mart';
import { BrowserView } from 'react-device-detect';
import React, { useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import { editPost } from '../../actions/postAction';
import { EDIT_POST_RESET } from '../../constants/postConstants';
import { emojiIcon } from '../Home/SvgIcons';
import { useTranslation } from 'react-i18next';
import UserSearch from '../Navbar/UserSearch/UserSearch';
import SearchUserItem from '../Navbar/UserSearch/SearchUserItem';
import empty_profile from '../../assets/images/empty_profile.png';
import { getImageSource } from '../../utils/imageUtils';

const EditPost = ({ Post, editPostModal, setEditPostModal }) => {
    const { t } = useTranslation();

    const dispatch = useDispatch();

    const { loading } = useSelector((state) => state.editPost);
    const { user } = useSelector((state) => state.user);
    const postImage = Post.content;
    const [caption, setCaption] = useState(Post.caption);
    const [showEmojis, setShowEmojis] = useState(false);
    const [tagPage, setTagPage] = useState(false);
    const [imageTags, setImageTags] = useState(Post.image_tags);
    const [nextTag, setNextTag] = useState(null);
    const [actualImageWidth, setActualImageWidth] = useState(0);
    const imageRef = useRef(null);
    const [userSelected, setUserSelected] = useState(false);
    const [imageLoaded, setImageLoaded] = useState(false);

    const handleNewEmoji = (event) => {
        setCaption(caption + event.native);
        setShowEmojis(false);
    };

    const handleImageClick = (e) => {
        if (nextTag === null) {
            return;
        }
        const imgRect = imageRef.current.getBoundingClientRect();
        // Tags should be a max of 100px wide
        const tagHeight = 24;
        const tagWidth = 50;

        let offsetX = e.clientX - imgRect.left;
        let offsetY = e.clientY - imgRect.top;

        // Ensure tag is within bounds
        offsetX = Math.min(offsetX, imgRect.width - tagWidth);
        offsetY = Math.min(offsetY, imgRect.height - tagHeight);
        // Convert Tag to [0,1]
        const relativeX = (offsetX / imgRect.width);
        const relativeY = (offsetY / imgRect.height);

        if (relativeX >= 0 && relativeX <= 1 && relativeY >= 0 && relativeY <= 1) {
            console.log(nextTag);
            const updatedTags = imageTags.filter(tag => tag.username !== nextTag.username);
            updatedTags.push({ username: nextTag.username, user_id: nextTag.id, x: relativeX, y: relativeY });
            setImageTags(updatedTags);
            setNextTag(null);
            setUserSelected(false);
        }
    };


    const onCloseModal = () => {
        setEditPostModal(false);
        setTagPage(false);
        setNextTag(null);
        setUserSelected(false);
        setImageLoaded(false);
        dispatch({ type: EDIT_POST_RESET });
    };

    const editPostSubmitHandler = (e) => {
        e.preventDefault();
        if (!caption.trim()) {
            toast.error(t('empty_caption_error'));
            return;
        }

        if (caption === Post.caption && imageTags === Post.image_tags) {
            toast.info(t('edit_post_no_change'));
            onCloseModal();
            return;
        }

        const formData = new FormData();
        formData.set('caption', caption);
        formData.set('tags', JSON.stringify(imageTags));
        setCaption(caption);
        setImageTags(imageTags);
        dispatch(editPost(Post.id, formData));
        onCloseModal();
    };
    const nextPageHandler = (e) => {
        e.preventDefault();
        if (!caption.trim()) {
            toast.error(t('empty_caption_error'));
            return;
        }
        setTagPage(true);
    };

    const handleUserSelected = (selectedUser) => {
        setNextTag(selectedUser);
        setUserSelected(true);
    };

    useEffect(() => {
        setImageTags(Post.image_tags);
        setCaption(Post.caption);
    }, [Post]);


    return (<Dialog open={editPostModal} onClose={() => onCloseModal()} maxWidth='xl'>
        {!tagPage && <div className='flex flex-col sm:w-screen max-w-4xl'>
            <div className='bg-white py-3 border-b px-4 flex justify-between w-full'>
                <span className='font-medium'>{t('new_post_title')}</span>
                <button
                    onClick={nextPageHandler}
                    className='text-blue-500 font-medium'
                >
                    {t('next')}
                </button>
            </div>
            <div className='flex sm:flex-row sm:items-start items-center flex-col w-full'>
                <div className='bg-black h-48 sm:h-[80vh] w-full'>
                    <img
                        draggable='false'
                        className='object-contain h-full w-full'
                        src={getImageSource(postImage)}
                        alt='post'
                    />
                </div>

                <div className='flex flex-col border-l sm:h-[80vh] w-full bg-white'>
                    <div className='flex gap-3 px-3 py-2 items-center'>
                        <img
                            draggable='false'
                            className='w-11 h-11 rounded-full object-cover'
                            src={user.profile?.picture ? `data:image/jpeg;base64,${user.profile.picture}` : empty_profile}
                            alt='avatar'
                        />
                        <span className='text-black text-sm font-semibold'>
                {user.username}
              </span>
                    </div>

                    <div className='p-3 w-full border-b relative'>
              <textarea
                  className='outline-none resize-none h-32 sm:h-auto'
                  placeholder={t('caption_holder')}
                  name='caption'
                  cols='40'
                  rows='12'
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

                                {showEmojis && (<div className='absolute bottom-[-24rem] left-10'>
                                    <Picker
                                        set='google'
                                        onSelect={handleNewEmoji}
                                        title='Emojis'
                                    />
                                </div>)}
                            </BrowserView>
                        </div>
                    </div>
                </div>
            </div>
        </div>}

        {tagPage && <div className='flex flex-col sm:w-screen max-w-4xl'>
            <div className='bg-white py-3 border-b px-4 flex justify-between w-full'>
                <span className='font-medium'>{t('tag_users')}</span>
                <button
                    onClick={editPostSubmitHandler}
                    disabled={loading}
                    className='text-blue-500 font-medium'
                >
                    {t('share')}
                </button>
            </div>
            <div className='flex sm:flex-row sm:items-start items-center flex-col w-full'>
                <div className='flex items-center justify-center relative w-full h-[80vh]'
                     style={{ backgroundColor: 'black' }}>
                    <img
                        ref={imageRef}
                        draggable='false'
                        src={getImageSource(postImage)}
                        alt='post'
                        onLoad={(e) => {
                            setImageLoaded(true);
                            const imageObj = e.target;
                            setActualImageWidth(imageObj.width);
                        }}
                        onClick={handleImageClick}
                        style={{
                            objectFit: 'contain', position: 'absolute',
                        }}
                    />
                    {imageLoaded && imageTags.map((tag, index) => {
                        const imgRect = imageRef.current.getBoundingClientRect();
                        return (<div
                            className='rounded-full bg-black text-white px-2 py-1 relative inline-flex text-xs'
                            key={index}
                            style={{
                                position: 'absolute',
                                left: `${(tag.x * imgRect.width) - 10}px`,
                                top: `${(tag.y * imgRect.height) + imageRef.current.offsetTop - 10}px`,
                                maxWidth: `${actualImageWidth - tag.x * actualImageWidth}px`,
                            }}>
                                        <span style={{
                                            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                                        }}>
                                            {tag.username}
                                        </span>
                            <span className='text-white text-xs'>
                                            <button className='ml-2' onClick={() => {
                                                let updatedTags = imageTags.filter((_, runningIndex) => runningIndex !== index);
                                                setImageTags(updatedTags);
                                            }}>
                                                X
                                            </button>
                                        </span>
                        </div>);
                    })}
                </div>
                <div className='flex flex-col pt-1 pl-5 pb-2 border-l sm:h-[80vh] w-full bg-white'>
                    <UserSearch onUserSelect={handleUserSelected} />
                    {userSelected ? <><SearchUserItem className{...nextTag} /><span
                            className='pl-3'> {t('tag_explainer')}</span> </> :
                        <span className='pt-3 pl-2'>{t('tag_helper')}</span>}

                </div>
            </div>
        </div>}
    </Dialog>);
};

export default EditPost;
