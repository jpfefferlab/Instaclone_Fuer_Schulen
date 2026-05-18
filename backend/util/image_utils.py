import base64
import glob
import io
from io import BytesIO

from PIL import Image


def get_all_image_paths(image_directory):
    return list(glob.glob(image_directory + "/*.jpg"))


def get_new_size(raw_width, raw_height, max_image_resolution):
    if raw_width > raw_height:
        new_width = max_image_resolution
        new_height = int(raw_height * (new_width / raw_width))
        return new_width, new_height
    else:
        new_height = max_image_resolution
        new_width = int(raw_width * (new_height / raw_height))
        return new_width, new_height


def read_image_as_base64(image_path, max_resolution):
    pil_image = Image.open(image_path)
    new_size = get_new_size(pil_image.width, pil_image.height, max_resolution)
    pil_image.thumbnail(new_size)
    buffer = BytesIO()
    pil_image.save(buffer, format="JPEG")
    return base64.b64encode(buffer.getvalue()).decode("utf-8")


# Compresses Base64 Images without 'data:image/jpeg;base64,' in front of it
def compress_picture(image_data, height, width):
    try:
        image_bytes = base64.b64decode(image_data)
        image = Image.open(io.BytesIO(image_bytes))
        image.thumbnail((width, height))
        img_io = io.BytesIO()
        image.save(img_io, format='JPEG', quality=90)
        compressed_image_data = base64.b64encode(img_io.getvalue()).decode("utf-8")
        return compressed_image_data
    except Exception as e:
        print(f"Error compressing image: {str(e)}")
        return None


def save_image_as_base64(image_file, target_width, target_height):
    """Compress and convert an uploaded image to a base64 String."""
    try:
        # Open and verify the uploaded image
        image = Image.open(image_file)
        image.verify()
        image = Image.open(image_file)

        # Ensuring consistent color format
        image = image.convert("RGB")

        # Resize and compress the image while maintaining aspect ratio
        # https://pillow.readthedocs.io/en/stable/handbook/concepts.html#filters
        image.thumbnail((target_width, target_height), Image.BILINEAR)

        # Save the image to the buffer as JPEG
        image_buffer = BytesIO()
        image.save(image_buffer, format="JPEG", quality=90, optimize=True)
        image_buffer.seek(0)

        # Save the JPEG as Base64
        base64_data = base64.b64encode(image_buffer.read()).decode('utf-8')
        return base64_data
    except Exception as e:
        raise ValueError(f"Error processing the image: {str(e)}")
