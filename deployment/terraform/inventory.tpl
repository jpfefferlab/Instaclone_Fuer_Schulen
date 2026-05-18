[db]
%{ for server in db_servers ~}
${server.name} ansible_host=${server.ip}
%{ endfor ~}

[backend]
%{ for server in backend_servers ~}
${server.name} ansible_host=${server.ip}
%{ endfor ~}

[all:vars]
ansible_user=root
ansible_ssh_private_key_file=~/.ssh/id_rsa
