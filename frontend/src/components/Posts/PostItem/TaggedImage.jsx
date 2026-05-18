import { Link } from 'react-router-dom';
import ChevronRightRoundedIcon from '@mui/icons-material/ChevronRightRounded';
import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { getImageSource } from '../../../utils/imageUtils';

const TaggedImage = ({ content, image_tags, type, usage, url, createLike }) => {

    const { t } = useTranslation();
    const imageRef = useRef(null);

    const [showTags, setShowTags] = useState(false);
    const [imageWidth, setImageWidth] = useState(0);
    const [imageHeight, setImageHeight] = useState(0);
    const [likeEffect, setLikeEffect] = useState(false);

    const toggleTags = () => {
        if (image_tags.length > 0) {
            setShowTags(!showTags);
        }
    };

    const getImageSize = (event) => {
        const width = event.target.clientWidth;
        const height = event.target.clientHeight;

        setImageWidth(width);
        setImageHeight(height);
    };

    useEffect(() => {
        const updateImageSize = () => {
            if (imageRef.current) {
                const { clientWidth, clientHeight } = imageRef.current;
                setImageWidth(clientWidth);
                setImageHeight(clientHeight);
            }
        };
        updateImageSize();
        window.addEventListener('resize', updateImageSize);
        return () => {
            window.removeEventListener('resize', updateImageSize);
        };
    }, []);


    return (
        <div
            className={`relative flex flex-col items-center ${usage === 'profile' && ('bg-black sm:h-[90vh] w-full')}`}>
            <img
                ref={imageRef}
                draggable='false'
                loading='lazy'
                className='w-full h-full object-contain object-center'
                src={getImageSource(content)}
                alt='post image'
                style={{ objectFit: 'contain' }}
                onClick={toggleTags}
                onLoad={getImageSize}
                onDoubleClick={(e) => {
                    e.preventDefault();
                    createLike();
                    setLikeEffect(true);
                    setTimeout(() => {
                        setLikeEffect(false);
                    }, 500);
                }}
            />
            {likeEffect && (<img
                draggable='false'
                height='80px'
                className='likeEffect'
                alt='heart'
                src='https://img.icons8.com/ios-filled/2x/ffffff/like.png'
                style={{
                    position: 'absolute',
                    top: '45%',
                    left: '45%',
                }}
            />)}
            {showTags && (<div className='absolute top-0 left-0'>
                {image_tags.map((tag, index) => {
                    return (<div
                        key={index}
                        style={{
                            position: 'absolute',
                            left: `${tag.x * imageWidth - 10}px`,
                            top: `${(tag.y * imageHeight) + imageRef.current.offsetTop - 10}px`,
                        }}
                        className='text-white bg-black rounded-full px-2 py-1 text-xs'
                    >
                        <Link to={`/${tag.username}`}>
                            {tag.username}
                        </Link>
                    </div>);
                })}
            </div>)}
            {type === 'ADVERTISEMENT' && (<a href={url} target='_blank' rel='noopener noreferrer' className='w-full'>
                <div className='flex justify-between w-full h-auto p-3 px-4 bg-sky-900'>
                    <div className='text-sm font-semibold text-gray-100'>{t('shop_now')}</div>
                    <ChevronRightRoundedIcon style={{ color: '#f3f4f6' }} />
                </div>
            </a>)}
        </div>);
};

export default TaggedImage;
