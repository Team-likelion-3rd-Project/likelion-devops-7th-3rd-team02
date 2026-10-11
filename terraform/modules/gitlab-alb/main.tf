locals {
  common_tags = {
    Project     = var.project_name
    Environment = var.environment
    ManagedBy   = "Terraform"
  }

  alb_name = "${var.project_name}-${var.environment}-gitlab-alb"
}

resource "aws_lb" "gitlab" {
  name               = local.alb_name
  internal           = false
  load_balancer_type = "application"
  security_groups    = [var.security_group_id]
  subnets            = var.subnet_ids

  enable_deletion_protection = false

  tags = merge(local.common_tags, {
    Name = local.alb_name
  })
}

resource "aws_lb_target_group" "gitlab_web" {
  name     = "${local.alb_name}-web"
  port     = 80
  protocol = "HTTP"
  vpc_id   = var.vpc_id

  health_check {
    path                = "/users/sign_in"
    healthy_threshold   = 2
    unhealthy_threshold = 10
    timeout             = 5
    interval            = 30
    matcher             = "200-399"
  }

  tags = merge(local.common_tags, {
    Name = "${local.alb_name}-web-tg"
  })
}

resource "aws_lb_target_group" "gitlab_registry" {
  name     = "${local.alb_name}-registry"
  port     = 5050
  protocol = "HTTP"
  vpc_id   = var.vpc_id

  health_check {
    path                = "/v2/"
    healthy_threshold   = 2
    unhealthy_threshold = 10
    timeout             = 5
    interval            = 30
    matcher             = "200,401"
  }

  tags = merge(local.common_tags, {
    Name = "${local.alb_name}-registry-tg"
  })
}

resource "aws_lb_target_group_attachment" "gitlab_web" {
  target_group_arn = aws_lb_target_group.gitlab_web.arn
  target_id        = var.gitlab_instance_id
  port             = 80
}

resource "aws_lb_target_group_attachment" "gitlab_registry" {
  target_group_arn = aws_lb_target_group.gitlab_registry.arn
  target_id        = var.gitlab_instance_id
  port             = 5050
}


resource "aws_lb_listener" "http_redirect" {
  load_balancer_arn = aws_lb.gitlab.arn
  port              = 80
  protocol          = "HTTP"

  default_action {
    type = "redirect"

    redirect {
      port        = "443"
      protocol    = "HTTPS"
      status_code = "HTTP_301"
    }
  }
}

resource "aws_lb_listener" "https_web" {

  load_balancer_arn = aws_lb.gitlab.arn
  port              = 443
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-2016-08"
  certificate_arn   = var.certificate_arn

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.gitlab_web.arn
  }
}

resource "aws_lb_listener" "https_registry" {

  load_balancer_arn = aws_lb.gitlab.arn
  port              = 5050
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-2016-08"
  certificate_arn   = var.certificate_arn

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.gitlab_registry.arn
  }
}

output "alb_dns_name" {
  description = "GitLab ALB DNS name"
  value       = aws_lb.gitlab.dns_name
}

output "alb_zone_id" {
  description = "GitLab ALB Zone ID"
  value       = aws_lb.gitlab.zone_id
}
