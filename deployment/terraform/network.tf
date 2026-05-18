resource "hcloud_network" "network" {
  name     = "network"
  ip_range = "172.16.0.0/16"
}

resource "hcloud_network_subnet" "subnet1" {
  network_id   = hcloud_network.network.id
  type         = "cloud"
  network_zone = "eu-central"
  ip_range     = "172.16.0.0/24"
}
