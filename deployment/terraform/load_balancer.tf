resource "hcloud_load_balancer" "load_balancer" {
  name               = "instaclone-lb"
  load_balancer_type = "lb11"
  location           = "nbg1"
}

resource "hcloud_load_balancer_network" "attachment" {
  load_balancer_id = hcloud_load_balancer.load_balancer.id
  subnet_id        = hcloud_network_subnet.subnet1.id
  ip               = "172.16.0.240"
}

resource "hcloud_load_balancer_service" "name" {
  load_balancer_id = hcloud_load_balancer.load_balancer.id
  protocol         = "http"
  listen_port      = 80
  destination_port = 80

  health_check {
    protocol = "http"
    port     = 80
    interval = 10
    timeout  = 5
    retries  = 2

    http {
      path         = "/" # TODO: Change that to a proper health endpoint
      tls          = false
      status_codes = ["200"]
    }
  }
}

resource "hcloud_load_balancer_target" "load_balancer_target" {
  type             = "label_selector"
  load_balancer_id = hcloud_load_balancer.load_balancer.id
  label_selector   = "service=backend"
  use_private_ip   = true

  depends_on = [hcloud_load_balancer_network.attachment]
}
