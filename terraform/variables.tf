# <Shawn Start>
variable "aws_region" {
  description = "AWS region"
  default     = "ap-southeast-2"
}

variable "instance_type" {
  description = "EC2 instance type"
  default     = "t3.micro"
}

variable "key_name" {
  description = "EC2 Key Pair name"
  default     = "ScamPatrol"
}

variable "vpc_id" {
  description = "VPC ID"
  default     = "vpc-0fb82660098797f08"
}

variable "subnet_id" {
  description = "Subnet ID"
  default     = "subnet-0c14fd7a10d3979aa"
}
# <Shawn End>
