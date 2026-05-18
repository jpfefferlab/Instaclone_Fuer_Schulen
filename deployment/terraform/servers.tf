resource "hcloud_server" "db_node" {
  name        = "instaclone-db-0"
  image       = "debian-13"
  server_type = "cpx32"
  location    = "nbg1"
  public_net {
    ipv4_enabled = true
    ipv6_enabled = true
  }

  ssh_keys = var.hetzner_ssh_key_ids

  depends_on = [hcloud_network_subnet.subnet1]
}

resource "hcloud_server_network" "network_db" {
  server_id = hcloud_server.db_node.id
  subnet_id = hcloud_network_subnet.subnet1.id
  ip        = "172.16.0.2"
}

resource "hcloud_server" "backend_node" {
  count       = var.backend_count
  name        = "instaclone-backend-${count.index}"
  image       = "debian-13"
  server_type = "cpx22"
  location    = "nbg1"
  public_net {
    ipv4_enabled = true
    ipv6_enabled = true
  }

  ssh_keys = var.hetzner_ssh_key_ids

  labels = {
    "service" : "backend"
  }

  depends_on = [hcloud_network_subnet.subnet1]
}

resource "hcloud_server_network" "network_backend" {
  count     = var.backend_count
  server_id = hcloud_server.backend_node[count.index].id
  subnet_id = hcloud_network_subnet.subnet1.id
  ip        = "172.16.0.${count.index + 10}"
}
