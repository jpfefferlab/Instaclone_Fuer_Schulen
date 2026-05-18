terraform {
  required_providers {
    hcloud = {
      source  = "hetznercloud/hcloud"
      version = "~> 1.45"
    }
  }
}

provider "hcloud" {
  token = var.hcloud_token
}

## Generate ansible inventory
resource "local_file" "ansible_inventory" {
  filename = "../ansible/inventory.ini"
  content = templatefile("${path.module}/inventory.tpl", {
    db_servers = [
      {
        name = hcloud_server.db_node.name
        ip   = hcloud_server.db_node.ipv4_address
      }
    ],
    backend_servers = [
      for i in range(var.backend_count) : {
        name = hcloud_server.backend_node[i].name
        ip   = hcloud_server.backend_node[i].ipv4_address
      }
    ]
  })

  depends_on = [
    hcloud_server.db_node,
    hcloud_server.backend_node
  ]
}

output "inventory_path" {
  value = local_file.ansible_inventory.filename
}
