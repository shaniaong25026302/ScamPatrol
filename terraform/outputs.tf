output "public_ip" {
  value = aws_instance.scampatrol.public_ip
}

output "public_dns" {
  value = aws_instance.scampatrol.public_dns
}