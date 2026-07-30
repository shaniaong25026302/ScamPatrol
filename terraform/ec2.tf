resource "aws_instance" "scampatrol" {

  ami           = data.aws_ami.ubuntu.id
  instance_type = var.instance_type

  subnet_id = var.subnet_id

  vpc_security_group_ids = [
    aws_security_group.scampatrol_sg.id
  ]

  key_name = var.key_name

  associate_public_ip_address = true

  user_data = file("${path.module}/user_data.sh")

  tags = {
    Name = "ScamPatrol"
  }
}