# <Shawn Start>
resource "aws_security_group" "scampatrol_sg" {
  name        = "scampatrol-sg"
  description = "Security group for ScamPatrol"
  vpc_id      = var.vpc_id

  # SSH is deliberately open, and the reasoning is worth recording rather than assuming.
  #
  # Restricting it by IP was implemented and then reverted. Deployment runs from GitHub
  # Actions, whose runners come from a large pool of addresses that belong to GitHub and
  # never to us, so any narrow allow-list stops our own pipeline from reaching this host.
  # Allowing GitHub's published ranges instead would cover so much of the internet that it
  # restricts almost nothing while looking as though it does.
  #
  # The control we actually rely on is key-based authentication with passwords disabled,
  # which is how the Ubuntu image ships. Narrowing this properly means a bastion host or
  # SSM Session Manager, which is the right answer for a real deployment and more machinery
  # than this project needs.
  ingress {
    description = "SSH (key-only; see note above on why this is not IP restricted)"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # The application is a public website, so this has to be open to everyone.
  ingress {
    description = "HTTP"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # No HTTPS rule. Nothing terminates TLS on this host, so opening 443 would expose a port
  # with nothing behind it: all risk, no benefit. When TLS is added, add the rule back and
  # set COOKIE_SECURE to 1 in the same change, because the auth cookies should only be
  # marked Secure once the connection actually is.

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "scampatrol-sg"
  }
}
# <Shawn End>
