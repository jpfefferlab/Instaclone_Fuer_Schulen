import imageCompression from 'browser-image-compression';

const imageCompressionOptions = {
  maxSizeMB: 1,
  maxWidthOrHeight: 1080,
  useWebWorker: true,
};

const avatarCompressionOptions = {
  maxWidthOrHeight: 200,
  useWebWorker: true,
};

export const compressImage = async (image) => {
  return await imageCompression(image, imageCompressionOptions);
};

export const compressAvatar = async (avatar) => {
  return await imageCompression(avatar, avatarCompressionOptions);
};

export const prependBase64 = (image) => {
  return `data:image/jpeg;base64,${image}`;
};

export const getImageSource = (image) => {
  if (!image) {
    return '';
  }

  if (
    image.startsWith('data:') ||
    image.startsWith('http://') ||
    image.startsWith('https://') ||
    image.startsWith('/')
  ) {
    return image;
  }

  return prependBase64(image);
};

export const toBase64 = (file) => {
  return new Promise((res) => {
    const reader = new FileReader();
    const { type, name, prev } = file;
    reader.addEventListener('load', () => {
      res({
        name,
        type,
        prev,
        base64: reader.result.split(';base64,')[1],
      });
    });
    reader.readAsDataURL(file);
  });
};
