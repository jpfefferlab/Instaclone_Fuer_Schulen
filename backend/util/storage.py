from django.conf import settings
from storages.backends.s3boto3 import S3Boto3Storage


class PublicEndpointS3Storage(S3Boto3Storage):
    """S3Boto3Storage that rewrites the internal endpoint in generated URLs to a
    browser-reachable one, while keeping boto3 API calls on the internal address.

    boto3 connects to AWS_S3_ENDPOINT_URL and signs URLs using that hostname.
    If AWS_S3_PUBLIC_ENDPOINT_URL differs (e.g. http://localhost:9000 vs
    http://minio:9000), the signed URL is rewritten after signing so the browser
    gets a URL it can fetch without breaking the signature — the signature covers
    the path/query, not the host, so the swap is safe.

    In production leave AWS_S3_PUBLIC_ENDPOINT_URL unset; it defaults to
    AWS_S3_ENDPOINT_URL and this class behaves identically to S3Boto3Storage.
    """

    def url(self, name, parameters=None, expire=None, http_method=None):
        url = super().url(name, parameters=parameters, expire=expire, http_method=http_method)

        internal = getattr(settings, "AWS_S3_ENDPOINT_URL", None)
        public = getattr(settings, "AWS_S3_PUBLIC_ENDPOINT_URL", None)

        if public and internal and public != internal:
            url = url.replace(internal, public, 1)

        return url
