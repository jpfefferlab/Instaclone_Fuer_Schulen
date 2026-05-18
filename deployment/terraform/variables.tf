variable "backend_count" {
  sensitive   = false
  default     = 1
  description = "Number of Backend instances to spawn"
}

variable "hetzner_ssh_key_ids" {
  type        = list(string)
  description = "List of SSH key IDs or names already uploaded to Hetzner Cloud"
  default     = []
}

variable "hcloud_token" {
  sensitive = true
}
