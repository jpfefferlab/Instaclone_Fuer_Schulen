from django.core.management.base import BaseCommand
from django_tenants.utils import tenant_context
from tenants.models import Client
from workbook.models import MultipleChoiceSubmission, Submission, TextAnswerSubmission
from django.db import OperationalError

class Command(BaseCommand):
    help = "Deletes all submission entries without deleting the tables."

    def add_arguments(self, parser):
        # Argument to specify the tenant schema
        parser.add_argument(
            '--schema_name',
            type=str,
            help='The schema name of the tenant (e.g. public).'

        )

    def handle(self, *args, **options):
        # Get schema name from command line argument, default to 'public' if not provided
        tenant_schema = options.get('schema_name', 'public')

        # Retrieve the tenant
        try:
            tenant = Client.objects.get(schema_name=tenant_schema)
        except Client.DoesNotExist:
            self.stdout.write(self.style.ERROR(f"Tenant {tenant_schema} does not exist."))
            return

        try:
            self.clear_workbook_entries(tenant)
        except OperationalError as e:
            self.stdout.write(self.style.ERROR(f"Database error: {e}"))
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"An error occurred: {e}"))
        finally:
            self.stdout.write(self.style.SUCCESS(f"Submission entries have been cleared for tenant: {tenant.schema_name}"))

    # Clears all submission-related models for the specified tenant
    def clear_workbook_entries(self, tenant):
        with tenant_context(tenant):

            # Deleting all submissions
            MultipleChoiceSubmission.objects.all().delete()
            self.stdout.write(self.style.SUCCESS('Deleted all MultipleChoiceSubmission entries.'))

            TextAnswerSubmission.objects.all().delete()
            self.stdout.write(self.style.SUCCESS('Deleted all TextAnswerSubmission entries.'))

            Submission.objects.all().delete()
            self.stdout.write(self.style.SUCCESS('Deleted all Submission entries.'))
