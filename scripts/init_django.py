import subprocess

# Execute 'python3 manage.py migrate_schemas' command
subprocess.run(['python3', 'manage.py', 'migrate_schemas'], check=True)

# Check if the tenant already exists
command_output = subprocess.check_output([
    'python3', 'manage.py', 'shell', '-c',
    'from django_tenants.utils import get_tenant_model; TenantModel = get_tenant_model(); print(TenantModel.objects.filter(schema_name="public").exists())'
])
tenant_exists = command_output.decode().strip() == 'True'

if tenant_exists:
    print("Tenant already exists")
else:
    # Create the tenant and admin user
    subprocess.run([
        'python3', 'manage.py', 'create_tenant',
        '--schema_name=public', '--name="Main tenant"',
        '--domain-domain=dev.instaclone.de', '--domain-is_primary=True'
    ], check=True)

    subprocess.run([
        'python3', 'manage.py', 'tenant_command', 'createadminuser',
        '--schema=public', '--username', 'admin', '--password', 'instaclone_password',
        '--noinput', '--email', 'admin@admin.com'
    ], check=True)
