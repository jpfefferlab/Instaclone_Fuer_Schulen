from botocore.exceptions import BotoCoreError, ClientError
from django.core.files.storage import default_storage
from django.db import models

# Create your models here.
from django.db.models.signals import post_save, pre_delete
from django.dispatch import receiver
from django_tenants.models import DomainMixin, TenantMixin


class Client(TenantMixin):
    name = models.CharField(max_length=150)
    created_on = models.DateTimeField(auto_now_add=True)

    auto_drop_schema = True
    auto_create_schema = True


class Domain(DomainMixin):
    pass


@receiver(post_save, sender=Client)
def init_client(instance, **kwargs):
    if "created" in kwargs:
        tenant = instance
        domain = Domain()
        domain.domain = tenant.schema_name + "dev.instaclone.de"
        domain.tenant = tenant
        domain.is_primary = True
        domain.save()


@receiver(pre_delete, sender=Client)
def delete_tenant_storage(sender, instance, **kwargs):
    schema_prefix = f"{instance.schema_name}/"

    try:
        paginator = default_storage.connection.meta.client.get_paginator(
            "list_objects_v2"
        )

        for page in paginator.paginate(
            Bucket=default_storage.bucket_name,
            Prefix=schema_prefix,
        ):
            objects = page.get("Contents", [])
            if not objects:
                continue

            delete_payload = {
                "Objects": [{"Key": obj["Key"]} for obj in objects],
                "Quiet": True,
            }
            default_storage.connection.meta.client.delete_objects(
                Bucket=default_storage.bucket_name,
                Delete=delete_payload,
            )
    except (AttributeError, BotoCoreError, ClientError) as error:
        raise RuntimeError(
            f"Failed deleting S3 objects for tenant '{instance.schema_name}'"
        ) from error
